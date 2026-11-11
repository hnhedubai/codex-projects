import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {balkanSolarBuyers,applyBalkanSolarBuyers} from '../data/balkan-solar-buyers.js';
import {partnerRecords,partnerContacts,partnerRegistry,balkanSolarBuyersAudit} from '../data/source.js';
import {migrateOriginCountryColumns} from '../sectors.js';

const priorityIds=['enna-solar','hep','janaf'];

test('eight distinct Balkan buyers are in the shared company and contact registry',()=>{
 assert.equal(balkanSolarBuyersAudit.added,8);
 assert.equal(balkanSolarBuyersAudit.contactsAdded,9);
 assert.equal(partnerRegistry.count,142+balkanSolarBuyersAudit.added);
 assert.equal(new Set(partnerRegistry.ids).size,partnerRegistry.count);
 for(const batch of balkanSolarBuyers){
  const record=partnerRecords.find(row=>row.id===batch.id);
  assert.ok(record&&record.sectors.includes('Solar PV'));
  assert.ok(record.sources.length&&record.sources.every(url=>url.startsWith('https://')));
  assert.equal(record.contactResearch.asOf,'2026-10-25');
  assert.equal(record.balkanSolarResearch.projectScope,batch.projectScope);
  assert.equal(record.jevVote,undefined);assert.equal(record.jevConfidence,undefined);
  assert.ok(partnerRegistry.ids.includes(batch.id));
  // Assert this import's original cohort; later dated rescans may append people.
  const original=partnerContacts[batch.id].filter(contact=>contact.researchHistory?.[0]?.runId==='balkan-solar-buyers-20261025');
  assert.equal(original.length,batch.people.length);
  for(const contact of original){
   assert.ok(contact.name&&contact.title&&contact.source);
   assert.equal(contact.research.asOf,'2026-10-25');
   assert.equal(contact.email,'');assert.equal(contact.reoon,undefined);
   assert.equal(contact.researchHistory[0].runId,'balkan-solar-buyers-20261025');
  }
 }
});

test('the Balkan import itself marks three explicit intake routes before the wider review',()=>{
 assert.deepEqual(balkanSolarBuyersAudit.prioritised,priorityIds);
 const initialRecords=[],initialContacts={};applyBalkanSolarBuyers(initialRecords,initialContacts);
 const priorities=initialRecords.filter(record=>record.outreachPriority?.level==='priority');
 assert.deepEqual(priorities.map(record=>record.id),priorityIds);
 for(const record of priorities){
  assert.ok(record.outreachPriority.reason&&record.outreachPriority.projectScope);
  assert.equal(record.outreachPriority.assessedAt,'2026-10-25');
  assert.match(record.outreachPriority.basis,/not a JEV vote/);
 }
 for(const batch of balkanSolarBuyers.slice(3)){
  const record=initialRecords.find(row=>row.id===batch.id);
  assert.equal(record.outreachPriority,undefined);
  assert.notEqual(record.status,'Open — actively seeking investment/JV');
 }
});

test('standing calls, geography, buyer roles and verification gaps remain explicit',()=>{
 const row=id=>partnerRecords.find(record=>record.id===id);
 assert.equal(row('hep').evidenceDate,'');assert.equal(row('janaf').evidenceDate,'');
 assert.match(row('hep').country,/Croatia only/);assert.match(row('janaf').notes,/not a traditional independent/);
 assert.match(row('enna-solar').summary,/subject to regulatory approvals/);
 assert.match(row('enna-solar').notes,/Kosovo and North Macedonia acceptance is not confirmed/);
 assert.match(row('kelag-international').originCountryBasis,/parent-group origin/);
 assert.equal(row('zen-energy-group').originCountry,'Unknown');
 assert.match(row('enlight-renewable-energy').summary,/not a current Kosovo solar acquisition mandate/);
 for(const id of ['hep','janaf']){
  const card=partnerContacts[id][0];assert.equal(card.association,'shared');
  assert.equal(card.corporateRoutes.length,1);
  assert.equal(card.corporateRoutes[0].type,'Shared corporate route');
  assert.match(card.corporateRoutes[0].status,/Reoon not checked/);
 }
});

test('re-import is idempotent and preserves prior relationships, contacts and outreach',()=>{
 const records=structuredClone(partnerRecords),contacts=structuredClone(partnerContacts);
 const before=JSON.stringify({records,contacts});
 assert.equal(applyBalkanSolarBuyers(records,contacts).added,0);
 assert.equal(JSON.stringify({records,contacts}),before);
 const old={id:'hep',company:'HEP — Hrvatska elektroprivreda',status:'Engaged',outreachPriority:{level:'hold'},outreachDraft:'retain',history:[{result:'retain'}]};
 const card={name:'Existing contact',email:'keep@example.test',reoon:{status:'safe'}};
 const existingRows=[old],existingCards={hep:[card]};
 applyBalkanSolarBuyers(existingRows,existingCards);
 assert.equal(existingRows[0],old);assert.equal(existingCards.hep[0],card);
 assert.equal(old.outreachPriority.level,'hold');assert.equal(old.outreachDraft,'retain');
 assert.deepEqual(old.history,[{result:'retain'}]);assert.equal(card.reoon.status,'safe');
});

const source=await readFile(new URL('../../../platform-shell/shared/js/platform-app.js',import.meta.url),'utf8');
function viewContext(){
 const saved=new Map([
  ['oplatform:/investors-jv:column-order',JSON.stringify([17,10,0,1,2,3,4,5,6,7,8,9,11,12,13,14,15,16])],
  ['oplatform:/investors-jv:visible-columns','[0,10,17]'],
  ['oplatform:/investors-jv:column-widths','{"0":330,"17":210}'],
  ['oplatform:/investors-jv:sidebar-state','{"search":"keep","sector":"Solar PV"}'],
  ['oplatform:/investors-jv:detail-workflow','{"old":{"outreachDraft":"keep"}}']
 ]);
 const localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
 const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL,localStorage});
 vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.Pipeline=PipelineView;ColumnManager=class{};ColumnOrderController=class{};ColumnSettings=class{};PaginationController=class{};',context);
 return {Pipeline:context.Pipeline,saved,localStorage};
}

test('priority styling follows record IDs, not row order, star, sector or JEV score',()=>{
 const {Pipeline,saved}=viewContext(),before=JSON.stringify([...saved]);
 const view=Object.create(Pipeline.prototype);view.path='/investors-jv';
 for(const batch of [...balkanSolarBuyers].reverse()){
  const record=partnerRecords.find(row=>row.id===batch.id),row={id:batch.id,source:record};
  const attributes=view.rowAttributes(row);
  assert.match(attributes,new RegExp(`data-pipeline-record="${batch.id}"`));
  assert.equal(attributes.includes('outreach-priority-row'),record.outreachPriority?.level==='priority');
 }
 assert.match(view.rowAttributes({id:'test',outreachPriority:{level:'priority',reason:'<script>"'}}),/&lt;script&gt;&quot;/);
 assert.doesNotMatch(view.rowAttributes({id:'old',jevVote:'Go ahead'}),/outreach-priority-row/);
 view.path='/wind-projects';
 assert.doesNotMatch(view.rowAttributes({id:'test',source:{outreachPriority:{level:'priority'}}}),/outreach-priority-row/);
 assert.equal(JSON.stringify([...saved]),before);
});

test('actual table render includes all priority rows and legend without writing saved layout',()=>{
 const {Pipeline,saved,localStorage}=viewContext(),before=JSON.stringify([...saved]);
 migrateOriginCountryColumns(localStorage);
 const rows=balkanSolarBuyers.map(batch=>({id:batch.id,partner:batch.company,source:partnerRecords.find(row=>row.id===batch.id)}));
 const table={addEventListener(){}},root={innerHTML:'',querySelector:selector=>selector==='table'?table:null,querySelectorAll:()=>[]};
 const view=Object.create(Pipeline.prototype);
 Object.assign(view,{path:'/investors-jv',root,rows,sidebar:{ordered:rows=>rows,filtered:()=>rows,starred:new Set()},workspace:{entity:'Partners'},mode:'table',page:1,pageSize:50,opportunities:{}});
 view.columnOrder=Array.from({length:view.columns().length},(_,index)=>index);
 view.render();
 const priorityCount=rows.filter(row=>row.source.outreachPriority?.level==='priority').length;
 assert.equal((root.innerHTML.match(/class="outreach-priority-row"/g)||[]).length,priorityCount);
 assert.ok(root.innerHTML.includes(`Light yellow: priority contact (${priorityCount} matching companies)`));
 assert.match(root.innerHTML,/data-pipeline-record="hep" class="outreach-priority-row"/);
 assert.equal(JSON.stringify([...saved]),before);
 const fresh=Object.create(Pipeline.prototype);fresh.path='/investors-jv';
 assert.match(fresh.rowAttributes(rows[0]),/outreach-priority-row/);
});

test('very pale yellow covers odd/even rows, hover and sticky Open cells without new columns',async()=>{
 const css=await readFile(new URL('../../../platform-shell/shared/css/tables.css',import.meta.url),'utf8');
 assert.match(css,/tr\.outreach-priority-row>td\{background:#fffdf0\}/);
 assert.match(css,/tr\.outreach-priority-row:hover>td\{background:#fff9e4\}/);
 assert.ok(!css.includes('!important'));
 const server=await readFile(new URL('../../../server.mjs',import.meta.url),'utf8');
 assert.ok(server.includes("['/data/balkan-solar-buyers.js','modules/investors-jv/data/balkan-solar-buyers.js']"));
});
