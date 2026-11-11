// Explicitly invoked, verification only. Never invokes a Pulse send endpoint.
import {partnerProjects} from '../modules/investors-jv/data/source.js';
import {priorityContactRescan,priorityContactRun} from '../modules/investors-jv/data/priority-contact-rescan.js';
import {collectPublishedEmails,normalizeEmail} from '../platform-shell/server/reoon.mjs';
import {atomicJson} from '../platform-shell/server/atomic-json.mjs';
import {fileURLToPath} from 'node:url';

const origin='http://localhost:8181';
const records=partnerProjects.filter(row=>priorityContactRescan.some(batch=>batch.id===row.id));
const emails=[...collectPublishedEmails(records)];
const output=fileURLToPath(new URL('../platform-shell/data/priority-contact-verification-20261025.json',import.meta.url));
const report={runId:priorityContactRun.runId,startedAt:new Date().toISOString(),companies:records.length,totalAddresses:emails.length,results:[],errors:[],noEmailCompanies:records.filter(row=>!collectPublishedEmails([row]).size).map(row=>row.id),notes:['Fresh saved results (up to 30 days) are reused; provider checks are performed only for missing/expired results.','Deliverability is not person-email identity, project acceptance or an outreach send.']};
for(const email of emails){
 const record=records.find(row=>collectPublishedEmails([row]).has(email));
 const contact=record.contacts.find(card=>[card.email,...(card.emails||[]).map(r=>r.email),...(card.corporateRoutes||[]).map(r=>r.email)].some(value=>normalizeEmail(value)===email));
 const route=[...(contact.emails||[]),...(contact.corporateRoutes||[])].find(r=>normalizeEmail(r.email)===email);
 try{
  const response=await fetch(origin+'/api/reoon/verify',{method:'POST',headers:{Origin:origin,'content-type':'application/json'},body:JSON.stringify({emails:[email],refresh:true,context:{module:'/investors-jv',recordId:record.id,name:contact.name,email,source:route?.source||contact.source}}),signal:AbortSignal.timeout(95000)});
  const body=await response.json();
  if(!response.ok)throw Error(`Local verification HTTP ${response.status}: ${body.error||'no usable result'}`);
  const result=body.results?.[0];
  if(!result||result.email!==email||result.provider!=='Reoon'||result.mode!=='power')throw Error('Missing or mismatched Power result');
  report.results.push({...result,recordId:record.id});
  console.log(JSON.stringify({processed:report.results.length,total:emails.length,status:result.status,deliverable:result.deliverable,cached:result.cached}));
 }catch(error){
  report.errors.push({email,recordId:record.id,error:error.name==='TimeoutError'?'Verification request timed out; no automatic paid retry.':error.message});
  // Provider errors may have consumed credits; preserve the checkpoint and do not retry automatically.
  console.log(JSON.stringify({processed:report.results.length,total:emails.length,error:'Verification stopped; inspect the private report. No positive status inferred.'}));
  await atomicJson(output,report);process.exitCode=1;break;
 }
 await atomicJson(output,report);
}
if(report.results.length===emails.length)report.completedAt=new Date().toISOString();
report.summary={};for(const result of report.results)report.summary[result.status]=(report.summary[result.status]||0)+1;
report.providerChecks=report.results.filter(result=>!result.cached).length;
report.savedResultsReused=report.results.filter(result=>result.cached).length;
await atomicJson(output,report);
console.log(JSON.stringify({completed:!!report.completedAt,total:report.totalAddresses,checked:report.results.length,summary:report.summary,providerChecks:report.providerChecks,savedResultsReused:report.savedResultsReused,errors:report.errors.length,noEmailCompanies:report.noEmailCompanies.length}));
