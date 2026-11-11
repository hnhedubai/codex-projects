import {SendError,SendRequest} from './send-request.mjs';
import {PulseClient} from './pulse-client.mjs';
import {crmHintFor} from './crm-hint.mjs';
import {checkAnonymity,ANONYMITY_WARNING} from '../../../modules/investors-jv/outreach-policy.js';
import {OUTREACH_DRAFT_V2} from '../../../modules/investors-jv/outreach-settings.js';
import {isV2Body} from '../../../modules/investors-jv/outreach-draft-v2.js';

/** Runs one send at a time: validate → record "sending" → Pulse calls within a deadline → record results. */
export class PulseSendService {
 static SEND_DEADLINE_MS=90000;
 #busy=false;
 constructor({client,deadlineMs=PulseSendService.SEND_DEADLINE_MS,now=()=>Date.now(),verifyRecipients,records=null}){this.client=client;this.deadlineMs=deadlineMs;this.now=now;this.verifyRecipients=verifyRecipients;this.records=records;}
 get enabled(){return this.client.enabled;}
 async send(module,input){
  const request=SendRequest.parse(input,module);
  const calls=request.calls();
  if(module.key==='investors-jv'&&OUTREACH_DRAFT_V2&&isV2Body(request.body)&&calls.some(call=>`${call.payload.subject}\n${call.payload.body_text}`.trim().split(/\s+/).length>=150))throw new SendError('The personalized outreach draft must stay under 150 words. Shorten it before sending.');
  if(module.key==='investors-jv'&&!request.draftSafetyOverride&&(!checkAnonymity(`${request.subject}\n${request.body}`).safe||calls.some(call=>!checkAnonymity(`${call.payload.subject}\n${call.payload.body_text}`).safe)))throw new SendError(ANONYMITY_WARNING);
  if(!module.history)throw new SendError(`${module.label} send history cannot be read, so sending is paused. ${module.historyError}`,503);
  if(!this.client.enabled)throw new SendError('Pulse is not connected. Set PULSE_SEND_KEY and restart 8181.',503);
  if(this.#busy)throw new SendError('A Pulse send is already in progress. Wait for it to finish.',409);
  this.#busy=true;
  try{
   const record=this.records?await this.records.get(request.recordId).catch(()=>null):null;
   if(module.key==='investors-jv'&&record?.referralOnly===true)throw new SendError('This record is a referral/intermediary route and is excluded from Investors & JV email broadcast and scheduling.',422);
   const verification=this.verifyRecipients?await this.verifyRecipients(request):[];
   const rejected=new Map(this.verifyRecipients?request.recipients.filter(person=>verification.find(item=>item.email===person.email)?.allowed!==true).map(person=>[person.email,verification.find(item=>item.email===person.email)||{error:'Reoon returned no verification result.'}]):[]);
   const blocked=calls.filter(call=>call.emails.some(email=>rejected.has(email)));
   // Fresh positive catch-all results are consented automatically. Reoon has
   // already classified the mailbox; the user should not need a second UI step.
   const automaticCatchAll=new Set(verification.filter(item=>item.allowed===true&&item.status==='catch_all').map(item=>item.email));
   for(const call of calls){
    const allow=[...(call.payload.allowCatchAll||[]),...call.emails.filter(email=>automaticCatchAll.has(email))];
    if(allow.length)call.payload.allowCatchAll=[...new Set(allow)];
   }
   // CRM facts for Pulse (company + people from the record): a lookup failure never stops the send.
   for(const call of calls){const crm=crmHintFor({module:module.key,recordId:request.recordId,record,recipients:request.recipients.filter(person=>call.emails.includes(person.email))});if(crm)call.payload.crm=crm;}
   const id=await module.history.begin({...request,calls:()=>calls,verification});
   const results=[...blocked.map(call=>({emails:call.emails,status:'blocked',httpStatus:422,error:call.emails.filter(email=>rejected.has(email)).map(email=>`${email}: ${rejected.get(email).error}`).join('; ')})),...await this.#run(calls.filter(call=>!blocked.includes(call)))];
   const pulseVerification=results.map(result=>result.verification).find(value=>value&&typeof value==='object')||null;
   const summary={sent:0,blocked:0,failed:0};for(const result of results)summary[result.status==='sent'||result.status==='blocked'?result.status:'failed']+=result.emails.length;
   const entry=await module.history.complete(id,{results,summary,pulseVerification:pulseVerification||undefined});
   const pulseDisposableVerification=[...verification.filter(item=>item.allowed!==true&&item.disposable===true).map(item=>({address:item.email,disposable:true,source:'local-reoon'})),...results.filter(result=>result.httpStatus===422).flatMap(result=>result.verification?.invalid||[]).filter(item=>item?.disposable===true)];
   return {id,summary,verification,pulseVerification,pulseDisposableVerification,results:entry.results.map(({emails,status,error})=>({emails,status,error}))};
  }finally{this.#busy=false;}
 }
 async #run(calls){
  const stop=this.now()+this.deadlineMs;const results=[];
  for(const call of calls){
   const remaining=stop-this.now();
   if(remaining<=0){results.push({emails:call.emails,status:'failed',httpStatus:0,error:'Not attempted — time limit. Send again to continue.'});continue;}
   const attemptedAt=new Date(this.now()).toISOString();
   results.push({emails:call.emails,...await this.client.send(call.payload,{timeoutMs:Math.min(PulseClient.CALL_TIMEOUT_MS,remaining)}),attemptedAt,completedAt:new Date(this.now()).toISOString()});
  }
  return results;
 }
}
