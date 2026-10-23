import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {SendRequest} from '../../../platform-shell/server/pulse/send-request.mjs';
import {SendHistoryStore} from '../../../platform-shell/server/pulse/send-history-store.mjs';
import {PulseSendService} from '../../../platform-shell/server/pulse/send-service.mjs';
import {listedProjects} from '../../listed-projects/data/source.js';
import {buildPickerDraft} from '../project-picker-drafts.js';
import {outreachProject} from '../outreach-export.js';
import {parseDraft} from '../../../platform-shell/shared/js/pulse-format.js';
import {renderOfferHistory,offerTime} from '../offer-history.js';
import http from 'node:http';
import {PulseSendRoutes} from '../../../platform-shell/server/pulse/pulse-routes.mjs';

const module={key:'investors-jv',label:'Investors',assertChecks(){}};
const project=listedProjects[0];
const input=()=>({recordId:'fixture-prospect',recordName:'Fixture prospect',mode:'separate',...parseDraft(buildPickerDraft({},[outreachProject(project)],{variant:'intro'}).draft),recipients:[{name:'Alex Smith',email:'fixture@example.com',origin:'added'}],offer:{projectIds:[project.id]}});

test('server resolves offered projects itself and never puts internal metadata into outgoing payloads',()=>{
 const request=SendRequest.parse({...input(),offer:{projectIds:[project.id],internalName:'FORGED'}},module);
 assert.equal(request.offerProjects[0].internalName,project.name);
 assert.doesNotMatch(JSON.stringify(request.calls()),new RegExp(project.id));
 assert.ok(!JSON.stringify(request.calls()).includes(project.name));
 assert.throws(()=>SendRequest.parse({...input(),offer:{projectIds:['missing-project']}},module),/Unknown/);
 assert.throws(()=>SendRequest.parse({...input(),offer:{projectIds:'bad'}},module),/Invalid/);
 assert.equal(SendRequest.parse({...input(),offer:undefined},module).offerProjects.length,0);
 const same=SendRequest.parse(input(),module).calls()[0].payload.idempotency_key;
 assert.equal(SendRequest.parse(input(),module).calls()[0].payload.idempotency_key,same);
 assert.notEqual(SendRequest.parse({...input(),offer:{projectIds:[listedProjects[1].id]}},module).calls()[0].payload.idempotency_key,same);
});

test('manual offer and follow-up endpoints require a token; only manual records are written and no emails sent',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'8181-offer-routes-'));let server;
 try{
  const history=await SendHistoryStore.open(path.join(directory,'history.json'));const own={...module,history};
  const routes=new PulseSendRoutes({registry:{get:key=>key==='investors-jv'?own:null,all:()=>[]},service:{enabled:false,send(){throw Error('must not send');}}});
  server=http.createServer((req,res)=>routes.handle(req,res,new URL(req.url,'http://localhost')));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/api/pulse/`;
  const {token}=await (await fetch(base+'status')).json();
  const post=(action,body,key=token)=>fetch(base+'investors-jv/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Pulse-Token':key},body:JSON.stringify(body)});
  assert.equal((await post('external-offer',{...input(),sentAt:'2025-01-01T10:11:12Z'},'wrong')).status,403);assert.equal(history.entries().length,0);
  assert.equal((await post('external-offer',{...input(),sentAt:'bad'})).status,422);
  const saved=await (await post('external-offer',{...input(),sentAt:'2025-01-01T10:11:12Z'})).json();assert.ok(saved.id);
  assert.equal((await post('offer-status',{id:saved.id,status:'Interested'})).status,200);
  assert.equal(history.entries()[0].offerEvents.length,1);assert.equal(history.entries()[0].source,'external-manual');
 }finally{if(server)await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});

test('offer snapshots, personalized bodies, precise timestamps and status audit survive restart; failed sends stay failed',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'8181-offers-'));try{
  const file=path.join(directory,'investors.json'),now=()=> '2026-10-23T09:10:11.123Z';
  const history=await SendHistoryStore.open(file,{now});
  const client={enabled:true,async send(){return {status:'sent',httpStatus:200};}};
  const service=new PulseSendService({client,now:()=>Date.parse(now())});
  const result=await service.send({...module,history},input());
  let entry=history.snapshot().projects['fixture-prospect'].history[0];
  assert.equal(entry.at,now());assert.equal(entry.completedAt,now());assert.equal(entry.results[0].attemptedAt,now());
  assert.equal(entry.offerProjects[0].internalName,project.name);assert.match(entry.messages[0].body,/^(?:Hello|Hi) Alex,/);
  await history.updateOfferStatus(result.id,'Interested');await history.updateOfferStatus(result.id,'NDA requested');
  const reopened=await SendHistoryStore.open(file,{now});entry=reopened.snapshot().projects['fixture-prospect'].history[0];
  assert.equal(entry.offerStatus,'NDA requested');assert.equal(entry.offerEvents.length,2);assert.equal(entry.offerEvents[0].at,now());
  entry.offerProjects[0].internalName='mutated';assert.equal(reopened.entries()[0].offerProjects[0].internalName,project.name);
  assert.throws(()=>reopened.updateOfferStatus(result.id,'invented'),/Invalid/);
  const failed=new PulseSendService({client:{enabled:true,async send(){return {status:'failed',error:'unconfirmed'};}}});
  await failed.send({...module,history:reopened},input());
  const view=reopened.snapshot().projects['fixture-prospect'];assert.equal(view.sentCount,1);assert.equal(view.failedCount,1);
  assert.match(renderOfferHistory(view.history),/Outcome uncertain/);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('external emails are labelled self-reported and follow-up changes append dated events',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'8181-external-offer-'));try{
  const store=await SendHistoryStore.open(path.join(directory,'history.json'));
  const saved=await store.recordExternal(SendRequest.parse(input(),module),'2026-10-22T12:34:56.000Z');
  await store.updateOfferStatus(saved.id,'Details disclosed');
  const entry=store.snapshot().projects['fixture-prospect'].history[0];assert.equal(entry.source,'external-manual');assert.equal(entry.at,'2026-10-22T12:34:56.000Z');assert.ok(entry.recordedAt);
  const html=renderOfferHistory([entry]);assert.match(html,/manually reported/);assert.match(html,/Details disclosed/);assert.match(html,/UTC\+04:00/);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('history escapes all text, makes legacy links explicit and shows UTC-offset date/time',()=>{
 const html=renderOfferHistory([{id:'x',at:'2026-10-23T09:10:11.000Z',subject:'<script>bad</script>',recipients:[],results:[]}]);
 assert.match(html,/Projects not linked/);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(offerTime('2026-10-23T09:10:11Z'),/13:10:11/);
});
