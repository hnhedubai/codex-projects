import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import {partnerContacts,partnerProjects,partnerRecords,partnerRegistry,contactResearchAudit} from '../data/source.js';
import {applyPartnerContactResearch,partnerContactResearch} from '../data/contact-research.js';
const source=await readFile(new URL('../data/source.js',import.meta.url),'utf8');
const base=source.slice(source.indexOf('export const partnerRecords='),source.indexOf('export const contactResearchAudit='));
const baseline=vm.createContext({});
vm.runInContext(base.replace(/export const /g,'const ')+'\nglobalThis.old={partnerRecords,partnerContacts};',baseline);
const original=JSON.parse(JSON.stringify(baseline.old));
const appSource=await readFile(new URL('../../../platform-shell/shared/js/platform-app.js',import.meta.url),'utf8');
const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL});
vm.runInContext(appSource.replace(/export class /g,'class ')+'\nglobalThis.App=OpportunityPlatformApp;',context);
const app=Object.create(context.App.prototype);
const recordsSource=await readFile(new URL('../../../platform-shell/data/records.js',import.meta.url),'utf8');
const partnerRowsCode=recordsSource.slice(recordsSource.indexOf('export const partnerRows ='),recordsSource.indexOf('const germanHydrogenZones'));
const rowsContext=vm.createContext({partnerRecords,partnerContacts,URL});
vm.runInContext(partnerRowsCode.replace('export const','const')+'\nglobalThis.rows=partnerRows;',rowsContext);

test('partner detail views receive full profiles, evidence URLs, contacts and limitations',()=>{
 assert.equal(rowsContext.rows.length,50);
 for(const row of rowsContext.rows){
  const saved=partnerRecords.find(item=>item.id===row.id);
  assert.equal(row.source.summary,saved.summary);
  assert.equal(row.source.next,saved.next);
  assert.equal(row.source.partnership,saved.intent);
  assert.equal(row.source.status,saved.status);
  assert.equal(row.source.contacts.length,partnerContacts[row.id].length);
  assert.ok(row.source.sources.every(item=>item.url&&item.title));
  assert.deepEqual(Array.from(row.source.sources,item=>item.url),saved.sources);
  assert.ok(row.source.gaps.includes(saved.notes));
 }
});

test('all 25 companies have research checkpoints; relationship fields unchanged',()=>{
 assert.equal(partnerRegistry.count,50);
 assert.equal(Object.keys(partnerContactResearch).length,25);
 for(const before of original.partnerRecords){
  const after=partnerRecords.find(item=>item.id===before.id);
  for(const [field,value] of Object.entries(before))if(field!=='sources')assert.deepEqual(after[field],value,`${before.id}.${field}`);
  assert.ok([3,4].includes(after.contactResearch.rounds));
  for(const url of before.sources)assert.ok(after.sources.includes(url));
 }
});

test('five additional partners retain mandate limits, corporate routing and provider caveats',()=>{
 const added=['navaris','eurowind-energy','vsb-group','wpd','eef'];
 assert.equal(new Set(partnerRegistry.ids).size,50);
 assert.equal(added.flatMap(id=>partnerContacts[id]).length,16);
 for(const id of added){
  const record=partnerRecords.find(item=>item.id===id);
  assert.ok(record);
  assert.match(record.country,/Germany/);
  assert.equal(record.latestEvidence,'2026-10-22');
  assert.equal(record.status,'Open — actively seeking investment/JV');
  assert.deepEqual(record.contactResearch.providers,['ChatGPT web search','Exa','Firecrawl — official websites']);
  for(const contact of partnerProjects.find(item=>item.id===id).contacts){
   assert.ok(contact.corporateRoutes.length,`${id}/${contact.name}`);
   assert.ok(contact.phones.length,`${id}/${contact.name}`);
   assert.match(contact.research.verification,/no email verification or outreach/);
   for(const email of contact.emails)assert.ok(email.source);
  }
 }
 assert.equal(partnerProjects.find(item=>item.id==='navaris').contacts[0].association,'shared');
 const eef=partnerProjects.find(item=>item.id==='eef');
 const florian=eef.contacts.find(item=>item.name==='Florian Rosenbusch');
 assert.equal(florian.email,'florian.rosenbusch@eef.de');
 assert.match(app.renderContactCard(florian),/mailto:info@eef.de/);
 assert.ok(florian.research.caveats.some(item=>item.includes('not a successful live')));
 const media=partnerContacts['eurowind-energy'].find(item=>item.name==='Armin Liese');
 assert.match(media.role,/Media\/referral only/);
});
test('all original contacts/emails survive; no duplicate names; enrichment idempotent',()=>{
 for(const [id,contacts] of Object.entries(original.partnerContacts))for(const before of contacts){
  const after=partnerContacts[id].find(item=>item.name===before.name);
  assert.ok(after,`${id}/${before.name}`);
  assert.deepEqual(after.originalImportedRecord,before);
  if(before.email)assert.equal(after.email,before.email);
 }
 for(const contacts of Object.values(partnerContacts))assert.equal(new Set(contacts.map(item=>item.name.toLowerCase())).size,contacts.length);
 const records=structuredClone(original.partnerRecords),contacts=structuredClone(original.partnerContacts);
 applyPartnerContactResearch(records,contacts);
 const once=JSON.stringify({records,contacts});
 applyPartnerContactResearch(records,contacts);
 assert.equal(JSON.stringify({records,contacts}),once);
});

test('Balkan prospects have 24 sourced contacts without falsely claiming open external mandates',()=>{
 const ids=['alcazar-energy','fortis-energy','windey-energy','cwp-europe','rezolv-energy'];
 assert.equal(ids.flatMap(id=>partnerContacts[id]).length,24);
 for(const id of ids){
  const record=partnerRecords.find(item=>item.id===id);
  assert.equal(record.status,'Potential fit — intent identified, availability unconfirmed');
  assert.equal(record.contactResearch.asOf,'2026-10-22');
  for(const contact of partnerContacts[id]){
   assert.ok(contact.source);assert.ok(contact.corporateRoutes.length);
   for(const route of contact.emails)assert.ok(route.source);
  }
 }
 assert.equal(partnerContacts['alcazar-energy'].find(item=>item.name==='Tim Sheahan').email,'tsheahan@alcazarenergy.com');
 assert.match(partnerRecords.find(item=>item.id==='rezolv-energy').notes,/do not extend to Bosnia/);
});
test('rich provenance survives normalization and distinct corporate/person routes render',()=>{
 assert.equal(contactResearchAudit.contacts,partnerProjects.flatMap(item=>item.contacts).length);
 for(const project of partnerProjects)for(const contact of project.contacts){
  assert.ok(contact.research,`${project.id}/${contact.name}`);
  assert.ok(contact.corporateRouteStatus);
  for(const route of [...(contact.corporateRoutes||[]),...(contact.emails||[])])assert.ok(route.source,`${contact.name}/${route.email}`);
 }
 const mercury=partnerProjects.find(item=>item.id==='mercury-renewables').contacts.find(item=>item.name==='John Duffy');
 const html=app.renderContactCard(mercury);
 assert.match(html,/mailto:jduffy@mercuryrenewables.ie/);
 assert.match(html,/mailto:info@mercuryrenewables.ie/);
 assert.match(html,/2022/);
});
test('historical leadership and unresolved identities are never promoted to current C-level',()=>{
 assert.match(partnerContacts['pc1-group'].find(item=>item.name==='Vũ Dương').status,/Historical/);
 assert.ok(partnerContacts['pc1-group'].find(item=>item.name==='Lê Văn Dũng'));
 assert.ok(partnerContacts['pc1-group'].find(item=>item.name==='Trịnh Khánh Linh'));
 assert.match(partnerContacts['green-genius'].find(item=>item.name==='Rokas Bancevičius').status,/Historical/);
 assert.match(partnerContacts['windon-ridgeblade'].find(item=>item.name==='Christoffer Johansson').title,/Chief Executive/);
 const star=partnerContacts['star-energy-sea'].find(item=>item.name==='Le Thi Ngoc Anh');
 assert.match(star.title,/unconfirmed/);
 assert.equal(star.email,'');
 assert.equal(star.corporateRoutes.length,0);
 assert.match(app.renderContactCard(star),/Unresolved/);
});
