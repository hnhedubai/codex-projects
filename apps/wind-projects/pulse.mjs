import {createHash} from 'node:crypto';
import {loadProviderKey,isEmail,normalizeEmail} from './reoon.mjs';
import {formatBody,personalise,placeholderPattern} from './dist/format.mjs';

export const MAX_RECIPIENTS=10;
export const CALL_TIMEOUT_MS=45000;
export const SEND_DEADLINE_MS=90000;
const FIELDS=['to','cc','bcc'];

export async function loadPulseConfig(){
 const key=await loadProviderKey('PULSE_SEND_KEY');
 const baseUrl=(await loadProviderKey('PULSE_API_URL'))||'https://api.grynh2.com';
 return {key,baseUrl};
}

/** Calls Pulse POST /api/pulse/external/send. Never throws; the key is never echoed. */
export function createPulseClient({key,baseUrl='https://api.grynh2.com',fetchImpl=fetch}={}){
 const url=new URL('/api/pulse/external/send',baseUrl).toString();
 return {enabled:!!key,
  async send(payload,{timeoutMs=CALL_TIMEOUT_MS}={}){
   if(!key)return {status:'failed',httpStatus:0,error:'Pulse is not connected. Set PULSE_SEND_KEY and restart.'};
   let response;
   try{response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(timeoutMs)});}
   catch{return {status:'failed',httpStatus:0,error:'Pulse did not respond in time. Sending again is safe; Pulse will not send a duplicate.'};}
   let body=null;try{body=await response.json();}catch{}
   const detail=typeof body?.error==='string'?body.error:'';
   if(response.ok){
    if(body?.sent===false)return {status:'failed',httpStatus:response.status,error:'Pulse accepted the email but did not confirm sending. Check Pulse Sent.',emailMessageId:body?.emailMessageId||null};
    return {status:'sent',httpStatus:response.status,error:'',emailMessageId:body?.emailMessageId||null,replay:body?.idempotentReplay===true};
   }
   if(response.status===422&&body?.code==='recipients_blocked')return {status:'blocked',httpStatus:422,error:detail||'Pulse blocked a recipient.',verification:body.verification??null};
   if(response.status===401||response.status===403)return {status:'failed',httpStatus:response.status,error:'Pulse rejected the send key. Create a new pulse_send key in GrynH2 Gear.'};
   return {status:'failed',httpStatus:response.status,error:detail||`Pulse error (HTTP ${response.status}).`};
  }
 };
}

/** Validates a send request against the project's saved contacts. Throws "Pulse …" messages. */
export function validateSend(input,contacts){
 const mode=input.mode;
 if(!['separate','together'].includes(mode))throw Error('Pulse send mode must be one by one or one email.');
 const subject=typeof input.subject==='string'?input.subject.trim():'';
 const body=typeof input.body==='string'?input.body.trim():'';
 if(!subject||subject.length>300)throw Error('Pulse send needs a subject line (Subject: …) of up to 300 characters.');
 if(!body||body.length>20000)throw Error('Pulse send needs a message body of up to 20,000 characters.');
 if(placeholderPattern.test(subject)||placeholderPattern.test(body))throw Error('Pulse send blocked: the draft still has [placeholder] text. Pulse adds your signature.');
 if(!Array.isArray(input.recipients)||!input.recipients.length)throw Error('Pulse send needs at least one recipient.');
 if(input.recipients.length>MAX_RECIPIENTS*3)throw Error(`Pulse send allows up to ${MAX_RECIPIENTS} recipients.`);
 const byEmail=new Map();
 for(const r of input.recipients){
  const email=normalizeEmail(r?.email);
  if(!isEmail(email))throw Error('Pulse send has an invalid email address.');
  const field=mode==='separate'?'to':r.field;
  if(!FIELDS.includes(field))throw Error('Pulse send recipients must be To, CC or BCC.');
  const contact=contacts.find(c=>c.id===r.contactId&&(c.emails||[]).includes(email));
  if(!contact)throw Error('Pulse send: every email must belong to a saved contact of this project.');
  const prior=byEmail.get(email);
  if(!prior||FIELDS.indexOf(field)<FIELDS.indexOf(prior.field))byEmail.set(email,{contactId:contact.id,name:contact.name,email,field});
 }
 const recipients=[...byEmail.values()];
 if(recipients.length>MAX_RECIPIENTS)throw Error(`Pulse send allows up to ${MAX_RECIPIENTS} recipients.`);
 if(mode==='together'&&!recipients.some(r=>r.field==='to'))throw Error('Pulse send needs at least one To recipient.');
 return {projectId:input.projectId,mode,subject,body,recipients};
}

const hash=parts=>'wind:'+createHash('sha256').update(parts.join('|')).digest('hex');

/** The Pulse calls for a validated send: one per person (separate) or one with To/CC/BCC (together). */
export function buildCalls({projectId,mode,subject,body,recipients}){
 if(mode==='separate')return recipients.map(r=>{
  const personal=personalise(body,r.name);const {html,text}=formatBody(personal);
  return {emails:[r.email],payload:{to:r.email,subject,body_html:html,body_text:text,idempotency_key:hash([projectId,'separate',r.contactId,r.email,subject,personal])}};
 });
 const tos=recipients.filter(r=>r.field==='to').map(r=>r.email);
 const cc=[...tos.slice(1),...recipients.filter(r=>r.field==='cc').map(r=>r.email)];
 const bcc=recipients.filter(r=>r.field==='bcc').map(r=>r.email);
 const {html,text}=formatBody(body);
 const signature=recipients.map(r=>`${r.field}:${r.email}`).sort();
 return [{emails:recipients.map(r=>r.email),payload:{to:tos[0],...(cc.length?{cc:cc.join(', ')}:{}),...(bcc.length?{bcc:bcc.join(', ')}:{}),subject,body_html:html,body_text:text,idempotency_key:hash([projectId,'together',...signature,subject,body])}}];
}

/** Runs the calls one after another within a total deadline; unreached calls are "Not attempted". */
export async function runSend(send,pulse,{deadlineMs=SEND_DEADLINE_MS,now=()=>Date.now()}={}){
 const calls=buildCalls(send);const stop=now()+deadlineMs;const results=[];
 for(const call of calls){
  const remaining=stop-now();
  if(remaining<=0){results.push({emails:call.emails,status:'failed',httpStatus:0,error:'Not attempted — time limit. Send again to continue.'});continue;}
  const result=await pulse.send(call.payload,{timeoutMs:Math.min(CALL_TIMEOUT_MS,remaining)});
  results.push({emails:call.emails,...result});
 }
 const summary={sent:0,blocked:0,failed:0};for(const r of results)summary[r.status]+=r.emails.length;
 return {results,summary,workflowUpdate:summary.sent>0?{emailStatus:'sent',workflow:'Contacted'}:null};
}
