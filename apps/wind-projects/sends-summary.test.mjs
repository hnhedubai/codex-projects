import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createContactStore} from './contact-store.mjs';
import {createSendStore} from './send-store.mjs';
import {createServer} from './server.mjs';
import {partnerProjects,partnerRegistry} from './dist/partner-data.js';

const send=(projectId,at,...statuses)=>({id:`${projectId}-${at}`,at,projectId,mode:'separate',subject:'S',recipients:[],results:statuses.map(([status,emails])=>({emails,status,httpStatus:status==='sent'?200:422,error:'',emailMessageId:null,replay:false})),summary:{}});
const projectSends={schemaVersion:1,sends:[
 send('ghana','2026-10-15T10:00:00.000Z',['sent',['a@example.com']],['blocked',['b@example.com']]),
 send('ghana','2026-10-16T10:00:00.000Z',['sent',['a@example.com','c@example.com']]),
 send('ghana','2026-10-17T10:00:00.000Z',['blocked',['d@example.com']]),
 send('yanco','2026-10-18T10:00:00.000Z',['blocked',['e@example.com']])
]};
const partnerSends={schemaVersion:1,sends:[send('green-genius','2026-10-19T10:00:00.000Z',['sent',['ruslan@example.com']])]};

async function withServer(files,fn){
 const dir=await mkdtemp(path.join(tmpdir(),'wind-sends-summary-'));
 const projectSendFile=path.join(dir,'sends.json'),partnerSendFile=path.join(dir,'partner-sends.json');
 if(files.projects)await writeFile(projectSendFile,JSON.stringify(files.projects));
 if(files.partners)await writeFile(partnerSendFile,JSON.stringify(files.partners));
 const calls=[];const pulse={enabled:true,send:async payload=>{calls.push(payload);return {status:'sent',httpStatus:200,error:''};}};
 const server=createServer({storePromise:createContactStore(path.join(dir,'contacts.json')),providerPromise:Promise.resolve({enabled:false}),enrichmentPromise:Promise.resolve({}),pulsePromise:Promise.resolve(pulse),sendStorePromise:createSendStore(projectSendFile),partnerStorePromise:createContactStore(path.join(dir,'partner-contacts.json'),{items:partnerProjects,registry:partnerRegistry}),partnerSendStorePromise:createSendStore(partnerSendFile)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const api=`http://127.0.0.1:${server.address().port}/wind-projects/api`;
 try{await fn({api,calls,projectSendFile,partnerSendFile});}finally{await new Promise(r=>server.close(r));}
}

test('sends summary counts accepted addresses and the latest successful send per project',async()=>{
 await withServer({projects:projectSends,partners:partnerSends},async({api,calls,projectSendFile})=>{
  const response=await fetch(api+'/sends/summary');
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{ghana:{lastSentAt:'2026-10-16T10:00:00.000Z',sentCount:3},yanco:{lastSentAt:null,sentCount:0}});
  assert.equal(calls.length,0,'reading the summary never calls Pulse');
  assert.deepEqual(JSON.parse(await readFile(projectSendFile,'utf8')),projectSends,'send history file is unchanged');
 });
});

test('partner sends summary reads partner-sends.json only',async()=>{
 await withServer({projects:projectSends,partners:partnerSends},async({api})=>{
  assert.deepEqual(await(await fetch(api+'/partners/sends/summary')).json(),{'green-genius':{lastSentAt:'2026-10-19T10:00:00.000Z',sentCount:1}});
 });
});

test('summary is empty when no send history exists yet and rejects non-GET',async()=>{
 await withServer({},async({api})=>{
  assert.deepEqual(await(await fetch(api+'/sends/summary')).json(),{});
  assert.deepEqual(await(await fetch(api+'/partners/sends/summary')).json(),{});
  assert.equal((await fetch(api+'/sends/summary',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
 });
});

test('summary() on the store matches the route output',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wind-sends-store-'));const file=path.join(dir,'sends.json');
 await writeFile(file,JSON.stringify(projectSends));
 const store=await createSendStore(file);
 assert.deepEqual(store.summary().ghana,{lastSentAt:'2026-10-16T10:00:00.000Z',sentCount:3});
 const recorded=await store.record({projectId:'ghana',mode:'separate',subject:'S',recipients:[],results:[{emails:['z@example.com'],status:'sent'}],summary:{sent:1}});
 assert.deepEqual(store.summary().ghana,{lastSentAt:recorded.at,sentCount:4});
});
