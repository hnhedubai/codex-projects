import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {installInvestorOutreach} from '../outreach.js';
import {SendRequest} from '../../../platform-shell/server/pulse/send-request.mjs';
import {SendModule} from '../../../platform-shell/server/pulse/send-modules.mjs';
import {PulseSendService} from '../../../platform-shell/server/pulse/send-service.mjs';
function ui(){
 class App{renderOutreachPanel(){return '';}handleDetailAction(value){this.action=value;}}
 class Navigation{restore(){}captureField(){}}
 installInvestorOutreach({OpportunityPlatformApp:App,PlatformNavigation:Navigation});
 const app=new App(),editor={value:'Subject: Solar\n\nDear Team,\n\n110 kV connection. CAPEX EUR 100 million.'},copy={},status={},button={setAttribute(key,value){this[key]=value;}},controls={querySelector:()=>button};
 Object.assign(app,{path:'/investors-jv',detailTab:'outreach',detailRecordId:'test',root:{querySelector:key=>({'#outreach-draft':editor,'[data-anonymity-status]':status,'[data-draft-safety-controls]':controls,'[data-detail-action="copy-outreach-draft"]':copy})[key]},pulse:{refreshReadiness(){}}});
 const nav=new Navigation();nav.app=app;
 return {app,editor,copy,status,button,nav};
}
test('explicit button enables only this unsafe draft and editing revokes consent',()=>{
 const v=ui();v.app.refreshOutreachSafety();assert.equal(v.copy.disabled,true);
 v.app.handleDetailAction('toggle-draft-safety-bypass');
 assert.equal(v.app.outreachSafety().overridden,true);assert.equal(v.copy.disabled,false);
 assert.match(v.status.textContent,/Reoon, recipient and checklist/);assert.equal(v.button['aria-pressed'],'true');
 v.editor.value+=' Edited';v.nav.captureField({id:'outreach-draft'});
 assert.equal(v.app.outreachSafety().safe,false);assert.equal(v.copy.disabled,true);
});
test('toggle re-enables safety and switching record revokes consent',()=>{
 const v=ui();v.app.handleDetailAction('toggle-draft-safety-bypass');v.app.handleDetailAction('toggle-draft-safety-bypass');assert.equal(v.app.outreachSafety().safe,false);
 v.app.handleDetailAction('toggle-draft-safety-bypass');v.app.detailRecordId='other';assert.equal(v.app.outreachSafety().safe,false);
 v.app.detailRecordId='test';assert.equal(v.app.outreachSafety().safe,false);
 v.app.path='/wind-projects';assert.deepEqual(v.app.outreachSafety(),{safe:true});
});
const input={recordId:'test',recordName:'Example company',mode:'separate',subject:'Solar opportunity',body:'Dear Team,\n\n110 kV grid connection; CAPEX EUR 100 million.',recipients:[{email:'person@example.test',name:'Alex',origin:'added'}]};
async function service({blocked=false}={}){
 const directory=await mkdtemp(path.join(tmpdir(),'8181-draft-bypass-'));
 const module=await new SendModule({route:'/investors-jv',key:'investors-jv',label:'Investors & JV'}).openHistory(directory);
 const calls=[];let verified=0;
 const sender=new PulseSendService({client:{enabled:true,async send(payload){calls.push(payload);return {status:'sent',httpStatus:200};}},verifyRecipients:async request=>{verified++;return request.recipients.map(p=>({email:p.email,allowed:!blocked,error:blocked?'Invalid mailbox':''}));}});
 return {module,sender,calls,verified:()=>verified};
}
test('server requires explicit bypass in both modes and records consent before mocked sending',async()=>{
 for(const mode of ['separate','together']){
  const v=await service();const request={...input,mode,recipients:[{...input.recipients[0],field:'to'}]};
  await assert.rejects(v.sender.send(v.module,request),/Identifying or restricted/);assert.equal(v.calls.length,0);
  const result=await v.sender.send(v.module,{...request,draftSafetyOverride:true});
  assert.equal(result.summary.sent,1);assert.equal(v.verified(),1);
  const entry=v.module.history.entries()[0];assert.equal(entry.draftSafetyOverride.confirmed,true);assert.equal(entry.draftSafetyOverride.scope,'draft-disclosure-only');
  assert.ok(entry.draftSafetyOverride.at);
  assert.equal(v.module.history.snapshot().projects.test.history[0].draftSafetyOverride.confirmed,true);
  assert.equal(v.calls[0].draftSafetyOverride,undefined,'local consent is not sent as an unsupported Pulse field');
 }
});
test('bypass cannot unlock invalid recipients, unchecked module checklists or malformed requests',async()=>{
 const v=await service({blocked:true});const result=await v.sender.send(v.module,{...input,draftSafetyOverride:true});
 assert.equal(result.summary.blocked,1);assert.equal(v.calls.length,0);
 const diesel=new SendModule({route:'/diesel-en590',key:'diesel-en590',label:'EN590',requiredChecks:[{id:'confirmed',label:'Required check'}]});
 assert.throws(()=>SendRequest.parse({...input,draftSafetyOverride:true},diesel),/only for Investors/);
 assert.throws(()=>SendRequest.parse(input,diesel),/checklist/);
 assert.throws(()=>SendRequest.parse({...input,draftSafetyOverride:'true'},v.module),/explicit confirmation/);
 assert.throws(()=>SendRequest.parse({...input,body:'Dear [Name],',draftSafetyOverride:true},v.module),/placeholder/);
});

