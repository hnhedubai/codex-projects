import test from 'node:test';
import assert from 'node:assert/strict';
import {globalSolarBuyers,applyGlobalSolarBuyers} from '../data/global-solar-buyers.js';
import {partnerRecords,partnerContacts,partnerRegistry,globalSolarBuyersAudit,balkanSolarBuyersAudit} from '../data/source.js';

test('six solar buyers and seventeen source-backed contacts appear in the shared registry',()=>{
 assert.equal(globalSolarBuyersAudit.added,6);
 assert.equal(globalSolarBuyersAudit.contactsAdded,17);
 assert.equal(partnerRegistry.count,142+balkanSolarBuyersAudit.added);
 assert.equal(new Set(partnerRegistry.ids).size,partnerRegistry.count);
 for(const company of globalSolarBuyers){
  const record=partnerRecords.find(row=>row.id===company.id);
  assert.ok(record.sectors.includes('Solar PV'));
  assert.ok(record.sources.every(url=>url.startsWith('https://')));
  assert.equal(record.jvote,undefined);
  assert.equal(partnerContacts[company.id].filter(card=>card.isPrimary).length,1);
  for(const card of partnerContacts[company.id]){
   assert.ok(card.name&&card.title&&card.source&&card.research.decisionRelevance);
   assert.ok(card.links.some(link=>link.title==='Project / partnership enquiry'));
   assert.equal(card.reoon,undefined);
   assert.ok(card.emails.every(item=>item.source&&item.type==='Published individual business email'));
   assert.ok(card.corporateRoutes.every(item=>item.type==='Shared corporate route'));
  }
 }
});

test('repeat import is idempotent and preserves existing rows, contacts and relationship history',()=>{
 const records=structuredClone(partnerRecords),contacts=structuredClone(partnerContacts);
 const before=JSON.stringify({records,contacts});
 assert.equal(applyGlobalSolarBuyers(records,contacts).added,0);
 assert.equal(JSON.stringify({records,contacts}),before);
 const existing={id:'other',company:'Other',status:'Engaged',outreach:{draft:'keep'},history:[{sentAt:'keep'}]};
 const oldCard={name:'Existing Contact',email:'existing@example.test'};
 const rows=[existing],cards={other:[oldCard]};
 applyGlobalSolarBuyers(rows,cards);
 assert.equal(rows[0],existing);assert.equal(cards.other[0],oldCard);
 assert.equal(existing.outreach.draft,'keep');assert.equal(existing.history[0].sentAt,'keep');
});

test('geography, source dates, ownership and uncertainty are not inflated',()=>{
 const row=id=>partnerRecords.find(record=>record.id===id);
 assert.match(row('ibv-energy-partners').country,/United States only/);
 assert.match(row('ibv-energy-partners').summary,/Separate operating entity/);
 assert.equal(row('energia-solar-aplicada').intentStrength,'Moderate');
 assert.equal(row('energia-solar-aplicada').latestEvidence,'2023-09-15');
 assert.equal(row('encavis').latestEvidence,'');
 assert.equal(row('sonnedix').originCountry,'Unknown');
 assert.equal(row('lydian-energy').intentStrength,'Moderate');
 assert.match(row('adon-renewables').summary,/Europe is not explicitly confirmed/);
 assert.ok(!JSON.stringify(globalSolarBuyers).includes('noreply@envato.com'));
});

test('named mailboxes, shared routes and form-only contacts remain distinct',()=>{
 const cards=globalSolarBuyers.flatMap(company=>partnerContacts[company.id]);
 assert.equal(cards.filter(card=>card.email).length,4);
 assert.ok(partnerContacts.sonnedix.every(card=>card.email===''&&card.corporateRoutes.length===0));
 const investment=partnerContacts.encavis.find(card=>card.name==='Quirin Busse');
 assert.equal(investment.email,'quirin.busse@encavis.com');
 assert.ok(investment.corporateRoutes.some(route=>route.email==='newprojects@encavis.com'));
 assert.ok(!cards.some(card=>card.email&&card.corporateRoutes.some(route=>route.email===card.email)));
});
