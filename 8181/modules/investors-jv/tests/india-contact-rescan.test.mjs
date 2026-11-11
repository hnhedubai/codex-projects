
import test from 'node:test';
import assert from 'node:assert/strict';
import {indiaContactRescan,applyIndiaContactRescan} from '../data/india-global-research.js';
import {partnerRecords,partnerContacts,indiaContactRescanAudit,globalSolarBuyersAudit,balkanSolarBuyersAudit} from '../data/source.js';
test('all 13 India companies receive a dated rescan without adding companies',()=>{
 assert.equal(indiaContactRescan.length,13);assert.equal(indiaContactRescanAudit.companies,13);
 assert.equal(indiaContactRescanAudit.added,35);
 assert.equal(partnerRecords.length,136+globalSolarBuyersAudit.added+balkanSolarBuyersAudit.added);
 for(const entry of indiaContactRescan)for(const card of partnerContacts[entry.id]){
  assert.ok(card.researchHistory.some(run=>run.runId==='india-contact-rescan-20261024'));
  assert.ok(card.corporateRoutes.length);
 }
});
test('re-scan is idempotent, source-backed and never creates fake Reoon verification',()=>{
 const records=structuredClone(partnerRecords),contacts=structuredClone(partnerContacts);
 const before=JSON.stringify({records,contacts});const audit=applyIndiaContactRescan(records,contacts);
 assert.equal(audit.added,0);assert.equal(audit.refreshed,0);assert.equal(audit.emailsAdded,0);
 assert.equal(JSON.stringify({records,contacts}),before);
 for(const id of indiaContactRescan.map(x=>x.id))for(const c of contacts[id]){
  assert.ok(c.emails.every(email=>email.source));assert.equal(c.reoon,undefined);
 }
});
test('executive emails and subsidiary roles remain attributable and conflicts stay visible',()=>{
 const find=(id,name)=>partnerContacts[id].find(c=>c.name===name);
 assert.equal(find('cleanmax','Nikunj Ghodawat').email,'nikunj.ghodawat@cleanmax.com');
 assert.equal(find('orient-green-power','T. Shivaraman').email,'shivaram@orientgreenpower.com');
 assert.equal(find('tata-power','Dr. Praveer Sinha').email,'sinhapraveer@tatapower.com');
 assert.equal(find('soleos-energy','Hemant Joshi').company,'Soleos Green Energy Pvt. Ltd.');
 assert.match(find('sunsource-energy','Tarun Kumar').title,/disputed/);
 assert.match(find('sunsource-energy','Himanshu Srivastava').title,/confirmation pending/);
 assert.notEqual(find('soleos-energy','Rohankumar Parikh').name,find('soleos-energy','Rohan Patel').name);
 assert.equal(find('soleos-energy','Rohankumar Parikh').email,'');
});

