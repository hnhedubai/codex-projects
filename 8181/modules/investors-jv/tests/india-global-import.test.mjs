import test from 'node:test';
import assert from 'node:assert/strict';
import {indiaGlobalResearch,applyIndiaGlobalResearch} from '../data/india-global-research.js';
import {partnerRecords,partnerContacts,partnerRegistry,indiaGlobalResearchAudit,globalSolarBuyersAudit,balkanSolarBuyersAudit} from '../data/source.js';
test('13 India-origin companies and 65 sourced cards are imported without duplicate IDs',()=>{
 assert.equal(indiaGlobalResearch.length,13);
 assert.equal(indiaGlobalResearchAudit.added,13);
 assert.equal(indiaGlobalResearchAudit.contactsAdded,65);
 assert.equal(partnerRegistry.count,136+globalSolarBuyersAudit.added+balkanSolarBuyersAudit.added);
 assert.equal(new Set(partnerRecords.map(row=>row.id)).size,partnerRecords.length);
 for(const batch of indiaGlobalResearch){
  const row=partnerRecords.find(item=>item.id===batch.id);
  assert.equal(row.originCountry,'India');
  assert.ok(row.countryFilterTags.includes('India'));
  assert.ok(row.sources.length);
  assert.equal(row.jvote,undefined);
  assert.ok(partnerContacts[row.id].length);
  for(const card of partnerContacts[row.id]){
   assert.ok(card.name&&card.title&&card.source);
   assert.ok(card.corporateRoutes.length);
   assert.ok(card.corporateRoutes.every(route=>route.email&&route.source&&route.scope));
   assert.ok(card.emails.every(email=>email.source));
   assert.equal(card.reoon,undefined);
  }
 }
});
test('reapplying is idempotent and leaves all existing records and cards untouched',()=>{
 const records=structuredClone(partnerRecords),contacts=structuredClone(partnerContacts);
 const before=JSON.stringify({records,contacts});
 assert.equal(applyIndiaGlobalResearch(records,contacts).added,0);
 assert.equal(JSON.stringify({records,contacts}),before);
 const unrelated={id:'other',company:'Other',status:'Engaged',outreach:{draft:'keep'}};
 const cards={other:[{name:'Existing',email:'existing@example.test'}]};
 const original=JSON.stringify({unrelated,cards});
 applyIndiaGlobalResearch([unrelated],cards);
 assert.equal(JSON.stringify({unrelated,cards:{other:cards.other}}),original);
});
test('headquarters, shared platforms and current appointments are not misrepresented',()=>{
 const row=id=>partnerRecords.find(item=>item.id===id);
 assert.equal(row('hero-future-energies').headquartersCountry,'United Kingdom');
 assert.equal(row('adani-renewables-australia').headquartersCountry,'Australia');
 assert.equal(row('husk-power-systems').headquartersCountry,'United States');
 assert.match(row('rj-corp').summary,/same joint platform/);
 assert.match(row('husk-power-systems').summary,/fit is limited/);
 assert.ok(partnerContacts['sunsource-energy'].some(c=>c.name==='Santanu Guha'));
 assert.ok(partnerContacts['tata-power'].some(c=>c.name==='Sanjay Banga'));
 assert.ok(!partnerContacts['tata-power'].some(c=>c.name==='Deepesh Nanda'));
});

