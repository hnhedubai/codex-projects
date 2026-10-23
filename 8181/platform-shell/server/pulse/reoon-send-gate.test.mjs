import test from 'node:test';
import assert from 'node:assert/strict';
import {createReoonSendGate} from './reoon-send-gate.mjs';
import {PulseSendService} from './send-service.mjs';
import {PulseSendController} from '../../shared/js/pulse-send-panel.js';

const people=[{email:'safe@example.com',name:'Safe',origin:'added'},{email:'bad@example.com',name:'Bad',origin:'published'}];
const good=email=>({email,provider:'Reoon',mode:'power',status:'safe',deliverable:true,checkedAt:new Date().toISOString()});
test('gate checks every recipient using persisted Power results and rejects unsafe, stale, missing and unavailable results',async()=>{
 for(const bad of [{...good(people[1].email),status:'invalid',deliverable:false},{...good(people[1].email),checkedAt:'2020-01-01'},undefined]){
  const seen=[];const gate=createReoonSendGate({verify:async(emails,options)=>{seen.push([emails[0],options.refresh]);return [emails[0]===people[0].email?good(emails[0]):bad];}},{register:async()=>{}});
  const result=await gate({module:'investors-jv',recordId:'x',recipients:people});assert.deepEqual(seen,people.map(person=>[person.email,true]));assert.equal(result[0].allowed,true);assert.equal(result[1].allowed,false);
 }
 const unavailable=createReoonSendGate({verify:async()=>{throw Error('No credits');}},{register:async()=>{}});assert.equal((await unavailable({module:'wind-projects',recordId:'x',recipients:[people[0]]}))[0].allowed,false);
});
test('safe role mailboxes remain labelled shared; browser flags cannot approve an address',async()=>{
 const gate=createReoonSendGate({verify:async()=>[{...good(people[0].email),status:'role_account',isRoleAccount:true}]},{register:async()=>{}});
 const [result]=await gate({module:'e-saf',recordId:'x',recipients:[{...people[0],verified:true}]});assert.equal(result.allowed,true);assert.equal(result.isRoleAccount,true);
});
test('a Reoon catch-all result passes only when Reoon also marks it deliverable and safe to send',async()=>{
 const gate=createReoonSendGate({verify:async()=>[{...good(people[0].email),status:'catch_all'}]},{register:async()=>{}});
 const [allowed]=await gate({module:'investors-jv',recordId:'x',recipients:[people[0]]});assert.equal(allowed.allowed,true);
 const blockedGate=createReoonSendGate({verify:async()=>[{...good(people[0].email),status:'catch_all',deliverable:false}]},{register:async()=>{}});
 const [blocked]=await blockedGate({module:'investors-jv',recordId:'x',recipients:[people[0]]});assert.equal(blocked.allowed,false);
});
test('server preflight runs before provider sends and records blocked results; together mode fails as a group',async()=>{
 for(const mode of ['separate','together']){
  let calls=0,snapshot;const module={key:'wind-projects',label:'Wind',assertChecks(){},history:{async begin(request){snapshot=request;return 'id';},async complete(id,result){return result;}}};
  const service=new PulseSendService({client:{enabled:true,async send(){calls++;return {status:'sent'};}},verifyRecipients:async()=>[{email:people[0].email,allowed:true},{email:people[1].email,allowed:false,status:'invalid',error:'Reoon invalid'}]});
  const result=await service.send(module,{recordId:'x',mode,subject:'Enquiry',body:'Hello team',recipients:people.map(person=>({...person,field:'to'}))});
  assert.equal(snapshot.verification.length,2);assert.equal(calls,mode==='separate'?1:0);assert.equal(result.summary.blocked,mode==='separate'?1:2);
 }
});
test('missing verification records fail closed even if a verifier returns an empty list',async()=>{
 let calls=0;const module={key:'e-saf',label:'e-SAF',assertChecks(){},history:{async begin(){return 'id';},async complete(id,result){return result;}}};
 const service=new PulseSendService({client:{enabled:true,async send(){calls++;}},verifyRecipients:async()=>[]});
 const result=await service.send(module,{recordId:'x',mode:'separate',subject:'Enquiry',body:'Hello',recipients:[people[0]]});assert.equal(calls,0);assert.equal(result.summary.blocked,1);
});
test('recipient icons show verified, invalid, stale, checking and shared mailbox states',()=>{
 const controller=new PulseSendController({path:'/wind-projects',module:{},api:{}}),email=people[0].email;
 assert.match(controller.verificationLabel(email),/not checked/);controller.verification[email]=good(email);assert.match(controller.verificationLabel(email),/✓.*safe/);
 controller.verification[email]={...good(email),status:'invalid',deliverable:false};assert.match(controller.verificationLabel(email),/✕.*invalid/);
 controller.verification[email]={...good(email),checkedAt:'2020-01-01'};assert.match(controller.verificationLabel(email),/stale/);
 controller.verifying.add(email);assert.match(controller.verificationLabel(email),/checking/);controller.verifying.clear();
 controller.verification[email]={...good(email),status:'role_account',isRoleAccount:true};assert.match(controller.verificationLabel(email),/shared mailbox/);
});

test('fresh local disposable requires address-specific consent and reaches Pulse only after confirmation',async()=>{
 const email=people[0].email,calls=[];
 const gate=createReoonSendGate({verify:async()=>[{...good(email),status:'disposable',deliverable:null}]},{register:async()=>{}});
 const module={key:'ammonia',label:'Ammonia',assertChecks(){},history:{async begin(){return 'attempt';},async complete(id,result){return result;}}};
 const service=new PulseSendService({verifyRecipients:gate,client:{enabled:true,async send(payload){calls.push(payload);return {status:'sent',httpStatus:200};}}});
 const input={recordId:'x',mode:'separate',subject:'Enquiry',body:'Hello',recipients:[people[0]]};
 const blocked=await service.send(module,input);assert.equal(calls.length,0);assert.equal(blocked.summary.blocked,1);assert.equal(blocked.verification[0].disposable,true);
 assert.deepEqual(blocked.pulseDisposableVerification,[{address:email,disposable:true,source:'local-reoon'}]);
 const sent=await service.send(module,{...input,disposableOverride:[email]});assert.equal(sent.summary.sent,1);assert.deepEqual(calls[0].allowDisposable,[email]);
 const other=await gate({module:'ammonia',recordId:'x',recipients:[people[0]],disposableOverride:['other@example.com']});assert.equal(other[0].allowed,false);
});

test('disposable consent cannot lift other statuses, stale results or provider/identity mismatches',async()=>{
 const email=people[0].email;
 const bad=[...['invalid','disabled','unknown','spamtrap','inbox_full','unavailable'].map(status=>({...good(email),status,deliverable:false})),
  {...good(email),status:'disposable',checkedAt:'2020-01-01'},
  {...good(email),status:'disposable',checkedAt:new Date(Date.now()+120000).toISOString()},
  {...good(email),status:'disposable',mode:'quick'},
  {...good(email),status:'disposable',provider:'Other'},
  {...good('mismatch@example.com'),status:'disposable'},
  ...['is_disabled','is_spamtrap','has_inbox_full'].map(flag=>({...good(email),status:'disposable',raw:{[flag]:true}}))];
 for(const result of bad){
  let calls=0;const gate=createReoonSendGate({verify:async()=>[result]},{register:async()=>{}});
  const module={key:'ammonia',label:'Ammonia',assertChecks(){},history:{async begin(){return 'attempt';},async complete(id,result){return result;}}};
  const service=new PulseSendService({verifyRecipients:gate,client:{enabled:true,async send(){calls++;return {status:'sent'};}}});
  const response=await service.send(module,{recordId:'x',mode:'separate',subject:'Enquiry',body:'Hello',recipients:[people[0]],disposableOverride:[email]});
  assert.equal(calls,0);assert.equal(response.verification[0].allowed,false);assert.equal(response.verification[0].disposable,false);assert.equal(response.summary.blocked,1);
 }
});
