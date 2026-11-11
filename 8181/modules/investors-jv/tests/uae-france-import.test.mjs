import test from 'node:test';
import assert from 'node:assert/strict';
import {partnerRecords,partnerContacts,partnerRegistry,solarCountryResearchAudit,indiaGlobalResearchAudit,globalSolarBuyersAudit,balkanSolarBuyersAudit} from '../data/source.js';
import {solarCountryResearch,applySolarCountryResearch} from '../data/uae-france-solar-research.js';

test('50 research entries resolve to 25 UAE and 25 French companies with no additional duplicate IDs',()=>{
 assert.equal(solarCountryResearch.length,50);
 assert.deepEqual(solarCountryResearchAudit.cohorts,{UAE:25,France:25});
 assert.equal(solarCountryResearchAudit.added,48);
 assert.equal(solarCountryResearchAudit.existing,2);
 assert.equal(partnerRegistry.count,123+indiaGlobalResearchAudit.added+globalSolarBuyersAudit.added+balkanSolarBuyersAudit.added);
 assert.equal(new Set(partnerRecords.map(r=>r.id)).size,partnerRecords.length);
 for(const item of solarCountryResearch){
  const row=partnerRecords.find(r=>r.id===item.id);
  assert.ok(row);assert.ok(row.sectors.includes('Solar PV'));
  assert.ok(row.sources.includes(item.url));assert.ok(row.countryFilterTags.includes(item.cohort));
  assert.ok(row.solarCountryResearch.some(r=>r.url===item.url&&r.ownership===item.ownership));
  assert.equal(row.solarCountryResearch[0].contactVerification,'Not performed');
 }
});

test('import is idempotent and never creates contacts, verification results or JVotes',()=>{
 const records=structuredClone(partnerRecords),contacts=structuredClone(partnerContacts);
 const before=JSON.stringify({records,contacts});
 assert.equal(applySolarCountryResearch(records,contacts).added,0);
 assert.equal(JSON.stringify({records,contacts}),before);
 // Check the importer in isolation, not contact cards added by later research passes.
 const initialRecords=[],initialContacts={};applySolarCountryResearch(initialRecords,initialContacts);
 for(const id of solarCountryResearchAudit.ids.filter(id=>!['alcazar-energy','qair'].includes(id))){
  assert.equal((initialContacts[id]||[]).length,0);
  assert.equal(partnerRecords.find(r=>r.id===id).jevVote,undefined);
 }
});

test('existing identity, relationship, market, origin, draft and contact data survive additive updates',()=>{
 const records=[{id:'saved-id',company:'Qair',status:'Engaged',intent:'Private conversation',country:'Keep existing markets',originCountry:'France',notes:'Keep private note',outreachDraft:'Keep draft',sectors:['Wind'],sources:['https://example.com/original']}];
 const contacts={'saved-id':[{name:'Saved person',email:'person@example.com',reoon:{status:'safe'}}]};
 const before=structuredClone({record:records[0],contacts});
 applySolarCountryResearch(records,contacts,[solarCountryResearch.find(r=>r.id==='qair')]);
 for(const key of ['id','status','intent','country','originCountry','outreachDraft'])assert.deepEqual(records[0][key],before.record[key]);
 assert.ok(records[0].notes.startsWith(before.record.notes));
 assert.ok(records[0].sources.includes('https://example.com/original'));
 assert.deepEqual(contacts,before.contacts);
 assert.deepEqual(records[0].sectors,['Wind','Solar PV']);
});

test('foreign ownership, evidence dates and weaker mandates are not relabelled as verified global openings',()=>{
 const find=id=>partnerRecords.find(r=>r.id===id);
 assert.equal(find('altaaqa-renewable-energy').originCountry,'Saudi Arabia');
 assert.equal(find('altaaqa-renewable-energy').headquartersCountry,'UAE');
 for(const id of ['enara','ds-mena','mashriq-energy','aldar-energy'])assert.equal(find(id).originCountry,'Unknown');
 for(const id of ['phanes-group','myra-investments','ema-power','aldar-energy'])assert.match(find(id).status,/Researching/);
 assert.equal(find('mexens').latestEvidence,'');
 assert.match(find('mexens').intent,/France, Spain and Germany/);
 assert.match(find('ze-energy').intent,/BESS evidence, not a solar purchase/);
 assert.match(find('tse').intent,/No overseas mandate/);
});
