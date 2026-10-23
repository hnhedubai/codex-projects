import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {listedProjects,listedRows} from '../data/source.js';
import {installListedProjectViews,listedColumns} from '../profile.js';
import {workspaces} from '../../../platform-shell/apps/registry.js';
import {ModuleLoader} from '../../../platform-shell/shared/js/module-loader.js';
import {contactModules} from '../../../platform-shell/shared/js/contact-registry.js';
import {pulseModules} from '../../../platform-shell/shared/js/pulse-modules.js';

globalThis.document??={addEventListener(){}};
globalThis.window??={location:{origin:'http://localhost:8181'}};
globalThis.localStorage??={getItem:()=>null,setItem(){}};
const {OpportunityPlatformApp,PipelineView}=await import('../../../platform-shell/shared/js/platform-app.js');
class ListedApp extends OpportunityPlatformApp{};
class ListedPipeline extends PipelineView{};
installListedProjectViews({OpportunityPlatformApp:ListedApp,PipelineView:ListedPipeline});
function app(record){return Object.assign(Object.create(ListedApp.prototype),{path:'/listed-projects',workspace:workspaces['/listed-projects'],detailRecordId:record.id,detailTab:'overview',detailWorkflowKey:'fixture',sidebar:{starred:new Set()},pipeline:{opportunityState:()=> 'unconfirmed'},windWorkflow:()=>({}),renderSendHistorySync:()=>'',renderImportedOutreachHistory:()=>''});}

test('Listed Projects is first, has six distinct records, and keeps original units and technology',()=>{
 assert.equal(Object.keys(workspaces)[0],'/listed-projects');assert.equal(listedRows.length,6);assert.equal(new Set(listedRows.map(row=>row.id)).size,6);
 assert.equal(listedProjects.filter(p=>p.technology==='Solar PV').length,4);assert.equal(listedProjects.filter(p=>p.technology==='Onshore wind').length,2);
 assert.deepEqual(listedProjects.map(p=>p.capexEur),[110000000,80000000,90000000,26000000,97000000,33300000]);
 for(const p of listedProjects){assert.equal(p.owner,'We Green Energo');assert.match(p.ownerBasis,/User-reported/);assert.match(p.legalSpv,/to be supplied/);assert.equal(p.bankability,'Not independently assessed');assert.equal(p.contacts.length,0);}
});
test('all six copied source PDFs retain their exact original hashes and local evidence URLs',async()=>{
 for(const record of listedProjects){const pdf=await readFile(new URL('../documents/'+encodeURIComponent(record.document.filename),import.meta.url));assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.equal(createHash('sha256').update(pdf).digest('hex'),record.document.sha256);assert.match(record.sources[0].url,/^\/modules\/listed-projects\/documents\//);assert.equal(record.document.page,1);}
});
test('capacity conflicts, missing values, discounted OPEX and document dates are preserved rather than repaired',()=>{
 const sushevo1=listedProjects.find(p=>p.id==='sushevo-1-north-macedonia-pv');assert.deepEqual(sushevo1.capacityConflict,{body:130,filename:129,unit:'MWp'});assert.match(sushevo1.capacity,/130.*129/);assert.equal(sushevo1.document.date,'2026-10-18');assert.equal(sushevo1.document.asOf,'Q1-2026');
 const sushevo2=listedProjects.find(p=>p.id==='sushevo-2-north-macedonia-pv');assert.match(sushevo2.financials.find(([key])=>key.startsWith('NPV'))[1],/Blank in source/);
 const cernik=listedProjects.find(p=>p.id==='cernik-croatia-pv');assert.match(cernik.financials.find(([key])=>key==='OPEX')[1],/5.3.*discounted.*period not stated/);assert.ok(cernik.gaps.some(gap=>gap.includes('not lender participation')));
});
test('table uses the shared renderer with dynamic sticky Review after nine data columns',()=>{
 const pipeline=Object.assign(Object.create(ListedPipeline.prototype),{path:'/listed-projects',workspace:workspaces['/listed-projects'],sidebar:{starred:new Set()}});
 assert.deepEqual(pipeline.columns(),listedColumns);const values=pipeline.values(listedRows[0]);assert.equal(values.length,10);assert.match(values[1],/We Green Energo.*user-reported/);assert.equal(values[5],'EUR 110 million');assert.equal(values[6],'Not independently assessed');
 assert.match(pipeline.cell(listedRows[0],'Open',9),/pipeline-review-column.*data-record="dielli-kosovo-pv"/);assert.doesNotMatch(pipeline.cell(listedRows[0],values[7],7),/table-open/);
});
test('all ten shared detail tabs render the matching project without unrelated ABO or wind-only solar assumptions',()=>{
 for(const record of listedProjects){const instance=app(record);assert.match(instance.renderWindOverview(record),/We Green Energo/);
  for(const tab of ['project','partnership','financials','diligence','evidence','history','contacts','sources','outreach']){instance.detailTab=tab;const html=instance.renderWindPanel(record,tab);assert.ok(html.length>100,record.id+' '+tab);assert.doesNotMatch(html,/undefined|ABO Energy named projects/);}
  const html=instance.renderWindPanel(record,'project');assert.ok(html.includes(record.name));assert.ok(html.includes(record.capacity));assert.match(html,/Ownership basis/);assert.match(html,/Bankability &amp; financing|Bankability & financing/);
 }
});
test('module loader resolves Listed Projects without legacy fallbacks; contact and sending services use an isolated module',async()=>{
 let calls=0;const loader=new ModuleLoader({records:async()=>({listedRows,loadLegacyRows:()=>{calls++;throw Error('Wrong loader');}}),snapshotUrl:()=>null,hydrate:rows=>rows});assert.equal((await loader.load('/listed-projects')).length,6);assert.equal(calls,0);assert.equal(contactModules['/listed-projects'].directory,'listed-projects');assert.equal(pulseModules['/listed-projects'].key,'listed-projects');
});
test('Listed outreach addresses the reported owner and preserves a saved draft',()=>{
 const record=listedProjects[0],instance=app(record);assert.match(instance.renderOutreachPanel(record),/Dear We Green Energo Team/);assert.doesNotMatch(instance.renderOutreachPanel(record),/established wind-energy developer/);instance.windWorkflow=()=>({outreachDraft:'Preserved user draft'});assert.match(instance.renderOutreachPanel(record),/Preserved user draft/);
});
