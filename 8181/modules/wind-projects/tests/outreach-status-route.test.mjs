import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,stat,rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {request} from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

// Runs the real 8181 server against fixture files only; the live private/sends.json is never read.
const serverFile=fileURLToPath(new URL('../../../server.mjs',import.meta.url));
const dir=await mkdtemp(path.join(os.tmpdir(),'oplatform-sends-'));
const freePort=()=>new Promise(resolve=>{const probe=createServer().listen(0,'127.0.0.1',()=>{const {port}=probe.address();probe.close(()=>resolve(port));});});
async function start(file){
 const port=await freePort();
 const child=spawn(process.execPath,[serverFile],{env:{...process.env,OPLATFORM_PORT:String(port),WIND_SENDS_FILE:file},stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
 await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{if(String(chunk).includes('Opportunity platform'))resolve();});child.on('exit',code=>reject(Error(`server exited ${code}: ${stderr}`)));});
 return {base:`http://127.0.0.1:${port}`,stop:()=>child.kill(),stderr:()=>stderr};
}
const fixture={schemaVersion:1,sends:[
 {id:'1',at:'2026-10-15T10:00:00.000Z',projectId:'alpha',mode:'separate',subject:'First',recipients:[{contactId:'c1',email:'a@example.com',field:'to'},{contactId:'c2',email:'b@example.com',field:'to'}],results:[{emails:['a@example.com'],status:'sent',httpStatus:200,error:'',emailMessageId:'m1',replay:false},{emails:['b@example.com'],status:'blocked',httpStatus:422,error:'Catch-all',emailMessageId:null,replay:false}],summary:{sent:1,blocked:1,failed:0}},
 {id:'2',at:'2026-10-16T10:00:00.000Z',projectId:'alpha',mode:'together',subject:'Second',recipients:[{contactId:'c1',email:'a@example.com',field:'to'},{contactId:'c3',email:'c@example.com',field:'cc'}],results:[{emails:['a@example.com','c@example.com'],status:'sent',httpStatus:200,error:'',emailMessageId:'m2',replay:false}],summary:{sent:2,blocked:0,failed:0}},
 {id:'3',at:'2026-10-17T10:00:00.000Z',projectId:'beta',mode:'separate',subject:'Blocked',recipients:[{contactId:'c4',email:'d@example.com',field:'to'}],results:[{emails:['d@example.com'],status:'blocked',httpStatus:422,error:'Invalid',emailMessageId:null,replay:false}],summary:{sent:0,blocked:1,failed:0}},
 {id:'4',at:'2026-10-18T10:00:00.000Z',projectId:'beta',mode:'separate',subject:'Failed',recipients:[{contactId:'c4',email:'d@example.com',field:'to'}],results:[{emails:['d@example.com'],status:'failed',httpStatus:502,error:'Pulse down',emailMessageId:null,replay:false}],summary:{sent:0,blocked:0,failed:1}}
]};
test.after(()=>rm(dir,{recursive:true,force:true}));

test('route returns counts and only whitelisted fields from a fixture sends.json',async()=>{
 const file=path.join(dir,'sends.json');await writeFile(file,JSON.stringify(fixture));
 const server=await start(file);
 try{
  const response=await fetch(`${server.base}/api/wind-projects/outreach-status`);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.available,true);assert.ok(Date.parse(body.generatedAt));
  assert.deepEqual(Object.keys(body.projects).sort(),['alpha','beta']);
  const {history,...alpha}=body.projects.alpha;
  assert.deepEqual(alpha,{lastSentAt:'2026-10-16T10:00:00.000Z',sentCount:3,blockedCount:1,failedCount:0});
  assert.deepEqual(history.map(entry=>entry.subject),['Second','First']);
  assert.deepEqual(history[0],{at:'2026-10-16T10:00:00.000Z',mode:'together',subject:'Second',recipients:[{email:'a@example.com',field:'to'},{email:'c@example.com',field:'cc'}],results:[{emails:['a@example.com','c@example.com'],status:'sent',error:''}]});
  const {history:betaHistory,...beta}=body.projects.beta;
  assert.deepEqual(beta,{lastSentAt:null,sentCount:0,blockedCount:1,failedCount:1});
  assert.equal(betaHistory.length,2);
  const raw=JSON.stringify(body);
  for(const hidden of ['httpStatus','contactId','emailMessageId','replay','summary','"id"'])assert.ok(!raw.includes(hidden),hidden);
  assert.equal((await fetch(`${server.base}/api/wind-projects/outreach-status`,{method:'HEAD'})).status,200);
 }finally{server.stop();}
});
test('missing file reports available:false with 200',async()=>{
 const server=await start(path.join(dir,'does-not-exist.json'));
 try{
  const response=await fetch(`${server.base}/api/wind-projects/outreach-status`);
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{available:false,projects:{}});
 }finally{server.stop();}
});
test('corrupt or wrong-schema file reports available:false and is left untouched',async()=>{
 for(const [name,content] of [['corrupt.json','{"schemaVersion":1,"sends":['],['schema2.json',JSON.stringify({schemaVersion:2,sends:[]})]]){
  const file=path.join(dir,name);await writeFile(file,content);const before=await stat(file);
  const server=await start(file);
  try{
   const response=await fetch(`${server.base}/api/wind-projects/outreach-status`);
   assert.equal(response.status,200);
   assert.deepEqual(await response.json(),{available:false,error:'Send history could not be read'});
   await new Promise(resolve=>setTimeout(resolve,50));
   assert.match(server.stderr(),/wind-outreach-status/);
  }finally{server.stop();}
  assert.equal(await readFile(file,'utf8'),content);
  assert.equal((await stat(file)).mtimeMs,before.mtimeMs);
 }
});
test('POST to the route returns 405 and leaves the file alone',async()=>{
 const file=path.join(dir,'sends.json');await writeFile(file,JSON.stringify(fixture));
 const server=await start(file);
 try{
  const response=await fetch(`${server.base}/api/wind-projects/outreach-status`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert.equal(response.status,405);
 }finally{server.stop();}
 assert.equal(await readFile(file,'utf8'),JSON.stringify(fixture));
});

test('11: every sensitive route rejects untrusted Host headers before serving data',async()=>{
 const server=await start(path.join(dir,'missing-host-fixture.json'));
 try{
  const port=new URL(server.base).port;
  for(const pathname of ['/wind-projects','/data/en590-contacts.source.json','/nda-guard/NDA_1__Viktoriia_V2.docx','/api/wind-projects/outreach-status','/api/reoon/status','/api/pulse/status']){
   const status=await new Promise((resolve,reject)=>{const req=request(server.base+pathname,{headers:{Host:`audit.invalid:${port}`}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});
   assert.equal(status,403,pathname);
  }
  assert.equal((await fetch(server.base+'/wind-projects')).status,200);
  assert.equal((await fetch(server.base+'/nda-guard/NDA_1__Viktoriia_V2.docx')).status,200);
 }finally{server.stop();}
});
