import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createReoonService} from './reoon.mjs';
import {atomicJson} from './atomic-json.mjs';
const email='person@example.com',other='other@example.com';
const raw=address=>({email:address,status:'safe',verification_mode:'power',is_deliverable:true,is_safe_to_send:true,is_role_account:false});
const fixture=async options=>createReoonService({root:await mkdtemp(path.join(tmpdir(),'8181-reoon-reliability-')),apiKey:'fixture-secret',allowedEmails:new Set([email,other]),...options});

test('timeout covers a hung response body, does not retry, and releases the queue',async()=>{
 let calls=0;
 const service=await fixture({requestTimeoutMs:15,fetchImpl:async url=>{calls++;return {ok:true,json:()=>calls===1?new Promise(()=>{}):Promise.resolve(raw(url.searchParams.get('email')))};}});
 await assert.rejects(service.verify([email]),/timed out/);
 assert.equal(calls,1);assert.deepEqual(service.results(),{});
 assert.equal((await service.verify([other]))[0].status,'safe');assert.equal(calls,2);
});

test('disk failure retains the paid answer for save-only retry without extra provider call',async()=>{
 let calls=0,saves=0;
 const root=await mkdtemp(path.join(tmpdir(),'8181-reoon-disk-'));
 const service=await fixture({root,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>raw(email)};},persist:async(...args)=>{if(++saves===1)throw Error('Disk busy');await atomicJson(...args);}});
 await assert.rejects(service.verify([email]),/could not be saved/);
 assert.deepEqual(service.results(),{});
 assert.equal((await service.verify([email]))[0].cached,true);
 assert.equal(calls,1);assert.equal(saves,2);
 assert.equal(JSON.parse(await readFile(path.join(root,'platform-shell/data/reoon-results.json'))).history.length,1);
});

test('partial batch success remains saved if a later address fails',async()=>{
 let calls=0;
 const service=await fixture({fetchImpl:async url=>{calls++;return {ok:true,json:async()=>{if(url.searchParams.get('email')===other)throw Error('broken');return raw(email);}};}});
 await assert.rejects(service.verify([email,other]),/unreadable/);
 assert.equal(service.results()[email].status,'safe');assert.equal(service.results()[other],undefined);
 await service.verify([email]);assert.equal(calls,2);
});

test('connection checks share one in-flight request and cache failures briefly',async()=>{
 let calls=0,release;
 const service=await fixture({fetchImpl:()=>{calls++;return new Promise(resolve=>{release=()=>resolve({ok:false,status:503});});}});
 const pending=[service.status(),service.status(),service.status()];
 assert.equal(calls,1);release();
 for(const result of await Promise.all(pending))assert.equal(result.connected,false);
 assert.equal((await service.status()).connected,false);assert.equal(calls,1);
});

test('queue is bounded and validation cannot spend credits',async()=>{
 let release,calls=0;
 const service=await fixture({maxQueue:1,fetchImpl:()=>{calls++;return new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>raw(email)});});}});
 assert.throws(()=>service.verify([{}]),/Valid email/);
 const pending=service.verify([email]);await Promise.resolve();
 assert.throws(()=>service.verify([other]),error=>error.status===429);
 release();await pending;assert.equal(calls,1);
});

test('old answers require explicit refresh; concurrent refreshes pay only once',async()=>{
 let calls=0,date='2026-01-01T00:00:00Z';
 const service=await fixture({now:()=>date,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>raw(email)};}});
 await service.verify([email]);date='2026-03-01T00:00:00Z';
 await service.verify([email]);assert.equal(calls,1);
 await Promise.all([service.verify([email],{refresh:true}),service.verify([email],{refresh:true})]);
 assert.equal(calls,2);assert.equal(service.results()[email].checkedAt,date);
});

test('corrupt cache disables verification without taking down the application or overwriting evidence',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'8181-reoon-corrupt-'));
 const file=path.join(root,'platform-shell/data/reoon-results.json');await mkdir(path.dirname(file),{recursive:true});await writeFile(file,'{broken');
 let calls=0;const service=await fixture({root,fetchImpl:async()=>{calls++;throw Error('must not call');}});
 assert.equal((await service.status()).connected,false);
 assert.match((await service.status()).error,/store cannot be read/);
 assert.throws(()=>service.verify([email]),error=>error.status===503);
 assert.equal(await readFile(file,'utf8'),'{broken');assert.equal(calls,0);
});

test('UI ignores expired safe results and bounds stalled app responses',async()=>{
 const source=await readFile(new URL('../shared/js/platform-app.js',import.meta.url),'utf8');
 const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL,AbortController,setTimeout,clearTimeout,fetch:async()=>({ok:true,json:()=>new Promise(()=>{})})});
 vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.Email=EmailVerification;',context);
 context.Email.results[email]={...raw(email),provider:'Reoon',mode:'power',deliverable:true,isRoleAccount:false,checkedAt:'2020-01-01T00:00:00Z'};
 assert.equal(context.Email.verifiedEmails([{email}]).length,0);
 assert.match(context.Email.label(email),/not current/);
 await assert.rejects(context.Email.request('/api/reoon/results',{},15),/timed out/);
});
