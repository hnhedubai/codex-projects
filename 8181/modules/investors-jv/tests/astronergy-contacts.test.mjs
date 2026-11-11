import test from 'node:test';
import assert from 'node:assert/strict';
import {partnerContacts,partnerProjects} from '../data/source.js';
import {applyChinaLeadership} from '../data/china-solar-research.js';
import {collectPublishedEmails} from '../../../platform-shell/server/reoon.mjs';

test('Astronergy has published direct routes, separate global sales, and sourced LinkedIn profiles',()=>{
 const cards=partnerContacts['astronergy-europe'];
 for(const name of ['Chuan Lu','Samuel Zhang','Timo Franz','Lin He','Marina Neskreptova','Ornella Forte','Hanyi (Isabella) Ni','Paul Xinhua Ji'])assert.ok(cards.some(c=>c.name===name),name);
 const direct=cards.flatMap(c=>(c.emails||[]).filter(e=>e.type==='Published individual business email').map(e=>({name:c.name,...e})));
 assert.deepEqual(direct.map(c=>c.email).sort(),['isabella.ni@astronergy.com','timo.franz@astronergy.com']);
 assert.match(direct.find(c=>c.name==='Timo Franz').source,/vergabehero/);assert.match(direct.find(c=>c.name==='Hanyi (Isabella) Ni').source,/sm-mg2025.pdf/);
 for(const name of ['Samuel Zhang','Timo Franz','Lin He','Marina Neskreptova','Ornella Forte','Hanyi (Isabella) Ni'])assert.match(cards.find(c=>c.name===name).linkedin,/^https:\/\/www.linkedin.com\/in\//);
 for(const c of cards.filter(c=>c.name!=='Astronergy Europe team'))assert.ok(c.corporateRoutes?.some(r=>r.email==='sales@astronergy.com'));
 const project=partnerProjects.find(p=>p.id==='astronergy-europe');assert.ok(collectPublishedEmails([project]).has('timo.franz@astronergy.com'));assert.ok(collectPublishedEmails([project]).has('isabella.ni@astronergy.com'));
});
test('inferred emails and related-entity people are not added to Astronergy send routes',()=>{
 const cards=partnerContacts['astronergy-europe'];const raw=JSON.stringify(cards);
 for(const email of ['samuel.zhang@astronergy.com','marina.neskreptova@astronergy.com','ornella.forte@astronergy.com'])assert.ok(!raw.includes(email));
 for(const name of ['Florin Catalin Mutu','Chao Xu','Nikolaos Karagiovanidis'])assert.ok(!cards.some(c=>c.name===name));
 const before=JSON.stringify(cards);applyChinaLeadership(partnerContacts);assert.equal(JSON.stringify(partnerContacts['astronergy-europe']),before);
});
