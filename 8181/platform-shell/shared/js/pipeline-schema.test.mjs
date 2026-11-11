import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.document??={addEventListener(){}};
const {HydrogenPipelineSchema}=await import('./platform-app.js');
const WIND_PIPELINE_COLUMNS=HydrogenPipelineSchema.columns;
const h2PipelineValues=(...args)=>HydrogenPipelineSchema.h2PipelineValues(...args);
const migrateH2TableSettings=(...args)=>HydrogenPipelineSchema.migrateH2TableSettings(...args);
test('H2 and Wind use identical table columns and opportunity controls',async()=>{
 const {PipelineView}=await import('./platform-app.js');
 const {workspaces}=await import('../../apps/registry.js');
 const table=path=>Object.assign(Object.create(PipelineView.prototype),{path,workspace:workspaces[path],opportunities:{}});
 assert.deepEqual(table('/h2-dev').columns(),table('/wind-projects').columns());
 assert.deepEqual(workspaces['/h2-dev'].columns,workspaces['/wind-projects'].columns);
 assert.match(table('/h2-dev').cell({id:'rwe',company:'RWE'},'Unconfirmed',5),/data-opportunity="rwe"/);
 assert.match(table('/h2-dev').cell({id:'rwe',company:'RWE'},'Open',7),/Open RWE/);
});
test('developer pipeline presents eight wind columns without fabricating ownership, scale or engagement',()=>{
 const source={company:'Example',role:'Investor',intent:'Appetite unconfirmed',fit:'Needs screening',contacts:[{name:'Director'}]};
 const before=structuredClone(source),row={company:'Example',country:'Germany',status:'Research prospect',source};
 const values=h2PipelineValues(row);
 assert.equal(values.length,WIND_PIPELINE_COLUMNS.length);
 assert.equal(values[0],'Example — hydrogen partnership review');assert.equal(values[1],'Example');
 assert.equal(values[3],'Not recorded');assert.equal(values[6],'Not contacted');
 assert.equal(h2PipelineValues(row,{outreachStage:'Awaiting reply'})[6],'Awaiting reply');
 assert.deepEqual(source,before);
 const reference=h2PipelineValues({...row,source:{...source,relatedProjects:[{name:'Reference project',capacity:'100 MW planned'}]}});
 assert.equal(reference[0],'Reference project');assert.equal(reference[3],'100 MW planned');
});
function fixture(){const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}
test('legacy nine-column presentation is backed up, migrated once and never changes workflow or wind settings',()=>{
 const storage=fixture(),prefix='oplatform:/h2-dev:';
 const legacy={'column-order':'[8,0,1,2,3,4,5,6,7]','visible-columns':'[0,2,8]','column-widths':'{"0":210,"2":150,"8":100}'};
 for(const [key,value]of Object.entries(legacy))storage.setItem(prefix+key,value);
 storage.setItem(prefix+'detail-workflow','{"one":{"outreachStage":"Contacted"}}');
 storage.setItem('oplatform:/wind-projects:column-order','[7,0,1,2,3,4,5,6]');
 migrateH2TableSettings(storage);
 assert.deepEqual(JSON.parse(storage.getItem(prefix+'column-order')),[0,1,2,3,4,5,6,7]);
 assert.deepEqual(JSON.parse(storage.getItem(prefix+'column-widths')),{'1':210,'2':150,'7':100});
 const backups=[...storage.data].filter(([key])=>key.startsWith('oplatform-h2-table-settings-backup:'));
 assert.equal(backups.length,1);assert.deepEqual(JSON.parse(backups[0][1]).previous,legacy);
 assert.equal(storage.getItem(prefix+'detail-workflow'),'{"one":{"outreachStage":"Contacted"}}');
 assert.equal(storage.getItem('oplatform:/wind-projects:column-order'),'[7,0,1,2,3,4,5,6]');
 storage.setItem(prefix+'visible-columns','[0,1,7]');migrateH2TableSettings(storage);
 assert.equal(storage.getItem(prefix+'visible-columns'),'[0,1,7]');
});
test('failed backup leaves every live table preference untouched',()=>{
 const storage=fixture();storage.setItem('oplatform:/h2-dev:column-order','[0,1,2,3,4,5,6,7,8]');
 const before=[...storage.data];storage.setItem=()=>{throw Error('quota');};
 assert.throws(()=>migrateH2TableSettings(storage),/quota/);assert.deepEqual([...storage.data],before);
});
