import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {listedProjects,listedRows} from '../data/source.js';
import {listedColumns,offtakeStatus,migrateOfftakeColumn,installListedProjectViews} from '../profile.js';
const prefix='oplatform:/listed-projects:';
function storage(initial={}){
 const values=new Map(Object.entries(initial));
 return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
}

test('all six projects disclose unknown agreement status without upgrading tariffs or grid claims to PPAs',()=>{
 assert.equal(listedProjects.length,11);
 for(const record of listedProjects.slice(0,6)){
  assert.equal(record.offtakeAgreement.status,'Not disclosed');
  assert.equal(offtakeStatus({source:record}),'Not disclosed');
  assert.equal(record.offtakeAgreement.offtaker,'');
  assert.equal(record.offtakeAgreement.term,'');
  assert.equal(record.offtakeAgreement.sourceUrl,record.document.url);
  assert.match(record.offtakeAgreement.evidence,/No executed PPA/);
  assert.match(record.offtakeAgreement.evidence,/Tariff assumptions and grid connection claims do not establish/);
 }
 assert.equal(offtakeStatus({gridConnection:'Approved',tariff:'EUR 66/MWh'}),'Not disclosed');
 assert.equal(offtakeStatus({offtakeAgreement:{status:'Under negotiation'}}),'Under negotiation');
});

test('new column appends without changing existing order, widths, hidden columns, drafts or filters',()=>{
 const order=[5,0,9,1,2,3,4,6,7,8];
 const store=storage({[prefix+'column-order']:JSON.stringify(order),[prefix+'visible-columns']:'[0,5,9]',[prefix+'column-widths']:'{"0":330,"2":100}',[prefix+'sidebar-state']:'{"search":"Cernik"}',[prefix+'detail-workflow']:'{"fixture":{"outreachDraft":"keep"}}'});
 migrateOfftakeColumn(store);
 assert.deepEqual(JSON.parse(store.getItem(prefix+'column-order')),[...order,10]);
 assert.equal(store.getItem(prefix+'visible-columns'),'[0,5,9,10]');
 assert.equal(store.getItem(prefix+'column-widths'),'{"0":330,"2":100}');
 assert.equal(store.getItem(prefix+'sidebar-state'),'{"search":"Cernik"}');
 assert.equal(store.getItem(prefix+'detail-workflow'),'{"fixture":{"outreachDraft":"keep"}}');
 assert.ok(store.getItem('oplatform-listed-offtake-layout-backup-v1'));
 const hiddenOrder=[10,...order];store.setItem(prefix+'column-order',JSON.stringify(hiddenOrder));store.setItem(prefix+'visible-columns','[0,9]');
 const before=[...store.values];migrateOfftakeColumn(store);assert.deepEqual([...store.values],before);
});

test('fresh and legacy layouts get the column once; failed or corrupt migration retains saved values',()=>{
 const fresh=storage();migrateOfftakeColumn(fresh);
 assert.deepEqual(JSON.parse(fresh.getItem(prefix+'column-order')),Array.from({length:11},(_,i)=>i));
 const legacy=storage({[prefix+'column-order']:'[7,0,1,2,3,4,5,6]'});migrateOfftakeColumn(legacy);
 assert.equal(legacy.getItem(prefix+'column-order'),'[7,0,1,2,3,4,5,6,8,9,10]');
 const broken=storage({[prefix+'column-order']:'not JSON'}),before=[...broken.values];
 assert.throws(()=>migrateOfftakeColumn(broken));assert.deepEqual([...broken.values],before);
 const invalid=storage({[prefix+'column-order']:'[0,1,2,3,4,5,6,7,8,10]'});assert.throws(()=>migrateOfftakeColumn(invalid));
 const failed=storage({[prefix+'column-order']:'[0,1,2,3,4,5,6,7,8,9]',[prefix+'visible-columns']:'[0,9]'}),set=failed.setItem;let fail=true;
 failed.setItem=(key,value)=>{if(key===prefix+'visible-columns'&&fail){fail=false;throw Error('quota');}set(key,value);};
 assert.throws(()=>migrateOfftakeColumn(failed));
 assert.equal(failed.getItem(prefix+'column-order'),'[0,1,2,3,4,5,6,7,8,9]');assert.equal(failed.getItem(prefix+'visible-columns'),'[0,9]');
});

const source=await readFile(new URL('../../../platform-shell/shared/js/platform-app.js',import.meta.url),'utf8');
function classes(){
 const store=storage();
 const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL,localStorage:store});
 vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.Classes={PipelineView,OpportunityPlatformApp,WorkspaceImportGuard};',context);
 return context.Classes;
}

test('shared table retains fixed Open at index nine and escapes offtake evidence',()=>{
 const {PipelineView,OpportunityPlatformApp}=classes();
 class Pipeline extends PipelineView{};class App extends OpportunityPlatformApp{};
 installListedProjectViews({PipelineView:Pipeline,OpportunityPlatformApp:App});
 const pipeline=Object.assign(Object.create(Pipeline.prototype),{path:'/listed-projects',workspace:{columns:listedColumns},sidebar:{starred:new Set()}});
 assert.equal(pipeline.values(listedRows[0]).length,17);assert.equal(pipeline.values(listedRows[0])[10],'Not disclosed');
 assert.match(pipeline.cell(listedRows[0],'Open',9),/pipeline-review-column/);
 assert.doesNotMatch(pipeline.cell(listedRows[0],'Not disclosed',10),/table-open/);
 const fixture={source:{offtakeAgreement:{evidence:'<unsafe>"'}}};
 assert.match(pipeline.cell(fixture,'<status>',10),/&lt;unsafe&gt;&quot;/);
 assert.match(pipeline.cell(fixture,'<status>',10),/&lt;status&gt;/);
 pipeline.path='/wind-projects';assert.equal(pipeline.values({}).length,8);
});

test('workspace export/import accepts new eleven-column and old ten-column layouts',()=>{
 const {WorkspaceImportGuard:Guard}=classes();
 for(const count of [8,10,11,17]){
  const snapshot={format:'oplatform-workspace',version:1,path:'/listed-projects',state:{'column-order':JSON.stringify(Array.from({length:count},(_,i)=>i))}};
  assert.equal(Guard.snapshot(snapshot,'/listed-projects').length,1);
 }
 const snapshot={format:'oplatform-workspace',version:1,path:'/listed-projects',state:{'column-order':'[10,0,1,2,3,4,5,6,7,8,9]','visible-columns':'[0,9,10]','column-widths':'{"10":250}'}};
 assert.equal(Guard.snapshot(snapshot,'/listed-projects').length,3);
 snapshot.state['visible-columns']='[17]';assert.throws(()=>Guard.snapshot(snapshot,'/listed-projects'));
 const other={...snapshot,path:'/wind-projects',state:{'visible-columns':'[10]'}};assert.throws(()=>Guard.snapshot(other,'/wind-projects'));
});
