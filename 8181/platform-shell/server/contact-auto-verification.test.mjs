import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {loadContactCatalog} from './contact-catalog.mjs';
import {contactModules} from '../shared/js/contact-registry.js';

const source=await readFile(new URL('../shared/js/platform-app.js',import.meta.url),'utf8');
function setup(){
 const events=[];
 const context=vm.createContext({document:{addEventListener(){},dispatchEvent:event=>events.push(event.type)},window:{location:{origin:'http://localhost:8181'}},URL,Event});
 vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.exports={EmailVerification,OpportunityPlatformApp,SidebarController};',context);
 return {...context.exports,events};
}
function appFixture(App,module,email='person@example.com'){
 let state={contactsAdded:[],notes:'Keep existing notes'};
 const app=Object.create(App.prototype);
 Object.assign(app,{path:module,detailRecordId:'fixture-record',root:{querySelector:selector=>({value:({'#contact-name':'Fixture person','#contact-email':email})[selector]||''})},windWorkflow:()=>state,saveWindWorkflow:(id,changes)=>{assert.equal(id,'fixture-record');state={...state,...changes};},renderRecordDetail(){this.rendered=true;}});
 return {app,state:()=>state};
}

test('save automatically verifies entered email in all eight modules, after preserving the contact',async()=>{
 for(const module of Object.keys(contactModules)){
  const {EmailVerification:E,OpportunityPlatformApp:App,events}=setup();
  const {app,state}=appFixture(App,module);let calls=0;
  E.request=async(url,options)=>{
   calls++;assert.equal(url,'/api/reoon/verify');assert.equal(state().contactsAdded.length,1);assert.equal(app.rendered,true);
   const body=JSON.parse(options.body);assert.equal(body.context.module,module);assert.equal(body.context.provenance,'manual-contact-entry');assert.equal(body.refresh,undefined);
   return {results:[{email:'person@example.com',status:'catch_all',provider:'Reoon',mode:'power',deliverable:false,checkedAt:new Date().toISOString()}]};
  };
  await app.handleDetailAction('save-contact');
  assert.equal(calls,1);assert.equal(state().notes,'Keep existing notes');assert.equal(E.result('person@example.com').status,'catch_all');
  assert.ok(events.includes('reoon-results-updated'));assert.equal(E.pending.size,0);
 }
});

test('no email makes no call; cached results make no paid call',async()=>{
 const {EmailVerification:E,OpportunityPlatformApp:App}=setup();let calls=0;E.request=async()=>{calls++;throw Error('must not call');};
 const empty=appFixture(App,'/wind-projects','');await empty.app.handleDetailAction('save-contact');assert.equal(empty.state().contactsAdded.length,1);
 E.results['person@example.com']={email:'person@example.com',status:'safe'};
 const cached=appFixture(App,'/diesel-en590');await cached.app.handleDetailAction('save-contact');assert.equal(calls,0);
});

test('concurrent automatic checks deduplicate one normalized mailbox',async()=>{
 const {EmailVerification:E}=setup();let calls=0,release;
 E.request=()=>{calls++;return new Promise(resolve=>{release=()=>resolve({results:[{email:'person@example.com',status:'safe'}]});});};
 const first=E.verifyAddedContact('/wind-projects','id',{name:'One',email:' Person@Example.com '});
 const second=E.verifyAddedContact('/diesel-en590','id2',{name:'Two',email:'person@example.com'});
 assert.equal(first,second);assert.equal(calls,1);assert.match(E.label('person@example.com'),/in progress/);
 release();await first;assert.equal(E.pending.size,0);
});

test('provider failure retains contact and notes and shows an unresolved status',async()=>{
 const {EmailVerification:E,OpportunityPlatformApp:App}=setup();
 E.request=async()=>{throw Error('Provider unavailable');};
 const {app,state}=appFixture(App,'/hydrogen-offtakers');await app.handleDetailAction('save-contact');
 assert.equal(state().contactsAdded.length,1);assert.equal(state().notes,'Keep existing notes');assert.equal(E.result('person@example.com'),null);
 assert.match(E.label('person@example.com'),/not verified.*Provider unavailable/);
});

test('manual entries without source URLs retain honest provenance on the server',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'8181-auto-contact-'));
 const catalog=await loadContactCatalog(root);
 await catalog.register({module:'/hydrogen-offtakers',recordId:'record',name:'User entered',email:'person@example.com',provenance:'manual-contact-entry'},['person@example.com']);
 assert.ok(catalog.allowedEmails.has('person@example.com'));
 const saved=JSON.parse(await readFile(path.join(root,'platform-shell/data/reoon-local-contacts.json'),'utf8'));
 assert.equal(saved[0].source,'');assert.match(saved[0].association,/not independently verified/);
});

test('sidebar counts locally added safe mailbox results without changing outreach dots',()=>{
 const {EmailVerification:E,SidebarController:Sidebar}=setup();
 E.results['person@example.com']={email:'person@example.com',provider:'Reoon',mode:'power',status:'safe',deliverable:true,isRoleAccount:false,checkedAt:new Date().toISOString()};
 const sidebar=Object.create(Sidebar.prototype);sidebar.outreachWorkflows=()=>({record:{contactsAdded:[{email:'person@example.com'}]}});
 assert.equal(sidebar.verification({id:'record',contacts:[]}).mark,'✓');
});
