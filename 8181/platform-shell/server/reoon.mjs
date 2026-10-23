import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {atomicJson} from './atomic-json.mjs';
import {isSourcedCorporateCandidate} from '../shared/js/contact-registry.js';

export const normalizeEmail=value=>String(value||'').trim().toLowerCase();
const validAddress=value=>typeof value==='string'&&value.length<=254&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
const statuses=new Set(['safe','invalid','disabled','disposable','inbox_full','catch_all','role_account','spamtrap','unknown']);
const fail=(message,status=502)=>Object.assign(new Error(message),{status});
const envValue=(text,name)=>{
 const line=text.split(/\r?\n/).find(item=>new RegExp(`^\\s*${name}\\s*=`).test(item));
 return line?line.slice(line.indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2').replace(/\s+#.*$/,'').trim():'';
};
export async function loadReoonKey(root){
 if(process.env.REOON_API_KEY?.trim())return process.env.REOON_API_KEY.trim();
 let local='';try{local=await readFile(path.join(root,'.env.local'),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 const direct=envValue(local,'REOON_API_KEY');if(direct)return direct;
 const configured=process.env.REOON_ENV_FILE||envValue(local,'REOON_ENV_FILE');
 if(configured){try{return envValue(await readFile(configured,'utf8'),'REOON_API_KEY');}catch(error){if(error.code!=='ENOENT')throw error;}}
 return '';
}
export function interpretPower(raw,email,now=new Date().toISOString()){
 if(!statuses.has(raw?.status)||raw.verification_mode!=='power'||normalizeEmail(raw.email)!==normalizeEmail(email))throw fail('Reoon returned an unsupported or mismatched Power result.');
 // Reoon can return a positive mailbox result on a catch-all domain. The
 // domain-level catch-all flag is not the same as the terminal `catch_all`
 // status; do not downgrade a `safe`/`role_account` result when Reoon also
 // confirms that the requested address is deliverable and safe to send.
 const blocked=['is_disposable','has_inbox_full','is_disabled','is_spamtrap'].some(key=>raw[key]===true);
 const deliverable=['safe','role_account','catch_all'].includes(raw.status)&&raw.is_deliverable===true&&raw.is_safe_to_send===true&&!blocked;
 return {email:normalizeEmail(email),provider:'Reoon',mode:'power',status:raw.status,deliverable,
  isRoleAccount:raw.is_role_account===true||raw.status==='role_account',checkedAt:now,
  score:Number.isFinite(raw.overall_score)?raw.overall_score:null,raw};
}
export function collectPublishedEmails(records){
 const emails=new Set();
 for(const record of records)for(const contact of record.contacts||[]){
  // Sourced routes, including candidates on a separately sourced company domain,
  // may be checked. This does not establish personal ownership or approve a send.
  for(const item of [...(contact.emails||[]),...(contact.corporateRoutes||[])]){
   const route=typeof item==='string'?{email:item}:item;
   if(validAddress(route.email)&&route.source&&(!/candidate|generated|historical/i.test(route.type||'')||isSourcedCorporateCandidate(contact,route)))emails.add(normalizeEmail(route.email));
  }
  if(validAddress(contact.email)&&contact.source&&!/candidate|generated|historical/i.test(`${contact.status||''} ${contact.emailType||''}`))emails.add(normalizeEmail(contact.email));
 }
 return emails;
}
export async function createReoonService({root,apiKey,fetchImpl=fetch,allowedEmails=new Set(),now=()=>new Date().toISOString(),persist=atomicJson,requestTimeoutMs=90000,maxQueue=10}){
 const key=apiKey===undefined?await loadReoonKey(root):apiKey;
 const file=path.join(root,'platform-shell','data','reoon-results.json');
 let store={version:1,results:{},history:[]},storeError=null;
 try{const saved=JSON.parse(await readFile(file,'utf8'));if(saved.version!==1||!saved.results||Array.isArray(saved.results)||typeof saved.results!=='object'||!Array.isArray(saved.history))throw Error('Invalid verification store');
  for(const [email,result]of Object.entries(saved.results)){
   if(!validAddress(email)||email!==normalizeEmail(email)||result.email!==email||!Number.isFinite(Date.parse(result.checkedAt)))throw Error('Invalid saved result');
   const interpreted=interpretPower(result.raw,email,result.checkedAt);
   saved.results[email]=interpreted;
  }
  store=saved;}
 catch(error){if(error.code!=='ENOENT'){store={version:1,results:{},history:[]};storeError='Reoon result store cannot be read safely. Verification is disabled; repair the existing file without deleting its history.';}}
 let queue=Promise.resolve(),balanceCache=null,balanceTime=0,balancePending=null,queued=0,pendingSave=null;
 const publicResult=result=>{const {raw,...value}=result;return value;};
 const serial=action=>{const result=queue.then(action,action);queue=result.catch(()=>{});return result;};
 const request=async(endpoint,params={})=>{
  if(!key)throw fail('Reoon unavailable: configure a server-side REOON_API_KEY.',503);
  const url=new URL(`https://emailverifier.reoon.com/api/v1/${endpoint}`);
  url.searchParams.set('key',key);for(const [name,value]of Object.entries(params))url.searchParams.set(name,value);
  // Bound both headers AND body. No automatic retry of a potentially paid request.
  const controller=new AbortController();let timer;
  let value;
  try{
   value=await Promise.race([(async()=>{
    const response=await fetchImpl(url,{headers:{accept:'application/json'},signal:controller.signal});
    if(!response.ok)throw fail(`Reoon request failed (HTTP ${response.status}); no positive result recorded.`);
    try{return await response.json();}catch{throw fail('Reoon returned an unreadable response.');}
   })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(fail('Reoon timed out. The provider may have processed the check; no automatic retry was made.',504));},requestTimeoutMs);})]);
  }catch(error){throw error.status?error:fail('Reoon connection failed. The provider may have processed the check; no automatic retry was made.');}
  finally{clearTimeout(timer);}
  if(!value||typeof value!=='object'||Array.isArray(value))throw fail('Reoon returned an unreadable response.');
  if(value.status==='error')throw fail('Reoon rejected the request; check API permissions or credits.');
  // Never persist an echoed API key or expose it in provider errors.
  return JSON.parse(JSON.stringify(value,(name,item)=>/key|token|secret/i.test(name)?undefined:typeof item==='string'?item.replaceAll(key,'[redacted]'):item));
 };
 return {
  configured:!!key,
  results(){return Object.fromEntries(Object.entries(store.results).map(([email,result])=>[email,publicResult(result)]));},
  async status(){
   if(storeError)return {provider:'Reoon',mode:'power',configured:!!key,connected:false,error:storeError};
   if(!key)return {provider:'Reoon',mode:'power',configured:false,connected:false,error:'No server-side credential configured.'};
   if(balanceCache&&Date.now()-balanceTime<300000)return balanceCache;
   if(balancePending)return balancePending;
   balancePending=(async()=>{try{
    const balance=await request('check-account-balance/');
    if(balance.status!=='success'||balance.api_status!=='active')throw fail('Reoon account is not active.');
    balanceCache={provider:'Reoon',mode:'power',configured:true,connected:true,checkedAt:now(),remainingDailyCredits:balance.remaining_daily_credits,remainingInstantCredits:balance.remaining_instant_credits};balanceTime=Date.now();return balanceCache;
   }catch(error){balanceCache={provider:'Reoon',mode:'power',configured:true,connected:false,checkedAt:now(),error:error.message};balanceTime=Date.now()-270000;return balanceCache;}
   finally{balancePending=null;}})();return balancePending;
  },
  verify(emails,{refresh=false}={}){
   if(storeError)throw fail(storeError,503);
   if(!Array.isArray(emails)||!emails.length||emails.length>5)throw fail('Verify between one and five sourced addresses per request.',422);
   if(emails.some(email=>!validAddress(email)))throw fail('Valid email addresses required.',422);
   const unique=[...new Set(emails.map(normalizeEmail))];
   if(unique.some(email=>!allowedEmails.has(email)))throw fail('Only published email routes in the app can be verified.',422);
   if(queued>=maxQueue)throw fail('Reoon queue is busy. Wait for existing checks to finish.',429);
   queued++;
   return serial(async()=>{
    // If a disk save failed after Reoon answered, save that answer before any new paid call.
    if(pendingSave){try{await persist(file,pendingSave);store=pendingSave;pendingSave=null;}catch{throw fail('Reoon answered but local storage is unavailable. Retry saves the existing answer without another provider call; avoid restarting until saved.',503);}}
    const output=[];
    for(const email of unique){
     // Refresh is explicit and only for expired results; rapid retries still reuse the answer.
     const saved=store.results[email];
     if(saved&&(!refresh||Date.parse(now())-Date.parse(saved.checkedAt)<=30*86400000)){output.push({...publicResult(saved),cached:true});continue;}
     const raw=await request('verify',{email,mode:'power'});
     const result=interpretPower(raw,email,now());
     const next={...store,results:{...store.results,[email]:result},history:[...store.history,{email,provider:'Reoon',status:result.status,checkedAt:result.checkedAt}]};
     pendingSave=next;
     try{await persist(file,next);}catch{throw fail('Reoon answered but the result could not be saved. Retry saves the existing answer without another provider call; avoid restarting until saved.',503);}
     store=next;pendingSave=null;balanceCache=null;
     output.push({...publicResult(result),cached:false});
    }
    return output;
   }).finally(()=>{queued--;});
  }
 };
}

export function trustedLocalRequest(req){
 const host=req.headers.host;
 const port=req.socket?.localPort||8181;
 const hosts=[`localhost:${port}`,`127.0.0.1:${port}`];
 if(!hosts.includes(host))return false;
 if(req.headers.origin&&!hosts.map(value=>`http://${value}`).includes(req.headers.origin))return false;
 return !req.headers['sec-fetch-site']||['same-origin','none'].includes(req.headers['sec-fetch-site']);
}
