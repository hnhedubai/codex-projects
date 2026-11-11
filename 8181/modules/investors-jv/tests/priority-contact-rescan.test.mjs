import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {partnerRecords,partnerContacts,partnerProjects,priorityContactRescanAudit} from '../data/source.js';
import {priorityContactRescan,priorityContactRun,applyPriorityContactRescan} from '../data/priority-contact-rescan.js';
import {collectPublishedEmails} from '../../../platform-shell/server/reoon.mjs';

test('18 reviewed priority companies gain 52 source-backed contacts, without new companies or fake safe flags',()=>{
 assert.equal(partnerRecords.length,150);assert.equal(priorityContactRescanAudit.companies,18);
 assert.equal(priorityContactRescanAudit.contactsAdded,52);assert.equal(priorityContactRescanAudit.contactsReviewed,79);
 assert.equal(Object.values(partnerContacts).flat().length,382);
 assert.deepEqual(new Set(priorityContactRescan.map(row=>row.id)),new Set(partnerRecords.filter(row=>row.outreachPriority?.level==='priority').map(row=>row.id)));
 for(const batch of priorityContactRescan){
  const cards=partnerContacts[batch.id];
  assert.equal(new Set(cards.map(card=>card.name)).size,cards.length);
  assert.ok(partnerProjects.find(row=>row.id===batch.id).contacts.length===cards.length);
  for(const person of batch.people){
   const card=cards.find(card=>card.name===person.name);assert.ok(card,person.name);
   assert.ok(card.title&&card.source&&card.research.decisionRelevance);
   assert.ok(card.researchHistory.some(run=>run.runId===priorityContactRun.runId));
   assert.equal(card.reoon,undefined);assert.equal(card.verified,undefined);
   assert.ok(card.emails.every(item=>item.type==='Published individual business email'&&item.source));
   assert.ok(card.corporateRoutes.every(item=>item.type==='Shared corporate route'));
  }
 }
});

test('replay is idempotent and preserves every existing value, negative verification and outreach history',()=>{
 const records=structuredClone(partnerRecords),contacts=structuredClone(partnerContacts),before=JSON.stringify({records,contacts});
 assert.equal(applyPriorityContactRescan(records,contacts).contactsAdded,0);
 assert.equal(JSON.stringify({records,contacts}),before);
 const old={id:'hep',company:'HEP',status:'Engaged',outreachDraft:'retain',history:[{blocked:true}],jvote:'Hold'};
 const card={name:'Dražen Lovrić',title:'Saved title',email:'keep@example.test',source:'https://example.test/original',status:'Do not contact',reoon:{status:'invalid'},research:{findings:[],caveats:[]}};
 const prior=structuredClone(card);applyPriorityContactRescan([old],{hep:[card]});
 for(const field of ['name','title','email','source','status','reoon'])assert.deepEqual(card[field],prior[field]);
 assert.equal(old.outreachDraft,'retain');assert.deepEqual(old.history,[{blocked:true}]);assert.equal(old.jvote,'Hold');assert.equal(old.status,'Engaged');
});

test('primary email attribution remains separate from shared routes, forms, historical contacts and current role claims',()=>{
 const rp=partnerContacts['rp-global'];
 assert.equal(rp.find(c=>c.name==='Dominik Vidovic').email,'d.vidovic@rp-global.com');
 assert.match(rp.find(c=>c.name==='Bojan Reščec').research.caveats.join(' '),/2020/);
 assert.equal(partnerContacts['dewa-international'].flatMap(c=>c.emails).length,0);
 assert.match(partnerContacts['dewa-international'][1].title,/Chairman/);
 assert.ok(partnerContacts['kelag-international'].every(c=>!c.email));
 const kapellos=partnerContacts['helleniq-renewables'].find(c=>c.name==='Sotiris Kapellos');assert.match(kapellos.title,/CEO/);
 const routes=collectPublishedEmails(partnerProjects.filter(row=>priorityContactRescan.some(batch=>batch.id===row.id)));
 assert.equal(routes.size,34);
 for(const blocked of ['yoni@econergytech.com','hr@elementsgreen.com','press@enna.hr','communications@kelag.com'])assert.ok(!routes.has(blocked));
 assert.ok(!JSON.stringify(priorityContactRescan).includes('martins.berzins@enery.energy')); // Published lookup rejected: current role not corroborated.
});

test('source and server expose one shared rescan without touching layout or send logic',async()=>{
 const source=await readFile(new URL('../data/source.js',import.meta.url),'utf8');
 const server=await readFile(new URL('../../../server.mjs',import.meta.url),'utf8');
 assert.match(source,/applyPriorityContactRescan\(partnerRecords,partnerContacts\)/);
 assert.match(server,/\/data\/priority-contact-rescan\.js/);
 const helper=await readFile(new URL('../data/priority-contact-rescan.js',import.meta.url),'utf8');
 assert.ok(!/localStorage|allowCatchAll|allowDisposable|\.send\(/.test(helper));
});
