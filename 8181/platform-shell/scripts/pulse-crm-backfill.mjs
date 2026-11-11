// One-time: send Pulse the CRM facts (company + people) for emails 8181 already sent, so Pulse fills its
// CRM and moves their follow-ups into each person's working hours. Usage (from the 8181 folder):
//   node platform-shell/scripts/pulse-crm-backfill.mjs [--since 2026-10-31T20:00:00Z] [--dry-run]
import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {PulseClient} from '../server/pulse/pulse-client.mjs';
import {RecordIndex,crmHintFor} from '../server/pulse/crm-hint.mjs';

const root=process.cwd();
const arg=name=>{const i=process.argv.indexOf(name);return i>0?process.argv[i+1]:null;};
const since=Date.parse(arg('--since')||'2026-10-31T20:00:00Z');
const dryRun=process.argv.includes('--dry-run');
const dir=path.join(root,'platform-shell','data','pulse-sends');
const records=new RecordIndex(root);
const client=await PulseClient.fromEnvironment(root);
if(!client.enabled&&!dryRun){console.error('Pulse is not connected (PULSE_SEND_KEY missing).');process.exit(1);}

let done=0,failed=0;
for(const file of (await readdir(dir)).filter(name=>name.endsWith('.json'))){
 let history;try{history=JSON.parse(await readFile(path.join(dir,file),'utf8'));}catch{continue;}
 for(const send of history.sends||[]){
  if(Date.parse(send.at)<since||!send.recordId)continue;
  const record=await records.get(send.recordId);
  for(const result of send.results||[]){
   if(result.status!=='sent')continue;
   for(const email of result.emails||[]){
    const person=(send.recipients||[]).find(item=>item.email===email)||{email};
    const crm=crmHintFor({module:send.module,recordId:send.recordId,record,recipients:[person]});
    if(!crm){console.log(`skip  ${email}: record ${send.recordId} not found`);continue;}
    if(dryRun){console.log(`would ${email}: ${crm.company.name} · ${crm.company.country||'no country'}`);continue;}
    const out=await client.crmHint({to:email,subject:send.subject,crm});
    if(out.ok){done+=1;console.log(`ok    ${email}: ${crm.company.name} · ${crm.company.country||'no country'} · follow-ups moved ${out.body?.followUpsMoved??0}`);}
    else{failed+=1;console.log(`FAIL  ${email}: ${out.error}`);}
   }
  }
 }
}
console.log(`\n${dryRun?'dry run':'done'}: ${done} sent, ${failed} failed`);
