import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createContactStore} from './contact-store.mjs';
import {createSendStore} from './send-store.mjs';
import {createServer} from './server.mjs';
import {projects} from './dist/data.js';
import {partnerRecords,partnerContacts,partnerProjects,partnerRegistry} from './dist/partner-data.js';

test('partner data is shared with the API and cannot collide with project IDs',()=>{
 assert.equal(partnerProjects.length,partnerRecords.length);
 assert.deepEqual(partnerRegistry.ids,partnerRecords.map(p=>p.id));
 assert.equal(new Set(partnerRegistry.ids).size,partnerRegistry.count);
 const projectIds=new Set(projects.map(p=>p.id));
 assert.deepEqual(partnerRegistry.ids.filter(id=>projectIds.has(id)),[]);
 for(const p of partnerProjects)assert.equal(p.contacts.length,(partnerContacts[p.id]||[]).length);
 const all=partnerProjects.flatMap(p=>p.contacts);
 assert.ok(all.filter(c=>c.email).every(c=>c.association==='shared'),'published company routes are shared mailboxes, not personal inboxes');
});

test('partner contact store seeds from partner data and stays separate from projects',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wind-partner-store-'));const file=path.join(dir,'partner-contacts.json');
 const store=await createContactStore(file,{items:partnerProjects,registry:partnerRegistry});
 const seeded=store.contacts('green-genius');
 assert.equal(seeded.length,2);assert.deepEqual(seeded.map(c=>c.emails[0]),['poland.bd@greengenius.com','development@greengenius.com']);
 assert.ok(seeded.every(c=>c.association==='shared'));
 assert.equal(store.snapshot().registry.key,partnerRegistry.key);
 assert.deepEqual(Object.keys(store.snapshot().contacts),partnerRegistry.ids);
 assert.throws(()=>store.contacts('firlough'),/Unknown project/);
 const personal=await store.save('green-genius',{name:'Ruslan Test',emails:['ruslan@example.com'],phones:[],association:'personal'});
 const reloaded=await createContactStore(file,{items:partnerProjects,registry:partnerRegistry});
 assert.ok(reloaded.contacts('green-genius').some(c=>c.id===personal.id));
 const projectStore=await createContactStore(path.join(dir,'contacts.json'));
 assert.throws(()=>projectStore.contacts('green-genius'),/Unknown project/);
});

async function withServer(fn){
 const dir=await mkdtemp(path.join(tmpdir(),'wind-partner-api-'));
 const projectStore=await createContactStore(path.join(dir,'contacts.json'));
 const partnerStore=await createContactStore(path.join(dir,'partner-contacts.json'),{items:partnerProjects,registry:partnerRegistry});
 const person=await partnerStore.save('green-genius',{name:'Ruslan Test',title:'CEO',emails:['ruslan@example.com'],phones:[],association:'personal'});
 const projectSendFile=path.join(dir,'sends.json'),partnerSendFile=path.join(dir,'partner-sends.json');
 const calls=[];const pulse={enabled:true,send:async payload=>{calls.push(payload);return {status:'sent',httpStatus:200,error:'',emailMessageId:'m1'};}};
 const server=createServer({storePromise:Promise.resolve(projectStore),providerPromise:Promise.resolve({enabled:false}),enrichmentPromise:Promise.resolve({}),pulsePromise:Promise.resolve(pulse),sendStorePromise:createSendStore(projectSendFile),partnerStorePromise:Promise.resolve(partnerStore),partnerSendStorePromise:createSendStore(partnerSendFile)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;const api=origin+'/wind-projects/api';
 try{const {token}=await(await fetch(api+'/partners/contacts')).json();
  const post=(route,body,t=token)=>fetch(api+route,{method:'POST',headers:{'Content-Type':'application/json','X-Wind-Token':t},body:JSON.stringify(body)});
  await fn({api,origin,post,calls,person,projectSendFile,partnerSendFile});}
 finally{await new Promise(r=>server.close(r));}
}

test('partner API routes mirror the project routes and never mix the two libraries',async()=>{
 await withServer(async({api,origin,post,calls,person,projectSendFile,partnerSendFile})=>{
  const partners=await(await fetch(api+'/partners/contacts')).json();
  assert.equal(partners.registry.key,partnerRegistry.key);assert.deepEqual(Object.keys(partners.contacts),partnerRegistry.ids);assert.equal(partners.pulseEnabled,true);
  const projectSide=await(await fetch(api+'/contacts')).json();
  assert.equal(Object.keys(projectSide.contacts).length,projects.length);assert.ok(!('green-genius' in projectSide.contacts));
  const health=await(await fetch(api+'/partners/health')).json();assert.equal(health.ok,true);assert.equal(health.registry.key,partnerRegistry.key);
  assert.equal((await fetch(origin+'/wind-projects/partner-data.js')).status,200);

  const recipients=[{contactId:person.id,email:'ruslan@example.com'}];
  const body={projectId:'green-genius',mode:'separate',subject:'Wind enquiry',body:'Dear Team,\n\nHello.\n\nKind regards,',recipients};
  assert.equal((await post('/partners/send',body,'wrong')).status,403);assert.equal(calls.length,0);
  const out=await(await post('/partners/send',body)).json();
  assert.deepEqual(out.summary,{sent:1,blocked:0,failed:0});assert.deepEqual(out.workflowUpdate,{emailStatus:'sent',workflow:'Contacted'});
  assert.equal(calls.length,1);assert.equal(calls[0].to,'ruslan@example.com');assert.match(calls[0].body_text,/^Dear Ruslan,/);

  const history=(await(await fetch(api+'/partners/sends?projectId=green-genius')).json()).sends;
  assert.equal(history.length,1);assert.equal(history[0].subject,'Wind enquiry');
  assert.equal(JSON.parse(await readFile(partnerSendFile,'utf8')).sends.length,1);
  await assert.rejects(access(projectSendFile),'project send history is untouched');
  assert.equal((await fetch(api+'/sends?projectId=green-genius')).status,400);

  const crossProject=await post('/send',body);assert.equal(crossProject.status,400);assert.match((await crossProject.json()).error,/Unknown project/);
  const crossPartner=await post('/partners/send',{...body,projectId:'firlough'});assert.equal(crossPartner.status,400);
  assert.equal(calls.length,1);
 });
});
