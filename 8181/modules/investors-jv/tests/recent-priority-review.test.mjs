import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {partnerRecords,partnerContacts,partnerRegistry,recentPriorityReviewAudit} from '../data/source.js';
import {applyRecentPriorityReview,priorityReviewCompanyIds,reviewedPriorityContacts,priorityReviewScope} from '../data/balkan-solar-buyers.js';
import {migrateOriginCountryColumns} from '../sectors.js';

test('the fixed three-day review covers 150 existing companies and highlights 9 intake plus 9 qualification routes',()=>{
 assert.equal(partnerRegistry.count,150);
 assert.equal(priorityReviewCompanyIds.length,150);
 assert.equal(new Set(priorityReviewCompanyIds).size,150);
 assert.equal(recentPriorityReviewAudit.reviewed,150);
 assert.equal(recentPriorityReviewAudit.highlighted,18);
 assert.equal(recentPriorityReviewAudit.publishedIntake,9);
 assert.equal(recentPriorityReviewAudit.qualification,9);
 assert.equal(recentPriorityReviewAudit.held,132);
 assert.equal(priorityReviewScope.from,'2026-10-23');assert.equal(priorityReviewScope.to,'2026-10-25');
 assert.equal(reviewedPriorityContacts.length,18);
 for(const record of partnerRecords){
  assert.equal(record.outreachPriorityReview.runId,priorityReviewScope.runId);
  assert.ok(record.outreachPriorityReview.reason);
  assert.ok(record.outreachPriorityReview.sourceUrls.length);
  if(record.outreachPriorityReview.decision==='hold')assert.equal(record.outreachPriority,undefined);
  else{
   assert.equal(record.outreachPriority.level,'priority');
   assert.ok(record.outreachPriority.reason&&record.outreachPriority.projectScope);
   assert.match(record.outreachPriority.basis,/not a JEV vote/);
  }
 }
});

test('priority remains an outreach judgement, not a changed relationship, mandate or verification result',()=>{
 const record=id=>partnerRecords.find(row=>row.id===id);
 assert.equal(record('fortis-energy').outreachPriority.type,'qualification');
 assert.match(record('fortis-energy').outreachPriority.reason,/not an invitation/);
 assert.match(record('alcazar-energy').outreachPriority.reason,/under appraisal/);
 assert.match(record('encavis').outreachPriority.reason,/not among the published core markets/);
 assert.match(record('ibvogt').outreachPriority.reason,/not a new project-intake invitation/);
 assert.notEqual(record('renalfa').status,'Open — actively seeking investment/JV');
 assert.equal(record('enery').outreachPriority.type,'published-intake');
 assert.match(record('enery').outreachPriority.reason,/does not establish acceptance/);
 for(const id of ['ibv-energy-partners','lydian-energy','das-solar','huasun','mercury-renewables','greentech','cleanmax','tata-power','sonnedix']){
  assert.equal(record(id).outreachPriority,undefined,id);
  assert.equal(record(id).outreachPriorityReview.decision,'hold');
 }
});

test('replaying the review is idempotent, does not duplicate history, and does not auto-review future additions',()=>{
 const rows=structuredClone(partnerRecords),cards=JSON.stringify(partnerContacts),before=JSON.stringify(rows);
 applyRecentPriorityReview(rows);assert.equal(JSON.stringify(rows),before);
 assert.equal(JSON.stringify(partnerContacts),cards);
 const future={id:'future-developer',company:'Future developer',intent:'Very strong global buying mandate',sources:['https://example.test/']};
 const untouched=JSON.stringify(future);applyRecentPriorityReview([future]);assert.equal(JSON.stringify(future),untouched);
 const fresh=structuredClone(partnerRecords.find(record=>record.id==='econergy'));
 delete fresh.outreachPriorityReview;delete fresh.outreachPriority;delete fresh.outreachPriorityHistory;
 fresh.history=[{result:'retain'}];fresh.outreachDraft='retain';fresh.status='Engaged — user conversation';fresh.jevVote='Hold';
 applyRecentPriorityReview([fresh]);
 assert.equal(fresh.status,'Engaged — user conversation');assert.equal(fresh.jevVote,'Hold');assert.equal(fresh.outreachDraft,'retain');
 assert.deepEqual(fresh.history,[{result:'retain'}]);assert.equal(fresh.outreachPriorityHistory.length,1);
});

test('held companies retain source limitations and are not claimed freshly verified',()=>{
 const record=partnerRecords.find(row=>row.id==='sany-group');
 assert.equal(record.outreachPriorityReview.decision,'hold');
 assert.equal(record.outreachPriorityReview.sourceCheckedAt,'');
 assert.deepEqual(record.outreachPriorityReview.providers,['Saved research review']);
 assert.match(record.outreachPriorityReview.validation,/no new live primary-source validation claimed/);
 const reviewed=partnerRecords.find(row=>row.id==='enery');
 assert.ok(reviewed.outreachPriorityReview.providers.includes('Firecrawl'));
 assert.equal(reviewed.outreachPriorityReview.reviewedAt,'2026-10-25');
 assert.notEqual(reviewed.latestEvidence,undefined); // Original source date is retained, not reset by a row highlight.
});

test('row highlights and explanatory legend do not rewrite layout, visibility, widths, filters or drafts',async()=>{
 const source=await readFile(new URL('../../../platform-shell/shared/js/platform-app.js',import.meta.url),'utf8');
 const prefix='oplatform:/investors-jv:',saved=new Map([
  [prefix+'column-order',JSON.stringify([17,10,0,1,2,3,4,5,6,7,8,9,11,12,13,14,15,16])],
  [prefix+'visible-columns','[0,10,17]'],[prefix+'column-widths','{"0":330,"17":210}'],
  [prefix+'sidebar-state','{"search":"Altaaqa","sector":"Solar PV"}'],[prefix+'detail-workflow','{"old":{"outreachDraft":"keep"}}']
 ]);
 const storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
 const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL,localStorage:storage});
 vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.Pipeline=PipelineView;',context);
 const view=Object.create(context.Pipeline.prototype);view.path='/investors-jv';
 const rows=partnerRecords.map(record=>({id:record.id,partner:record.company,source:record})),before=JSON.stringify([...saved]);
 migrateOriginCountryColumns(storage);
 assert.equal(rows.filter(row=>view.rowAttributes(row).includes('outreach-priority-row')).length,18);
 assert.match(view.priorityLegend(rows),/18 matching companies/);
 assert.match(view.priorityLegend(rows),/9 published intake; 9 qualification enquiries/);
 const fortis=rows.find(row=>row.id==='fortis-energy');assert.match(view.rowAttributes(fortis),/Priority — qualification enquiry/);
 assert.equal(JSON.stringify([...saved]),before);
 view.path='/listed-projects';assert.equal(view.priorityLegend(rows),'');assert.ok(!view.rowAttributes(fortis).includes('outreach-priority-row'));
});
