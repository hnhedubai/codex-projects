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
