import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {pulseModules} from '../../shared/js/pulse-modules.js';
import {PulseClient} from './pulse-client.mjs';
import {SendRequest,SendError} from './send-request.mjs';
import {SendHistoryStore} from './send-history-store.mjs';
import {SendModule,SendModuleRegistry} from './send-modules.mjs';
import {PulseSendService} from './send-service.mjs';
import {PulseSendRoutes} from './pulse-routes.mjs';

// Every test uses a fake Pulse client. No email is sent and no network call is made.
const dir=await mkdtemp(path.join(os.tmpdir(),'oplatform-pulse-'));
test.after(()=>rm(dir,{recursive:true,force:true}));
let counter=0;const tempDir=()=>path.join(dir,String(++counter));
const wind=new SendModule({route:'/wind-projects',key:'wind-projects',label:'Wind Projects'});
const en590=new SendModule({route:'/diesel-en590',...pulseModules['/diesel-en590']});
const draft={recordId:'alpha',recordName:'Alpha Wind',mode:'separate',subject:'Alpha — Partnership',body:'Dear Project Team,\n\nHello.\n\nKind regards,'};
const people=[{email:'Mubashir@HNH.ae',name:'Mubashir Test',origin:'added'},{email:'second@example.com',name:'Dr. Jane Smith',origin:'published'}];
const fakePulse=(outcomes=[])=>{const calls=[];const queue=[...outcomes];return {calls,enabled:true,async send(payload){calls.push(payload);return queue.shift()||{status:'sent',httpStatus:200,error:'',emailMessageId:`m${calls.length}`};}};};

test('registry builds all eight modules from pulse-modules.js and refuses duplicate keys',async()=>{
 const registry=await SendModuleRegistry.open(tempDir());
 assert.deepEqual(registry.all().map(module=>module.route),['/listed-projects','/wind-projects','/investors-jv','/hydrogen-offtakers','/e-saf','/ammonia','/gases','/diesel-en590']);
 assert.equal(registry.get('other-gases').label,'Other Gases');
 assert.ok(registry.all().every(module=>module.history));
 assert.equal(registry.get('diesel-en590').requiredChecks.length,4);
 assert.throws(()=>registry.add(new SendModule({route:'/x',key:'ammonia',label:'X'})),/Duplicate/);
 const extra=await SendModuleRegistry.open(tempDir(),{...pulseModules,'/methanol':{key:'methanol',label:'Methanol'}});
 assert.ok(extra.get('methanol').history,'a new module only needs one definition entry');
});

test('send request validates the draft and recipients',()=>{
 const ok=SendRequest.parse({...draft,recipients:people},wind);
 assert.deepEqual(ok.recipients.map(item=>item.email),['mubashir@hnh.ae','second@example.com']);
 for(const [patch,message] of [[{subject:''},/subject/],[{body:'Dear [Name],'},/placeholder/],[{recipients:[]},/at least one/],[{recipients:[{email:'not-an-email'}]},/invalid/],[{mode:'blast'},/one by one/],[{recordId:''},/record/],
  [{recipients:Array.from({length:11},(_,i)=>({email:`p${i}@example.com`}))},/up to 10/],[{mode:'together',recipients:[{email:'a@example.com',field:'cc'}]},/To recipient/]])
  assert.throws(()=>SendRequest.parse({...draft,recipients:people,...patch},wind),error=>error instanceof SendError&&message.test(error.message));
});

test('separate mode personalises each email; together mode builds To/CC/BCC; keys are stable',()=>{
 const separate=SendRequest.parse({...draft,recipients:people},wind).calls();
 assert.equal(separate.length,2);
 assert.match(separate[0].payload.body_text,/^Dear Mubashir,/);assert.match(separate[1].payload.body_text,/^Dear Dr\. Smith,/);
 assert.match(separate[0].payload.idempotency_key,/^oplatform:wind-projects:[0-9a-f]{64}$/);
 assert.equal(separate[0].payload.idempotency_key,SendRequest.parse({...draft,recipients:people},wind).calls()[0].payload.idempotency_key);
 const [together]=SendRequest.parse({...draft,mode:'together',recipients:[{email:'a@example.com',field:'to'},{email:'b@example.com',field:'to'},{email:'c@example.com',field:'cc'},{email:'d@example.com',field:'bcc'}]},wind).calls();
 assert.deepEqual([together.payload.to,together.payload.cc,together.payload.bcc],['a@example.com','b@example.com, c@example.com','d@example.com']);
 assert.equal(together.emails.length,4);
});

test('catch-all consent is opt-in, scoped to selected addresses, and changes idempotency',()=>{
 const base=SendRequest.parse({...draft,recipients:[{email:'info@example.com',name:'Info'}]},wind).calls()[0].payload;
 const override=SendRequest.parse({...draft,recipients:[{email:'info@example.com',name:'Info'}],catchAllOverride:['INFO@example.com']},wind).calls()[0].payload;
 assert.equal(base.allowCatchAll,undefined);
 assert.deepEqual(override.allowCatchAll,['info@example.com']);
 assert.notEqual(base.idempotency_key,override.idempotency_key);
 assert.throws(()=>SendRequest.parse({...draft,recipients:[{email:'info@example.com'}],catchAllOverride:['other@example.com']},wind),/only selected recipients/);
});

test('service preserves Pulse catch-all verification and history override without retrying automatically',async()=>{
 const module=await new SendModule({route:'/investors-jv',key:'investors-jv',label:'Investors & JV'}).openHistory(tempDir());
 const calls=[];const client={enabled:true,send:async payload=>{calls.push(payload);return {status:'blocked',httpStatus:422,error:'Can’t send — remove or correct info@example.com',verification:{ok:[],risky:[{address:'info@example.com',catchAll:true}],invalid:[],notes:[]}};}};
 const service=new PulseSendService({client,verifyRecipients:async request=>request.recipients.map(person=>({email:person.email,allowed:true}))});
 const result=await service.send(module,{...draft,recipients:[{email:'info@example.com',name:'Info'}]});
 assert.equal(calls.length,1);assert.equal(calls[0].allowCatchAll,undefined);assert.equal(result.pulseVerification.risky[0].catchAll,true);
 const retry=await service.send(module,{...draft,recipients:[{email:'info@example.com',name:'Info'}],catchAllOverride:['info@example.com']});
 assert.deepEqual(calls[1].allowCatchAll,['info@example.com']);assert.notEqual(calls[0].idempotency_key,calls[1].idempotency_key);
 const history=module.history.entries();assert.deepEqual(history.at(-1).catchAllOverride,['info@example.com']);
 assert.equal(retry.summary.blocked,1);
});

test('EN590 sends require every checklist item',()=>{
 assert.throws(()=>SendRequest.parse({...draft,recipients:people},en590),/checklist/);
 assert.throws(()=>SendRequest.parse({...draft,recipients:people,checks:{entity:true,product:true,authority:true}},en590),/Sanctions/);
 assert.ok(SendRequest.parse({...draft,recipients:people,checks:{entity:true,product:true,authority:true,compliance:true}},en590));
});

test('history records "sending" before Pulse, then results; snapshot hides internals; .bak is kept',async()=>{
 const file=path.join(tempDir(),'wind-projects.json');
 const store=await SendHistoryStore.open(file);
 const request=SendRequest.parse({...draft,recipients:people},wind);
 const id=await store.begin(request);
 assert.equal(JSON.parse(await readFile(file,'utf8')).sends[0].status,'sending');
 assert.equal(store.snapshot().projects.alpha.pendingCount,1);
 await store.complete(id,{results:[{emails:['mubashir@hnh.ae'],status:'sent',httpStatus:200,error:'',emailMessageId:'m1'},{emails:['second@example.com'],status:'blocked',httpStatus:422,error:'Catch-all'}],summary:{sent:1,blocked:1,failed:0}});
 const saved=JSON.parse(await readFile(file,'utf8'));
 assert.equal(saved.schemaVersion,1);assert.equal(saved.sends[0].status,'done');assert.equal(saved.sends[0].body,request.body);assert.equal(saved.sends[0].results[0].emailMessageId,'m1');
 assert.equal(JSON.parse(await readFile(file+'.bak','utf8')).sends[0].status,'sending');
 const {history,...counts}=store.snapshot().projects.alpha;
 assert.deepEqual(counts,{lastSentAt:saved.sends[0].at,sentCount:1,blockedCount:1,failedCount:0,pendingCount:0});
 assert.ok(!JSON.stringify(history).match(/emailMessageId|httpStatus|"body"/));
 assert.equal((await SendHistoryStore.open(file)).entries().length,1,'history survives a restart');
});

test('a corrupt history file is never overwritten and pauses sending for that module only',async()=>{
 const directory=tempDir();await mkdir(directory,{recursive:true});
 const corrupt='{"schemaVersion":1,"sends":[';await writeFile(path.join(directory,'ammonia.json'),corrupt);
 const registry=await SendModuleRegistry.open(directory);
 assert.equal(registry.get('ammonia').history,null);assert.ok(registry.get('e-saf').history);
 const pulse=fakePulse();const service=new PulseSendService({client:pulse});
 await assert.rejects(service.send(registry.get('ammonia'),{...draft,recipients:people}),error=>error.status===503);
 assert.equal(pulse.calls.length,0);
 assert.equal(await readFile(path.join(directory,'ammonia.json'),'utf8'),corrupt);
});

test('service: one send at a time, deadline marks unreached calls, disconnected Pulse sends nothing',async()=>{
 const module=await new SendModule({route:'/e-saf',key:'e-saf',label:'e-SAF'}).openHistory(tempDir());
 const disconnected={enabled:false,calls:[],send(){this.calls.push(1);}};
 await assert.rejects(new PulseSendService({client:disconnected}).send(module,{...draft,recipients:people}),error=>error.status===503);
 assert.equal(disconnected.calls.length,0);
 let release,started;const ready=new Promise(resolve=>{started=resolve;});const slow={enabled:true,send:()=>new Promise(resolve=>{release=()=>resolve({status:'sent',httpStatus:200,error:''});started();})};
 const service=new PulseSendService({client:slow});
 const first=service.send(module,{...draft,recipients:[people[0]]});
 await ready;
 await assert.rejects(service.send(module,{...draft,recipients:[people[1]]}),error=>error.status===409);
 release();assert.equal((await first).summary.sent,1);
 let t=0;const timed={enabled:true,send:async()=>{t+=60000;return {status:'sent',httpStatus:200,error:''};}};
 const out=await new PulseSendService({client:timed,deadlineMs:90000,now:()=>t}).send(module,{...draft,recipients:[...people,{email:'third@example.com',name:'Third'}]});
 assert.deepEqual(out.results.map(item=>item.status),['sent','sent','failed']);assert.match(out.results[2].error,/Not attempted/);
 assert.deepEqual(out.summary,{sent:2,blocked:0,failed:1});
});

test('Pulse client maps responses and never echoes the key',async()=>{
 const KEY='pulse_send_secret_key';
 const reply=(status,body)=>async()=>({ok:status<300,status,json:async()=>body});
 let seen;const ok=new PulseClient({key:KEY,baseUrl:'https://pulse.test',fetchImpl:async(url,init)=>{seen={url,init};return reply(200,{sent:true,emailMessageId:'m1'})();}});
 assert.deepEqual(await ok.send({to:'a@example.com'}),{status:'sent',httpStatus:200,error:'',emailMessageId:'m1',replay:false});
 assert.equal(seen.url,'https://pulse.test/api/pulse/external/send');assert.equal(seen.init.headers.Authorization,`Bearer ${KEY}`);
 const blocked=await new PulseClient({key:KEY,fetchImpl:reply(422,{code:'recipients_blocked',error:'Can’t send',verification:{ok:[],risky:[{address:'info@example.com',catchAll:true}],invalid:[],notes:[]}})}).send({});
 assert.equal(blocked.status,'blocked');assert.equal(blocked.verification.risky[0].catchAll,true);
 for(const client of [new PulseClient({key:KEY,fetchImpl:reply(401,{})}),new PulseClient({key:KEY,fetchImpl:async()=>{throw Error(KEY);}}),new PulseClient({key:KEY,fetchImpl:reply(500,{error:`bad ${KEY}`})})]){
  const result=await client.send({});assert.equal(result.status,'failed');assert.ok(!JSON.stringify(result).includes(KEY));
 }
 assert.equal(new PulseClient({key:''}).enabled,false);
 assert.ok(!JSON.stringify(ok).includes(KEY),'key is not exposed by serialising the client');
});

test('routes: token, local-only, history and 405/404 behaviour',async()=>{
 const pulse=fakePulse([{status:'sent',httpStatus:200,error:''},{status:'blocked',httpStatus:422,error:'Can’t send — remove second@example.com'}]);
 const routes=await PulseSendRoutes.create(dir,{client:pulse,historyDirectory:tempDir(),verifyRecipients:async request=>request.recipients.map(person=>({email:person.email,allowed:true}))});
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(routes.matches(url.pathname))return routes.handle(req,res,url);res.writeHead(404);res.end();});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}/api/pulse`;
 try{
  const status=await(await fetch(base+'/status')).json();
  assert.equal(status.enabled,true);assert.match(status.token,/^[0-9a-f]{64}$/);assert.equal(Object.keys(status.modules).length,8);
  const post=(key,body,token=status.token)=>fetch(`${base}/${key}/send`,{method:'POST',headers:{'Content-Type':'application/json','X-Pulse-Token':token},body:JSON.stringify(body)});
  assert.equal((await post('wind-projects',{...draft,recipients:people},'wrong')).status,403);
  assert.equal((await fetch(base+'/status',{headers:{Origin:'http://evil.example'}})).status,403);
  assert.equal((await post('diesel-en590',{...draft,recipients:people})).status,422);
  assert.equal(pulse.calls.length,0);
  const response=await post('hydrogen-offtakers',{...draft,recipients:people});
  assert.equal(response.status,200);
  const out=await response.json();assert.deepEqual(out.summary,{sent:1,blocked:1,failed:0});assert.ok(!JSON.stringify(out).includes('httpStatus'));
  assert.equal(pulse.calls.length,2);
  const history=await(await fetch(base+'/hydrogen-offtakers/history')).json();
  assert.equal(history.available,true);assert.equal(history.projects.alpha.sentCount,1);assert.equal(history.projects.alpha.history[0].subject,draft.subject);
  assert.deepEqual((await(await fetch(base+'/ammonia/history')).json()).projects,{},'histories are separate per module');
  assert.equal((await fetch(base+'/hydrogen-offtakers/send')).status,405);
  assert.equal((await fetch(base+'/hydrogen-offtakers/history',{method:'POST'})).status,405);
  assert.equal((await fetch(base+'/unknown/history')).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
