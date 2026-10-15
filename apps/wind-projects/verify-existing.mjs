// One-off initial batch. Run before restarting the contact-enabled server.
import {createContactStore} from './contact-store.mjs';
import {createReoon,loadReoonKey,interpretResult,isEmail} from './reoon.mjs';
const store=await createContactStore();
const provider=createReoon(await loadReoonKey());
const snapshot=store.snapshot();
const knownInvalid=new Set(Object.values(snapshot.contacts).flat().filter(c=>/user-reported invalid/i.test(c.status)).flatMap(c=>c.emails));
const emails=[...new Set(Object.values(snapshot.contacts).flat().flatMap(c=>c.emails))].filter(e=>isEmail(e)&&!knownInvalid.has(e)&&!store.check(e));
const mode=process.argv[2]||'inspect';
if(mode==='inspect'){console.log(JSON.stringify({recordedContacts:Object.values(snapshot.contacts).flat().length,eligibleEmails:emails.length,skippedKnownInvalid:[...knownInvalid],configured:provider.enabled,task:store.task()}));}
else if(mode==='submit'){
 if(store.task())throw Error('A batch was already recorded. Poll it; do not submit again.');
 if(emails.length<10||emails.length>30)throw Error('Initial batch requires 10–30 existing emails.');
 const balance=await provider.balance();
 if(balance.api_status!=='active'||Number(balance.remaining_daily_credits)+Number(balance.remaining_instant_credits)<emails.length)throw Error('Insufficient available Reoon credits or inactive API.');
 // Save intent first: an ambiguous timeout must not cause duplicate paid submission.
 await store.setTask({status:'submitting',emails,at:new Date().toISOString()});
 const result=await provider.submit(emails);
 if(result.status!=='success'||!result.task_id)throw Error('Submission was not confirmed. Check the Reoon dashboard before retrying.');
 await store.setTask({status:'submitted',taskId:result.task_id,emails,at:new Date().toISOString()});
 console.log(JSON.stringify({taskId:result.task_id,count:emails.length,status:'submitted'}));
}else if(mode==='poll'){
 const task=store.task();if(!task?.taskId)throw Error('No confirmed task to poll.');
 const result=await provider.poll(task.taskId);
 if(result.status==='completed'){
  for(const email of task.emails){const raw=Array.isArray(result.results)?result.results.find(r=>r.email?.toLowerCase()===email):result.results?.[email];if(raw)await store.recordCheck({...interpretResult(raw,email,{bulk:true}),taskId:task.taskId});}
  await store.setTask({...task,status:'completed',completedAt:new Date().toISOString()});
 }
 const checks=Object.values(store.snapshot().checks);console.log(JSON.stringify({status:result.status,checked:result.count_checked,total:result.count_total,counts:checks.reduce((out,r)=>(out[r.status]=(out[r.status]||0)+1,out),{}),results:checks.map(({email,status,deliverable})=>({email,status,deliverable}))}));
}
