import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {SECTOR_OPTIONS,defaultSectors,normalizeSectors,sectorState,migrateSectorColumns,installInvestorSectors} from '../sectors.js';
import {partnerRecords} from '../data/source.js';
const prefix='oplatform:/investors-jv:';
function storage(initial={}){const values=new Map(Object.entries(initial));return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key),values};}
test('Sector supports multiple technologies, de-duplicates and never invents investment intent',()=>{
 assert.deepEqual(normalizeSectors(['Wind','e-SAF','Solar PV','Wind','UNKNOWN']),['Wind','Solar PV','e-SAF']);
 assert.deepEqual(defaultSectors({source:{subSector:'Wind, solar and BESS'}}),['Wind','Solar PV','BESS']);
 assert.deepEqual(defaultSectors({subSector:'Renewable investor',summary:'solar maybe'}),[]);
 const before=JSON.stringify(partnerRecords);partnerRecords.forEach(record=>defaultSectors(record));assert.equal(JSON.stringify(partnerRecords),before);
});
test('company selections persist including explicit empty selections, isolated from other records',()=>{
 const store=storage({[prefix+'detail-workflow']:JSON.stringify({a:{sectors:['Wind','Solar PV','e-SAF'],outreachNotes:'retain'},b:{sectors:[]}})});
 assert.deepEqual(sectorState(store,{id:'a'}),['Wind','Solar PV','e-SAF']);assert.deepEqual(sectorState(store,{id:'b',subSector:'wind'}),[]);
 assert.deepEqual(sectorState(store,{id:'c',subSector:'wind'}),['Wind']);
 assert.throws(()=>sectorState(storage({[prefix+'detail-workflow']:'broken'}),{id:'a'}));
});
test('column migration adds Sector near company name and preserves reordered columns, widths and visibility',()=>{
 const store=storage({[prefix+'column-order']:'[2,0,1,3,4,5,6,7]',[prefix+'column-widths']:'{"0":300,"1":220,"7":100}',[prefix+'visible-columns']:'[0,2,7]'});
 migrateSectorColumns(store);
 assert.deepEqual(JSON.parse(store.getItem(prefix+'column-order')),[3,1,0,2,4,5,6,7,10,8,9,11,12,13,14,15,16]);
 assert.deepEqual(JSON.parse(store.getItem(prefix+'column-widths')),{'0':300,'2':220,'10':100});
 assert.deepEqual(JSON.parse(store.getItem(prefix+'visible-columns')),[0,3,10,8,9,11,12,13,14,15,16]);
 const before=[...store.values];migrateSectorColumns(store);assert.deepEqual([...store.values],before);
 // A subsequently imported legacy eight-column snapshot also migrates, despite an existing marker.
 store.setItem(prefix+'column-order','[0,1,2,3,4,5,6,7]');migrateSectorColumns(store);assert.equal(JSON.parse(store.getItem(prefix+'column-order')).length,17);
 const saved=storage({[prefix+'column-order']:'[10,0,4,1,8,2,9,3,5,6,7]',[prefix+'visible-columns']:'[10,0,4,1,8,2,9,3,5,6,7]',[prefix+'column-widths']:'{"10":140}'});
 migrateSectorColumns(saved);assert.equal(saved.getItem(prefix+'column-order'),'[10,0,4,1,8,2,9,3,5,6,7,11,12,13,14,15,16]');assert.equal(saved.getItem(prefix+'visible-columns'),'[10,0,4,1,8,2,9,3,5,6,7,11,12,13,14,15,16]');assert.equal(saved.getItem(prefix+'column-widths'),'{"10":140}');
});
test('failed migration preserves original settings and corrupt settings are not overwritten',()=>{
 const store=storage({[prefix+'column-order']:'[0,1,2,3,4,5,6,7]'}),write=store.setItem;let fail=true;
 store.setItem=(key,value)=>{if(key===prefix+'column-widths'&&fail){fail=false;throw Error('quota');}write(key,value);};
 assert.throws(()=>migrateSectorColumns(store));assert.equal(store.getItem(prefix+'column-order'),'[0,1,2,3,4,5,6,7]');
 const corrupt=storage({[prefix+'column-order']:'broken'});assert.throws(()=>migrateSectorColumns(corrupt));assert.equal(corrupt.getItem(prefix+'column-order'),'broken');
});
test('module adapter adds exactly one editable checkbox column and leaves Review and other modules intact',()=>{
 class Pipeline{columns(){return ['Partner','Country','Intent','Scale','Status','Evidence','Contacts','Review'];}values(){return ['A','B','C','D','E','F','G','Open'];}cell(_row,_value,index){return `base-${index}`;}name(row){return row.partner;}escape(value){return String(value).replaceAll('"','&quot;');}render(){}}
 class App{bind(){}}
 installInvestorSectors({OpportunityPlatformApp:App,PipelineView:Pipeline});
 const pipeline=new Pipeline();pipeline.path='/investors-jv';pipeline.sectorsFor=()=>['Wind','Solar PV','e-SAF'];
 assert.equal(pipeline.columns().length,10);assert.equal(pipeline.columns()[8],'Review');assert.equal(pipeline.columns().at(-1),'Origin country');assert.equal(pipeline.values({}).length,10);
 const cell=pipeline.cell({id:'a',partner:'A'},'',1);assert.match(cell,/type="checkbox"/);assert.equal((cell.match(/ checked/g)||[]).length,3);assert.match(cell,/Wind · Solar PV · e-SAF/);assert.equal(pipeline.cell({},'',8),'base-8');
 pipeline.path='/wind-projects';assert.equal(pipeline.columns().length,8);assert.equal(pipeline.cell({},'',7),'base-7');
});
test('workspace import/export accepts nine columns and sectors but rejects invalid values',async()=>{
 const source=await readFile(new URL('../../../platform-shell/shared/js/platform-app.js',import.meta.url),'utf8');
 const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL});
 vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.Guard=WorkspaceImportGuard;',context);const Guard=context.Guard;
 Guard.workflow({sectors:['Wind','Solar PV','e-SAF'],outreachNotes:'retain'});Guard.workflow({sectors:[]});
 for(const sectors of [['invalid'],['Wind','Wind'],'Wind'])assert.throws(()=>Guard.workflow({sectors}));
 const snapshot={format:'oplatform-workspace',version:1,path:'/investors-jv',state:{'column-order':'[0,7,1,2,3,4,5,6,8]','column-widths':'{"8":120}','detail-workflow':'{"a":{"sectors":["Wind","e-SAF"]}}'}};
 assert.equal(Guard.snapshot(snapshot,'/investors-jv').length,3);
 snapshot.state['column-order']='[0,1,2,3,4,5,6,7]';assert.equal(Guard.snapshot(snapshot,'/investors-jv').length,3);
 assert.equal(SECTOR_OPTIONS.includes('e-SAF'),true);
});
test('checkbox edits save all sectors on one company while retaining contacts and notes; failed saves revert',()=>{
 const originalStorage=globalThis.localStorage;
 try{
  const store=storage({[prefix+'detail-workflow']:'{"a":{"outreachNotes":"retain","contactsAdded":[{"name":"Contact"}]},"b":{"sectors":["Hydrogen"]}}'});globalThis.localStorage=store;
  class Pipeline{columns(){}values(){}cell(){}render(){}}
  class App{bind(){}saveWindWorkflow(id,patch){const all=JSON.parse(store.getItem(prefix+'detail-workflow'));all[id]={...all[id],...patch};store.setItem(prefix+'detail-workflow',JSON.stringify(all));}}
  installInvestorSectors({OpportunityPlatformApp:App,PipelineView:Pipeline});
  const app=new App(),summary={},picker={querySelector:()=>summary,querySelectorAll:()=>['Wind','Solar PV','e-SAF'].map(sector=>({dataset:{investorSector:sector}}))};let handler;
  Object.assign(app,{path:'/investors-jv',rows:[{id:'a'}],root:{addEventListener(_event,callback){handler=callback;}},navigation:{status(){}}});app.bind();
  const input={matches:()=>true,dataset:{sectorRecord:'a'},closest:()=>picker,checked:true};handler({target:input});
  const saved=JSON.parse(store.getItem(prefix+'detail-workflow'));assert.deepEqual(saved.a.sectors,['Wind','Solar PV','e-SAF']);assert.equal(saved.a.outreachNotes,'retain');assert.equal(saved.a.contactsAdded.length,1);assert.deepEqual(saved.b.sectors,['Hydrogen']);
  store.setItem(prefix+'detail-workflow','corrupt');handler({target:input});assert.equal(store.getItem(prefix+'detail-workflow'),'corrupt');assert.equal(input.checked,false);
 }finally{if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;}
});
