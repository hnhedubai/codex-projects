import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import {PulseSendController} from './pulse-send-panel.js';
import {collectPublishedEmails} from '../../server/reoon.mjs';
import {createReoonSendGate} from '../../server/pulse/reoon-send-gate.mjs';
import {PulseSendService} from '../../server/pulse/send-service.mjs';

// Runs the real platform-app.js with a fake Pulse API: nothing is sent.
const source=await readFile(new URL('./platform-app.js',import.meta.url),'utf8');
function setup(path,{own={available:true,generatedAt:'2026-10-22T08:00:00.000Z',projects:{}},desk={available:true,projects:{}},enabled=true}={}){
 const values=new Map();
 const localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};
 const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'},addEventListener(){}},localStorage,URL});
 vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.exports={OpportunityPlatformApp};',context);
 const requests=[];
 const api={status:async()=>({enabled,token:'t'}),history:async key=>{requests.push(`history:${key}`);return own;},deskHistory:async url=>{requests.push(`desk:${url}`);return desk;},send:async(key,input)=>{requests.push({key,input});return {summary:{sent:1,blocked:0,failed:0},results:[]};}};
 const pulse=PulseSendController.forPath(path,api);
 const app=Object.create(context.exports.OpportunityPlatformApp.prototype);
 const refreshed=[];
 Object.assign(app,{path,detailRecordId:'alpha',detailWorkflowKey:`oplatform:${path}:detail-workflow`,rows:[],root:{addEventListener(){},querySelector:()=>null},pulse,sidebar:{refreshOutreachSignals:()=>refreshed.push(1)}});
 pulse.attach(app);
 return {app,pulse,requests,localStorage,refreshed};
}
const sent=(subject)=>({lastSentAt:'2026-10-20T10:00:00.000Z',sentCount:1,blockedCount:0,failedCount:0,pendingCount:0,history:[{at:'2026-10-20T10:00:00.000Z',status:'done',mode:'separate',subject,recipients:[{email:'mubashir@hnh.ae',field:'to'}],results:[{emails:['mubashir@hnh.ae'],status:'sent',error:''}]}]});

function disposableUI({disposable=true,mode='separate'}={}){
 const {app,pulse}=setup('/ammonia');
 const draft={value:'Subject: Company discussion\n\nHello,\n\nMay we discuss renewable energy partnerships?\n\nKind regards,'};
 const button={disabled:true},retry={disabled:true},section={hidden:true},status={textContent:''},list={innerHTML:''};
 const inputs=[{dataset:{pulseRecipient:'sales@example.com',name:'Team',origin:'published'}},{dataset:{pulseRecipient:'other@example.com',name:'Other',origin:'published'}}];
 let checked=[];
 const card={querySelector(selector){if(selector.includes('pulse-send"]'))return button;if(selector==='[data-pulse-disposable-send]')return retry;if(selector==='[data-pulse-disposable-confirmation]')return section;if(selector==='[data-pulse-disposable-list]')return list;if(selector==='[data-pulse-disposable]:checked')return checked[0]||null;if(selector==='.pulse-send-status')return status;if(selector.startsWith('[data-pulse-field='))return {value:selector.includes('other@')?'cc':'to'};return null;},querySelectorAll(selector){if(selector==='[data-pulse-recipient]:checked')return inputs;if(selector==='[data-pulse-disposable]:checked')return checked;return [];}};
 app.root={querySelector(selector){if(selector==='#outreach-draft')return draft;if(selector==='[data-pulse-card]')return card;if(selector==='[data-pulse-mode]:checked')return {value:mode};return null;},querySelectorAll(){return [];}};
 app.outreachSafety=()=>({safe:true});app.windWorkflow=()=>({pulseChecks:{}});app.projectOfferContext=undefined;
 pulse.status={enabled:true};pulse.refresh=async()=>{};pulse.refreshVerification=()=>{};
 const calls=[];pulse.api.send=async(key,input)=>{calls.push(structuredClone(input));return calls.length===1?{summary:{sent:0,blocked:2,failed:0},verification:[],results:[{emails:['sales@example.com','other@example.com'],status:'blocked',error:'Pulse blocked recipient'}],pulseVerification:{invalid:[{address:'sales@example.com',disposable},{address:'other@example.com',reason:'No MX'}]}}:{summary:{sent:input.recipients.length,blocked:0,failed:0},verification:[],results:[]};};
 return {app,pulse,calls,section,list,draft,status,check:(emails)=>{checked=emails.map(value=>({value}));}};
}

test('disposable Pulse block shows unchecked per-address consent; no confirmation never retries',async()=>{
 const ui=disposableUI();await ui.pulse.send({name:'Example'});
 assert.equal(ui.section.hidden,false);assert.match(ui.list.innerHTML,/sales@example.com/);assert.doesNotMatch(ui.list.innerHTML,/other@example.com|<input[^>]*\schecked(?:\s|=|>)/);
 assert.match(ui.list.innerHTML,/real company address/);
 assert.equal(ui.calls[0].disposableOverride,undefined);
 await ui.pulse.sendDisposableAnyway();assert.equal(ui.calls.length,1);
 ui.check(['sales@example.com','not-shown@example.com']);await ui.pulse.sendDisposableAnyway();
 assert.deepEqual(ui.calls[1].disposableOverride,['sales@example.com']);assert.deepEqual(ui.calls[1].recipients.map(r=>r.email),['sales@example.com']);
 assert.equal(ui.calls[1].body,ui.calls[0].body);assert.equal(ui.calls[1].subject,ui.calls[0].subject);
 await ui.pulse.sendDisposableAnyway();assert.equal(ui.calls.length,2,'consent is consumed');
});

test('non-disposable blocks do not offer consent and changed drafts invalidate consent',async()=>{
 const blocked=disposableUI({disposable:false});await blocked.pulse.send({name:'Example'});assert.equal(blocked.section.hidden,true);assert.equal(blocked.pulse.disposablePending,null);
 const changed=disposableUI();await changed.pulse.send({name:'Example'});changed.check(['sales@example.com']);changed.draft.value+='Changed email';await changed.pulse.sendDisposableAnyway();assert.equal(changed.calls.length,1);assert.equal(changed.section.hidden,true);
});

test('together disposable retry preserves original To/CC/BCC recipients and body',async()=>{
 const previous=globalThis.CSS;globalThis.CSS={escape:value=>value};
 try{const ui=disposableUI({mode:'together'});await ui.pulse.send({name:'Example'});ui.check(['sales@example.com']);await ui.pulse.sendDisposableAnyway();assert.deepEqual(ui.calls[1].recipients,ui.calls[0].recipients);assert.equal(ui.calls[1].body,ui.calls[0].body);assert.deepEqual(ui.calls[1].disposableOverride,['sales@example.com']);}
 finally{if(previous===undefined)delete globalThis.CSS;else globalThis.CSS=previous;}
});

test('HTTP request and permission errors remain visible in the panel',async()=>{
 for(const message of ['Pulse rejected the request (400). Check confirmed addresses.','Your Pulse key\'s user lacks the send-override permission (emails.send_override).']){
  const ui=disposableUI();await ui.pulse.send({name:'Example'});ui.check(['sales@example.com']);
  ui.pulse.api.send=async()=>{throw Error(message);};await ui.pulse.sendDisposableAnyway();
  assert.equal(ui.status.textContent,message);assert.equal(ui.pulse.disposablePending,null);
 }
});

test('real local preflight disposable block shows consent before any Pulse call, then forwards confirmed address',async()=>{
 const ui=disposableUI(),pulseCalls=[];
 const gate=createReoonSendGate({verify:async([email])=>[{email,provider:'Reoon',mode:'power',status:'disposable',deliverable:null,checkedAt:new Date().toISOString()}]},{register:async()=>{}});
 const module={key:'ammonia',label:'Ammonia',assertChecks(){},history:{async begin(){return 'attempt';},async complete(id,result){return result;}}};
 const service=new PulseSendService({verifyRecipients:gate,client:{enabled:true,async send(payload){pulseCalls.push(payload);return {status:'sent',httpStatus:200};}}});
 ui.pulse.api.send=async(key,input)=>service.send(module,input);
 const blocked=await ui.pulse.send({name:'Example'});
 assert.equal(pulseCalls.length,0);assert.equal(blocked.summary.blocked,2);assert.equal(ui.section.hidden,false);
 assert.match(ui.list.innerHTML,/sales@example.com/);assert.match(ui.list.innerHTML,/other@example.com/);
 ui.check(['sales@example.com']);const result=await ui.pulse.sendDisposableAnyway();
 assert.equal(pulseCalls.length,1);assert.equal(result.summary.sent,1);assert.deepEqual(pulseCalls[0].allowDisposable,['sales@example.com']);
 assert.equal(pulseCalls[0].to,'sales@example.com');assert.equal(pulseCalls[0].allowCatchAll,undefined);
});

test('every 8181 module gets a controller; unknown routes do not',()=>{
 for(const path of ['/listed-projects','/wind-projects','/investors-jv','/hydrogen-offtakers','/e-saf','/ammonia','/gases','/diesel-en590'])assert.ok(PulseSendController.forPath(path,{}),path);
 assert.equal(PulseSendController.forPath('/nda-guard',{}),null);
});

test('Wind Projects merges 8181 and desk history, updates dots and never writes it to localStorage',async()=>{
 const {app,pulse,requests,localStorage,refreshed}=setup('/wind-projects',{own:{available:true,generatedAt:'2026-10-22T08:00:00.000Z',projects:{alpha:sent('From 8181')}},desk:{available:true,projects:{alpha:{...sent('From desk'),lastSentAt:'2026-10-15T10:00:00.000Z',history:[{...sent('From desk').history[0],at:'2026-10-15T10:00:00.000Z'}]}}}});
 await pulse.refresh();
 assert.deepEqual(requests,['history:wind-projects','desk:/api/wind-projects/outreach-status']);
 assert.equal(app.sendHistory.projects.alpha.sentCount,2);
 assert.deepEqual(app.sendHistory.projects.alpha.history.map(entry=>`${entry.subject}|${entry.origin}`),['From 8181|8181','From desk|Wind Projects desk']);
 assert.equal(refreshed.length,1);assert.equal(app.sidebar.sendHistory.alpha.sentCount,2);
 const html=app.renderImportedOutreachHistory();
 assert.match(html,/From 8181/);assert.match(html,/· 8181<\/small>/);assert.match(html,/Wind Projects desk/);
 assert.equal(localStorage.getItem(app.detailWorkflowKey),null);
});

test('other modules read only their own 8181 history',async()=>{
 const {pulse,requests}=setup('/ammonia');
 await pulse.refresh();
 assert.deepEqual(requests,['history:ammonia']);
});

test('the Outreach card is live and lists published and added contacts; candidate routes are not selectable',async()=>{
 const {app,pulse,localStorage}=setup('/hydrogen-offtakers');
 localStorage.setItem(app.detailWorkflowKey,JSON.stringify({alpha:{contactsAdded:[{name:'Mubashir Test',email:'mubashir@hnh.ae'}]}}));
 await pulse.refresh();
 const record={name:'Alpha H2',contacts:[{name:'Published Person',email:'person@example.com'},{name:'Maybe',emails:[{email:'guess@example.com',status:'Candidate only — not verified'}]}]};
 const html=app.renderOutreachPanel(record);
 assert.match(html,/data-pulse-card/);
 assert.doesNotMatch(html,/Send from the Wind Projects desk \(localhost:9601\)/);
 assert.match(html,/data-pulse-recipient="person@example.com" data-name="Published Person" data-origin="published"\s+aria-label/);
 assert.match(html,/data-pulse-recipient="mubashir@hnh.ae" data-name="Mubashir Test" data-origin="added"\s+aria-label/);
 assert.match(html,/data-pulse-recipient="guess@example.com"[^>]*disabled/);
 assert.match(html,/<h3>Send history<\/h3>/);
 assert.equal((html.match(/wind-pulse-card/g)||[]).length,1);
});

test('disconnected Pulse explains how to connect',async()=>{
 const {app,pulse}=setup('/e-saf',{enabled:false});
 await pulse.refresh();
 assert.match(app.renderOutreachPanel({name:'X',contacts:[]}),/Pulse is not connected/);
});

test('sourced corporate candidates can be reached only with fresh positive Reoon; provenance stays unchanged',()=>{
 const {pulse}=setup('/investors-jv');
 const contact={name:'Executive',status:'Person-email ownership unconfirmed',emails:[{email:'executive@company.example',type:'Candidate only — person-email ownership unconfirmed',source:'https://company.example/team'}],corporateRoutes:[{email:'info@company.example',source:'https://company.example/contact',type:'Generic company route'}]};
 const original=JSON.stringify(contact),email=contact.emails[0].email;
 assert.equal(pulse.recipients({contacts:[contact]})[0].blocked,true);
 pulse.verification[email]={email,provider:'Reoon',mode:'power',status:'safe',deliverable:true,checkedAt:new Date().toISOString()};
 assert.equal(pulse.recipients({contacts:[contact]})[0].blocked,false);
 pulse.verification[email]={...pulse.verification[email],isCatchAll:true};
 assert.equal(pulse.recipients({contacts:[contact]})[0].blocked,false);
 assert.match(pulse.renderCard({contacts:[contact]}),/Provider: Reoon.*Status: safe.*Checked:/);
 assert.ok(collectPublishedEmails([{contacts:[contact]}]).has(email));
 for(const change of [{status:'invalid',deliverable:false},{status:'catch_all',deliverable:true},{status:'unknown'},{provider:'Other'},{mode:'quick'},{checkedAt:'2000-01-01T00:00:00Z'}]){
  const expected=change.status==='catch_all';
  const saved=pulse.verification[email];pulse.verification[email]={...saved,...change};assert.equal(pulse.recipients({contacts:[contact]})[0].blocked,!expected);pulse.verification[email]=saved;
 }
 for(const restricted of [{...contact,status:'Historical'},{...contact,title:'Former CEO'},{...contact,status:'User-reported invalid'},{...contact,corporateRoutes:[]},{...contact,emails:[{...contact.emails[0],email:'person@unrelated.example'}]}])assert.equal(pulse.recipients({contacts:[restricted]})[0].blocked,true);
 assert.equal(JSON.stringify(contact),original);
});

test('Reoon disclosure is populated even when Outreach mounts after verification was loaded',()=>{
 const {pulse}=setup('/investors-jv');const email='person@example.com';
 pulse.verification[email]={provider:'Reoon',mode:'power',status:'safe',deliverable:true,checkedAt:new Date().toISOString()};
 const html=pulse.renderCard({contacts:[{name:'Person',email}]});
 assert.match(html,/<p hidden role="status">person@example.com · Provider: Reoon/);
 assert.match(html,/Dubai:/);assert.match(html,/does not prove person-email ownership/);
});

test('EN590 Outreach shows the checklist and stays locked until every item is ticked',async()=>{
 const {app,pulse,localStorage}=setup('/diesel-en590');
 await pulse.refresh();
 const html=app.renderEn590ProfilePanel({buyer:'Refiner A',contacts:[{name:'Trader',email:'trader@example.com'}]},'outreach');
 assert.match(html,/Before sending/);assert.equal((html.match(/data-pulse-check=/g)||[]).length,4);
 assert.match(html,/Refiner A — EN590 diesel enquiry/);assert.match(html,/data-pulse-card/);
 assert.equal(pulse.checksDone('alpha'),false);
 localStorage.setItem(app.detailWorkflowKey,JSON.stringify({alpha:{pulseChecks:{entity:true,product:true,authority:true,compliance:true}}}));
 assert.equal(pulse.checksDone('alpha'),true);
});
