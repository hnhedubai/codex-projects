import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('./platform-app.js',import.meta.url),'utf8');
const modules=['/wind-projects','/investors-jv','/hydrogen-offtakers','/e-saf','/ammonia','/gases','/diesel-en590'];
const contactKey='oplatform:/diesel-en590:imported-refinery-contacts';
const csv='company,asset,name,role,email,country,source,phone,notes\nNew Co,New Refinery,New Person,CEO,new@example.com,Spain,https://new.example,222,New note';
function setup(confirm=true){
 const values=new Map(),alerts=[],previews=[];
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
 const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181',reload(){}},confirm:message=>{previews.push(message);return confirm;},alert:message=>alerts.push(message)},URL,localStorage:storage,FileReader:class{readAsText(file){this.result=file.text;this.onload();}}});
 vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.api={WorkspaceImportGuard,RefineryContactImport,OpportunityPlatformApp};',context);
 const app=Object.create(context.api.OpportunityPlatformApp.prototype);app.path='/diesel-en590';app.root={querySelector:()=>({value:''})};
 return {...context.api,app,storage,values,alerts,previews};
}
const snapshot=(path,state)=>({format:'oplatform-workspace',version:1,path,state});

test('P1 malicious workflow count is rejected in every module before any state write',()=>{
 for(const path of modules){
  const f=setup();f.app.path=path;f.values.set(`oplatform:${path}:starred`,'["keep"]');
  f.app.importWorkspace({name:'unsafe.json',text:JSON.stringify(snapshot(path,{starred:'["replace"]','detail-workflow':JSON.stringify({record:{diligenceReviewed:'<img src=x onerror="bad()">'}})}))});
  assert.equal(f.storage.getItem(`oplatform:${path}:starred`),'["keep"]');assert.equal(f.values.size,1);
  assert.match(f.alerts[0],/integer from 0 to 10/);assert.equal(f.previews.length,0);
 }
});

test('strict schema rejects malformed JSON, unsupported properties, prototype keys and wrong types',()=>{
 const {WorkspaceImportGuard:G}=setup();
 for(const [key,raw]of [['starred','broken'],['unknown','{}'],['column-order','[0,1]'],['sidebar-state','{"countryValues":{}}'],['detail-workflow','{"r":{"contactsAdded":{}}}'],['detail-workflow','{"r":{"diligenceReviewed":11}}'],['detail-workflow','{"r":{"diligenceReviewed":1.5}}'],['detail-workflow','{"__proto__":{}}']])assert.throws(()=>G.snapshot(snapshot('/wind-projects',{[key]:raw}),'/wind-projects'));
 assert.throws(()=>G.snapshot(snapshot('/investors-jv',{}),'/wind-projects'),/Unsupported/);
 assert.equal({}.polluted,undefined);
});

test('valid rich workflow data is accepted and roundtrips without dropping contacts or history',()=>{
 const {WorkspaceImportGuard:G,storage}=setup();
 const workflow={record:{diligenceReviewed:4,diligenceChecks:{ownership:true},contactsAdded:[{name:'Person',email:'p@example.com',phones:['111','222'],corporateRoutes:[{email:'office@example.com',source:'https://example.com'}],notes:'Keep original findings',sources:[{url:'https://example.com'}]}],outreachHistory:[{at:'2026-10-22',results:[{email:'p@example.com',status:'sent'}]}],outreachNotes:'Preserve notes'}};
 const raw=JSON.stringify(workflow);const entries=G.snapshot(snapshot('/wind-projects',{'detail-workflow':raw}),'/wind-projects');G.commit(storage,'/wind-projects',entries);
 assert.equal(storage.getItem('oplatform:/wind-projects:detail-workflow'),raw);
});

test('rendering already-tampered local state cannot inject HTML through the count',()=>{
 const {app}=setup();app.windWorkflow=()=>({diligenceReviewed:'<img src=x onerror="bad()">'});
 const html=app.renderWindOverview({name:'Fixture'});assert.doesNotMatch(html,/onerror/);assert.match(html,/reviewed: 0 \/ 10/);
});

test('P1 second CSV import retains all earlier contacts and creates a pre-import recovery copy',()=>{
 const f=setup();const original=[{company:'Old Co',asset:'Old Refinery',name:'Existing',email:'old@example.com',phones:['111'],notes:'Keep findings'}];
 const before=JSON.stringify(original);f.storage.setItem(contactKey,before);
 const summary=f.app.importRefineryContacts(csv);assert.equal(summary.added,1);
 const after=JSON.parse(f.storage.getItem(contactKey));assert.deepEqual(after[0],original[0]);assert.equal(after.length,2);
 const backup=[...f.values.keys()].find(key=>key.startsWith('oplatform-import-backup:'));
 assert.equal(JSON.parse(f.storage.getItem(backup)).previous[0][1],before);assert.match(f.previews[0],/1 existing contacts retained/);
});

test('repeated imports are idempotent, and separate email routes remain separate',()=>{
 const f=setup();f.app.importRefineryContacts(csv);const before=f.storage.getItem(contactKey);
 assert.equal(f.app.importRefineryContacts(csv).duplicates,1);assert.equal(f.storage.getItem(contactKey),before);
 f.app.importRefineryContacts(csv.replace('new@example.com','second@example.com'));assert.equal(JSON.parse(f.storage.getItem(contactKey)).length,2);
});

test('conflicting phone, source and notes preserve both values and existing primary fields',()=>{
 const {RefineryContactImport:I}=setup();
 const old={company:'Co',asset:'Site',name:'Person',email:'p@example.com',phone:'111',source:'https://old.example',notes:'Existing findings'};
 const incoming={...old,phone:'222',source:'https://new.example',notes:'Additional findings'};
 const plan=I.plan([old],[incoming]),merged=plan.contacts[0];
 assert.equal(merged.phone,'111');assert.deepEqual(Array.from(merged.phones),['111','222']);assert.equal(merged.notes,'Existing findings');
 assert.equal(merged.importConflicts.length,3);assert.ok(merged.importConflicts.some(c=>c.incoming==='Additional findings'));assert.equal(merged.sources.length,2);
 assert.equal(plan.summary.conflicts,3);assert.equal(old.importConflicts,undefined);assert.equal(I.plan(plan.contacts,[incoming]).summary.duplicates,1);
});

test('cancelled preview, malformed CSV and corrupt existing data make no writes',()=>{
 const f=setup(false);f.storage.setItem(contactKey,'[]');assert.equal(f.app.importRefineryContacts(csv),null);assert.equal(f.values.size,1);
 assert.throws(()=>f.app.importRefineryContacts(csv+'\n"broken'),/unclosed/);
 assert.throws(()=>f.app.importRefineryContacts(csv+'\nwrong,column,count'),/number of fields/);
 f.storage.setItem(contactKey,'broken');assert.throws(()=>f.app.importRefineryContacts(csv),/not been overwritten/);assert.equal(f.storage.getItem(contactKey),'broken');
});

test('another tab changing contacts during preview is not overwritten',()=>{
 const f=setup();f.storage.setItem(contactKey,'[]');
 assert.throws(()=>f.app.importRefineryContacts(csv,{confirm:()=>{f.storage.setItem(contactKey,'[{"name":"Other tab"}]');return true;}}),/another tab/);
 assert.equal(f.storage.getItem(contactKey),'[{"name":"Other tab"}]');
});

test('failure to create backup stops writes; partial failure restores previous values',()=>{
 const {WorkspaceImportGuard:G}=setup();let writes=0;
 assert.throws(()=>G.commit({getItem:()=>null,setItem:()=>{writes++;throw Error('quota');}},'/wind-projects',[['key','new']]),/quota/);assert.equal(writes,1);
 const values=new Map([['one','old one'],['two','old two']]);let failed=false;
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(key==='two'&&!failed){failed=true;throw Error('quota');}values.set(key,value);},removeItem:key=>values.delete(key)};
 assert.throws(()=>G.commit(storage,'/wind-projects',[['one','new one'],['two','new two']]),/previous values restored/);
 assert.equal(values.get('one'),'old one');assert.equal(values.get('two'),'old two');assert.ok([...values.keys()].some(key=>key.startsWith('oplatform-import-backup:')));
});
