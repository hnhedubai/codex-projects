import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createContactStore,sanitizeContact} from './contact-store.mjs';
import {interpretResult} from './reoon.mjs';
import {createServer} from './server.mjs';
const input={name:'Test person',title:'Director',role:'Project lead',emails:['test@example.com'],phones:['+44 20 1234 5678'],source:'https://example.com/team',linkedin:'',association:'unconfirmed'};
const raw=email=>({email,status:'safe',verification_mode:'power',is_deliverable:true,is_safe_to_send:true,is_catch_all:false,is_disposable:false,has_inbox_full:false,is_disabled:false,is_spamtrap:false});
test('provider results are fail-closed and mailbox-specific',()=>{
 assert.equal(interpretResult(raw('test@example.com'),'test@example.com').deliverable,true);
 for(const status of ['unknown','catch_all','invalid','disposable','spamtrap'])assert.equal(interpretResult({...raw('test@example.com'),status},'test@example.com').deliverable,false);
 assert.equal(interpretResult({...raw('test@example.com'),is_catch_all:true},'test@example.com').deliverable,false);
 assert.throws(()=>interpretResult({...raw('test@example.com'),verification_mode:'quick'},'test@example.com'));
 assert.throws(()=>interpretResult(raw('other@example.com'),'test@example.com'));
});
test('contact field validation prevents unsupported URLs and malformed emails',()=>{
 assert.deepEqual(sanitizeContact({...input,emails:[' TEST@example.com ','test@example.com'].map(s=>s.trim())}).emails,['test@example.com']);
 assert.throws(()=>sanitizeContact({...input,source:'javascript:alert(1)'}));
 assert.throws(()=>sanitizeContact({...input,emails:['not-an-email']}));
 assert.throws(()=>sanitizeContact({...input,linkedin:'https://evil.example/person'}));
});
test('contact edits persist, retain originals/history, and do not transfer email verification',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wind-contacts-test-'));const file=path.join(dir,'contacts.json');const store=await createContactStore(file);
 const c=await store.save('berwick-b',input);assert.equal(c.phones[0],input.phones[0]);
 await store.recordCheck(interpretResult(raw(input.emails[0]),input.emails[0]));
 const edited=await store.save('berwick-b',{...c,emails:['replacement@example.com']});assert.equal(store.check(edited.emails[0]),null);
 await assert.rejects(store.save('berwick-b',{...c,name:'Stale edit'}),/changed/);
 const reloaded=await createContactStore(file);assert.equal(reloaded.contacts('berwick-b').find(x=>x.id===c.id).emails[0],'replacement@example.com');
 const seed=reloaded.contacts('theodore')[0];await reloaded.save('theodore',{...seed,name:'Edited name'});assert.equal(reloaded.contacts('theodore')[0].original.name,seed.name);
 const saved=JSON.parse(await readFile(file,'utf8'));assert.ok(saved.history.length>=3);
});
test('API blocks cross-origin writes, caches checks and supports explicit recheck',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wind-api-test-'));const store=await createContactStore(path.join(dir,'contacts.json'));let calls=0;
 const provider={enabled:true,verify:async email=>{calls++;return interpretResult(raw(email),email);}};
 const server=createServer({storePromise:Promise.resolve(store),providerPromise:Promise.resolve(provider)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,base=origin+'/wind-projects/api/contacts';
 try{
  const bootstrap=await(await fetch(base)).json();assert.ok(bootstrap.token);assert.equal(bootstrap.reoonEnabled,true);
  assert.equal((await fetch(base+'/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:'berwick-b',contact:input})})).status,403);
  const headers={'Content-Type':'application/json','X-Wind-Token':bootstrap.token};
  assert.equal((await fetch(base+'/save',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:'{}'})).status,403);
  const save=await(await fetch(base+'/save',{method:'POST',headers,body:JSON.stringify({projectId:'berwick-b',contact:input})})).json();assert.ok(save.contact.id);
  const request={projectId:'berwick-b',contactId:save.contact.id,email:input.emails[0]};
  for(let n=0;n<2;n++){const res=await fetch(base+'/verify',{method:'POST',headers,body:JSON.stringify(request)});assert.equal(res.status,200);}
  assert.equal(calls,1);
  await fetch(base+'/verify',{method:'POST',headers,body:JSON.stringify({...request,force:true})});assert.equal(calls,2);
  assert.equal((await fetch(base+'/verify',{method:'POST',headers,body:JSON.stringify({...request,email:'outsider@example.com'})})).status,422);
  assert.equal((await fetch(origin+'/private/contacts.json')).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
