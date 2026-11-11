import {readFile} from 'node:fs/promises';
import path from 'node:path';

const envValue=(text,name)=>{
 const line=text.split(/\r?\n/).find(item=>new RegExp(`^\\s*${name}\\s*=`).test(item));
 return line?line.slice(line.indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2').replace(/\s+#.*$/,'').trim():'';
};
const readText=async file=>{try{return await readFile(file,'utf8');}catch(error){if(['ENOENT','EACCES'].includes(error.code))return '';throw error;}};

/** Server-side secret lookup: process env → 8181/.env.local → the secret file named by PULSE_ENV_FILE or REOON_ENV_FILE
    (the same private file the Wind Projects desk uses). The value is never sent to the browser. */
export async function loadSecret(root,name){
 if(process.env[name]?.trim())return process.env[name].trim();
 const local=await readText(path.join(root,'.env.local'));
 const direct=envValue(local,name);if(direct)return direct;
 for(const file of [process.env.PULSE_ENV_FILE,envValue(local,'PULSE_ENV_FILE'),process.env.REOON_ENV_FILE,envValue(local,'REOON_ENV_FILE')].filter(Boolean)){
  const value=envValue(await readText(path.resolve(root,file)),name);if(value)return value;
 }
 return '';
}

/** Pulse POST /api/pulse/external/send. Never throws; the key is never echoed. */
export class PulseClient {
 static CALL_TIMEOUT_MS=45000;
 static async fromEnvironment(root,{fetchImpl=fetch}={}){
  return new PulseClient({key:await loadSecret(root,'PULSE_SEND_KEY'),baseUrl:(await loadSecret(root,'PULSE_API_URL'))||'https://api.grynh2.com',fetchImpl});
 }
 #key;#fetch;
 constructor({key='',baseUrl='https://api.grynh2.com',fetchImpl=fetch}={}){this.#key=key;this.#fetch=fetchImpl;this.url=new URL('/api/pulse/external/send',baseUrl).toString();this.crmHintUrl=new URL('/api/pulse/external/crm-hint',baseUrl).toString();}
 /** CRM facts for an email already sent (backfill). Never throws; the key is never echoed. */
 async crmHint(payload,{timeoutMs=PulseClient.CALL_TIMEOUT_MS}={}){
  if(!this.#key)return {ok:false,status:0,error:'Pulse is not connected.'};
  try{
   const response=await this.#fetch(this.crmHintUrl,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.#key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(timeoutMs)});
   let body=null;try{body=await response.json();}catch{}
   return {ok:response.ok,status:response.status,body,error:response.ok?'':String(body?.error?.formErrors||body?.error||`HTTP ${response.status}`).replaceAll(this.#key,'[redacted]')};
  }catch{return {ok:false,status:0,error:'Pulse did not respond in time.'};}
 }
 get enabled(){return !!this.#key;}
 async send(payload,{timeoutMs=PulseClient.CALL_TIMEOUT_MS}={}){
  if(!this.#key)return {status:'failed',httpStatus:0,error:'Pulse is not connected. Set PULSE_SEND_KEY and restart 8181.'};
  if(payload.scheduled_at){
   if(!/(?:Z|[+-]\d{2}:\d{2})$/.test(payload.scheduled_at)||!Number.isFinite(Date.parse(payload.scheduled_at))||Date.parse(payload.scheduled_at)<Date.now()+315000)return {status:'failed',httpStatus:400,error:'Scheduled time must be over five minutes ahead. No request was sent; replan instead of sending immediately.'};
   if(payload.allowDisposable)return {status:'failed',httpStatus:400,error:'Disposable overrides are not permitted for scheduled emails.'};
   if(!payload.idempotency_key||!payload.crm)return {status:'failed',httpStatus:400,error:'Scheduled email requires a stable idempotency key and CRM block.'};
  }
  let response;
  try{response=await this.#fetch(this.url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.#key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(timeoutMs)});}
  catch{return {status:'failed',httpStatus:0,error:'Pulse did not respond in time. Sending again is safe; Pulse will not send a duplicate.'};}
  let body=null;try{body=await response.json();}catch{}
  const detail=typeof body?.error==='string'?body.error.replaceAll(this.#key,'[redacted]'):'';
  if(response.ok){
   if(body?.scheduled===true&&payload.scheduled_at){
    if(typeof body.id!=='string'||!body.id||!Number.isFinite(Date.parse(body.scheduledAt)))return {status:'failed',httpStatus:response.status,error:'Booking response incomplete. Reconcile Pulse Scheduled with the same idempotency key; do not create a new key.'};
    return {status:'scheduled',httpStatus:response.status,error:'',scheduledId:body.id,scheduledAt:body.scheduledAt,replay:body.replay===true};
   }
   if(body?.sent!==true)return {status:'failed',httpStatus:response.status,error:'Sending unconfirmed: Pulse returned no valid send confirmation. Check Pulse Sent before retrying.',emailMessageId:null};
   return {status:'sent',httpStatus:response.status,error:'',emailMessageId:body?.emailMessageId||null,replay:body?.idempotentReplay===true};
  }
  if(response.status===422)return {status:'blocked',httpStatus:422,error:detail||'Pulse blocked a recipient.',verification:body?.verification||null};
  if(response.status===403)return {status:'failed',httpStatus:403,error:'Your Pulse key\'s user lacks the send-override permission (emails.send_override), or is not permitted to send this request.'};
  if(response.status===400)return {status:'failed',httpStatus:400,error:`Pulse rejected the request (400). Check that confirmed addresses are recipients of this email. ${detail}`.trim()};
  if(response.status===409)return {status:'failed',httpStatus:409,error:`Pulse found an idempotency conflict (409). Start a new send attempt; the content or consent list differs from the earlier request. ${detail}`.trim()};
  if(response.status===401)return {status:'failed',httpStatus:401,error:'Pulse rejected the send key. Create a new pulse_send key in GrynH2 Gear.'};
  return {status:'failed',httpStatus:response.status,error:detail||`Pulse error (HTTP ${response.status}).`};
 }
}
