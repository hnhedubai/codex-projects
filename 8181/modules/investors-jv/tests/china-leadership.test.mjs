import test from 'node:test';
import assert from 'node:assert/strict';
import {partnerRecords,partnerContacts} from '../data/source.js';
import {chinaSolarResearch,chinaLeadershipResearch,applyChinaLeadership} from '../data/china-solar-research.js';

test('Chinese-company contact pass covers all 25 records without dropping portfolio records',()=>{
 assert.ok(partnerRecords.length>=75,'retain the original portfolio while allowing later company additions');
 assert.equal(new Set(partnerRecords.map(row=>row.id)).size,partnerRecords.length);
 assert.equal(chinaSolarResearch.length,25);
 for(const record of chinaSolarResearch){
  const cards=partnerContacts[record.id];
  assert.ok(cards?.length,record.id);
  assert.equal(new Set(cards.map(card=>card.name.normalize('NFKC').toLowerCase())).size,cards.length,record.id);
  for(const card of cards){assert.ok(card.source);assert.ok(card.research?.rounds>=3,record.id);}
 }
});

test('leadership enrichment preserves existing cards and is idempotent',()=>{
 const contacts=structuredClone(partnerContacts),before=JSON.stringify(contacts);
 const audit=applyChinaLeadership(contacts);
 assert.equal(audit.added,0);
 assert.equal(JSON.stringify(contacts),before);
});

test('all published regional routes are retained separately from individual mailboxes',()=>{
 for(const batch of chinaLeadershipResearch){
  for(const person of batch.people){
   const card=partnerContacts[batch.id].find(card=>card.name===person.name);
   for(const email of [batch.route.email,...(batch.route.extraEmails||[])].filter(Boolean)){
    assert.ok(card.corporateRoutes.some(route=>route.email===email));
    assert.notEqual(card.email,email);
   }
   assert.equal(card.research.verification,batch.id==='astronergy-europe'&&person.emailSource?'Consult the saved Reoon Power result for current mailbox status; research is not verification.':'No Reoon check performed.');
  }
 }
});
