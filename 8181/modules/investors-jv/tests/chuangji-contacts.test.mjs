import test from 'node:test';
import assert from 'node:assert/strict';
import {partnerContacts} from '../data/source.js';
import {applyChinaLeadership} from '../data/china-solar-research.js';
test('Chuangji retains the sourced sales director and labels executive leads historical, not current CEO/CFO',()=>{
 const cards=partnerContacts['jiangsu-chuangji'];
 assert.equal(cards.filter(c=>c.name==='David Zheng').length,1);
 assert.match(cards.find(c=>c.name==='David Zheng').title,/Sales and Marketing/);
 for(const name of ['Shen Xingxiang (沈兴祥)','Zulia Zhu']){
  const card=cards.find(c=>c.name===name);assert.ok(card);assert.match(card.roleStatus,/Historical.*unconfirmed/);assert.match(card.title,/historical|unconfirmed/);assert.equal(card.email,'');assert.deepEqual(card.emails,[]);assert.equal(card.linkedin,'');
  assert.equal(card.research.asOf,'2026-10-26');assert.ok(card.research.caveats.some(s=>/unconfirmed|No current|No verified/.test(s)));
 }
 assert.ok(!JSON.stringify(cards).includes('zulia-zhu-1a549132'));
 const before=JSON.stringify(cards);applyChinaLeadership(partnerContacts);assert.equal(JSON.stringify(partnerContacts['jiangsu-chuangji']),before);
});
test('shared company mailbox is labelled historical and never attributed to an executive',()=>{
 const cards=partnerContacts['jiangsu-chuangji'];
 for(const card of cards.filter(c=>c.corporateRoutes?.some(r=>r.email==='info@sunlight-pv.group'))){
  const route=card.corporateRoutes.find(r=>r.email==='info@sunlight-pv.group');assert.equal(route.type,'Historical generic company route');assert.equal(route.source,'https://www.enfsolar.com/cj-energy');assert.notEqual(card.email,route.email);
 }
 assert.ok(cards.some(c=>c.research?.caveats?.some(s=>/does not prove company closure/.test(s))));
});
