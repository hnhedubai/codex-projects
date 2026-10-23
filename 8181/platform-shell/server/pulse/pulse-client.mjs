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
 constructor({key='',baseUrl='https://api.grynh2.com',fetchImpl=fetch}={}){this.#key=key;this.#fetch=fetchImpl;this.url=new URL('/api/pulse/external/send',baseUrl).toString();}
 get enabled(){return !!this.#key;}
 async send(payload,{timeoutMs=PulseClient.CALL_TIMEOUT_MS}={}){
  if(!this.#key)return {status:'failed',httpStatus:0,error:'Pulse is not connected. Set PULSE_SEND_KEY and restart 8181.'};
  let response;
  try{response=await this.#fetch(this.url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.#key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(timeoutMs)});}
  catch{return {status:'failed',httpStatus:0,error:'Pulse did not respond in time. Sending again is safe; Pulse will not send a duplicate.'};}
  let body=null;try{body=await response.json();}catch{}
  const detail=typeof body?.error==='string'?body.error.replaceAll(this.#key,'[redacted]'):'';
  if(response.ok){
   if(body?.sent!==true)return {status:'failed',httpStatus:response.status,error:'Sending unconfirmed: Pulse returned no valid send confirmation. Check Pulse Sent before retrying.',emailMessageId:null};
   return {status:'sent',httpStatus:response.status,error:'',emailMessageId:body?.emailMessageId||null,replay:body?.idempotentReplay===true};
  }
  if(response.status===422&&body?.code==='recipients_blocked')return {status:'blocked',httpStatus:422,error:detail||'Pulse blocked a recipient.',verification:body?.verification||null};
  if(response.status===401||response.status===403)return {status:'failed',httpStatus:response.status,error:'Pulse rejected the send key. Create a new pulse_send key in GrynH2 Gear.'};
  return {status:'failed',httpStatus:response.status,error:detail||`Pulse error (HTTP ${response.status}).`};
 }
}
