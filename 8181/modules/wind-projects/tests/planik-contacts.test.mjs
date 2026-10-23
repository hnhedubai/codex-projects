import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import {projects, projectRegistry} from '../data/source.js';

const planik = projects.find(project => project.id === 'planik-bileca-hybrid');
const dataSource = await readFile(new URL('../data/source.js',import.meta.url),'utf8');
const enrichmentStart = dataSource.indexOf('// Planik research is additive:');
const enrichmentEnd = dataSource.indexOf('export const diligence = [',enrichmentStart);
assert.ok(enrichmentStart>0&&enrichmentEnd>enrichmentStart);
// Evaluate the retained pre-enrichment imports independently, rather than
// trusting only the new contact counts or their preserved snapshots.
const importedSource = dataSource.slice(0,enrichmentStart)+dataSource.slice(enrichmentEnd);
const beforeEnrichment = await import('data:text/javascript;base64,'+Buffer.from(importedSource).toString('base64'));
const appSource = await readFile(new URL('../../../platform-shell/shared/js/platform-app.js', import.meta.url), 'utf8');
const context = vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL});
vm.runInContext(appSource.replace(/export class /g,'class ') + '\nglobalThis.ContactApp = OpportunityPlatformApp;', context);
const app = Object.create(context.ContactApp.prototype);
app.detailRecordId = planik.id;
app.windWorkflow = () => ({contactsAdded:[{name:'Local saved contact',role:'Existing local note',email:'local@example.com'}]});

test('enrichment preserves every original contact field/source/history and does not alter other projects',()=>{
 const original=beforeEnrichment.projects.find(project=>project.id===planik.id);
 assert.deepEqual(projects.filter(project=>project.id!==planik.id),beforeEnrichment.projects.filter(project=>project.id!==planik.id));
 for(const contact of original.contacts){
  const saved=planik.contacts.find(item=>item.name===contact.name);
  assert.ok(saved,contact.name);
  const withoutRoutingAudit = value => {const {corporateRoutes,corporateRouteStatus,corporateRouteAuditedAt,...originalFields}=value;return originalFields;};
  assert.deepEqual(withoutRoutingAudit(saved.originalImportedRecord||saved),withoutRoutingAudit(contact));
 }
 for(const entry of original.sources)assert.ok(planik.sources.some(item=>JSON.stringify(item)===JSON.stringify(entry)),entry.url);
 assert.deepEqual(planik.history.slice(0,original.history.length),original.history);
 assert.deepEqual(planik.financials,original.financials);
 assert.deepEqual(planik.originalImportedResearch.gaps,original.gaps);
});

test('Planik retains all 12 original routes and adds distinct researched contacts', () => {
 const originals = ['B&B Sunce Vjetar d.o.o.','Nedeljko Babić','Ljubiša Bošković','BIG Energia Holdings / BIG Shopping Centers / Mega Or','Republika Srpska Concessions Commission','Ministry of Energy and Mining, Republika Srpska','NOSBiH','Elektroprenos BiH','DERK / SERC','Municipality of Bileća','Ministry of Spatial Planning, Construction and Ecology, Republika Srpska','Montenegro Ministry of Ecology, Spatial Planning and Urbanism'];
 assert.equal(planik.contacts.length,29);
 for(const name of originals) assert.ok(planik.contacts.some(contact=>contact.name===name),name);
 assert.equal(new Set(planik.contacts.map(contact=>contact.name.normalize('NFKC').toLowerCase())).size,29);
 assert.equal(projectRegistry.count,projects.length);
 for(const contact of planik.contacts.filter(contact=>contact.research)) {
  assert.ok(contact.research.projectConnection,contact.name);
  assert.ok(contact.research.findings.length,contact.name);
  assert.ok(contact.research.caveats.length,contact.name);
  assert.equal(contact.research.asOf,'2026-10-21');
 }
});

test('dated ownership correction preserves the previous descriptions', () => {
 const babic = planik.contacts.find(contact=>contact.name==='Nedeljko Babić');
 assert.equal(babic.originalImportedRecord.title,'Director; reported current owner');
 assert.match(babic.title,/Registered B&B member in January 2025/);
 assert.match(planik.originalImportedResearch.summary,/earlier consortium reporting/);
 assert.match(planik.summary,/Miranda Berendika/);
 assert.match(planik.summary,/does not disclose ownership percentages/);
 assert.ok(planik.sources.some(item=>item.url==='https://online.slglasnik.org/sr/oglasi/018-2025/pdf/lat'));
 assert.ok(babic.phoneDetails.some(item=>item.number==='+387 61 789 536'&&/not confirmed personal/.test(item.type)));
});

test('cards show research, typed multiple emails, caveats and original provenance', () => {
 const contact = planik.contacts.find(item=>item.name==='Ljubiša Bošković');
 const html = app.renderContactCard(contact);
 for(const text of ['About this contact','Project connection','Decision relevance','Research findings','Uncertainties / verification gaps','Suggested next action','Original imported record','Business email','Generic company route','2018-11-18','ljubisa.boskovic@sistem-mne.com','info@sistem-mne.com']) assert.ok(html.includes(text),text);
 assert.ok(html.includes('mailto:ljubisa.boskovic@sistem-mne.com'));
 assert.ok(html.includes('mailto:info@sistem-mne.com'));
 assert.equal(app.contactEmailRoutes(contact).length,2);
});

test('candidate and historical addresses stay visible without direct email actions or primary-recipient status', () => {
 for(const name of ['Marko Laco','Shahar Gober','Krisztina Holló','Nadav Hemo','Tomer Nir']) {
  const contact = planik.contacts.find(item=>item.name===name);
  assert.equal(contact.email,'',name);
  const html = app.renderContactCard(contact);
  for(const route of contact.emails.filter(item=>/Candidate|Historical/.test(item.type))) {
   assert.ok(html.includes(route.email),name);
   assert.ok(!html.includes(`mailto:${route.email}`),name);
  }
 }
});

test('legacy/local contacts display and empty LinkedIn does not link to localhost', () => {
 const html = app.renderContactsPanel(planik);
 assert.ok(html.includes('Local saved contact'));
 assert.ok(html.includes('Existing local note'));
 assert.ok(html.includes('30 contacts and routes'));
 const legacy = app.renderContactCard({name:'Legacy',email:'legacy@example.com',phone:'+1 555 0100',notes:'Preserve this note'});
 assert.ok(legacy.includes('mailto:legacy@example.com'));
 assert.ok(legacy.includes('+1 555 0100'));
 assert.ok(legacy.includes('Preserve this note'));
 assert.ok(legacy.includes('LinkedIn not recorded'));
 assert.ok(!legacy.includes('href="http://localhost:8181/"'));
});

test('research, sources and imported records are escaped; unsafe URLs are not executable', () => {
 const html = app.renderContactCard({name:'<img src=x onerror=alert(1)>',source:'javascript:alert(1)',linkedin:'javascript:alert(2)',email:'bad" onclick="alert(3)@example.com',research:{findings:[{text:'<script>alert(1)</script>',source:'javascript:alert(4)'}],caveats:['<b>unsafe</b>']}});
 assert.ok(!html.includes('<script>'));
 assert.ok(!html.includes('<img '));
 assert.ok(!html.includes('href="javascript:'));
 assert.ok(!html.includes('href="mailto:bad'));
 assert.ok(html.includes('&lt;script&gt;'));
});
