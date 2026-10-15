import {readFile} from 'node:fs/promises';
export async function loadReoonKey(){
 if(process.env.REOON_API_KEY)return process.env.REOON_API_KEY;
 if(process.env.REOON_ENV_FILE){const s=await readFile(process.env.REOON_ENV_FILE,'utf8');const line=s.split(/\r?\n/).find(x=>/^\s*REOON_API_KEY\s*=/.test(x));return line?.slice(line.indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2')||'';}
 return '';
}
export const normalizeEmail=value=>String(value||'').trim().toLowerCase();
export const isEmail=value=>typeof value==='string'&&value.length<=254&&/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value);
const statuses=new Set(['safe','invalid','disabled','disposable','inbox_full','catch_all','role_account','spamtrap','unknown']);
export function interpretResult(raw,email,{bulk=false}={}){
 const status=String(raw?.status||'').toLowerCase();
 if(!statuses.has(status)||normalizeEmail(raw.email)!==normalizeEmail(email)||(!bulk&&raw.verification_mode!=='power'))throw Error('Reoon returned an unsupported or mismatched result.');
 const deliverable=['safe','role_account'].includes(status)&&raw.is_safe_to_send===true&&raw.is_deliverable===true&&!['is_catch_all','is_disposable','has_inbox_full','is_disabled','is_spamtrap'].some(k=>raw[k]===true);
 return {email:normalizeEmail(email),provider:'Reoon',mode:'power',status,deliverable,checkedAt:new Date().toISOString(),raw};
}
export function createReoon(apiKey,{fetchImpl=fetch}={}){
 async function request(endpoint,params={},body){
  if(!apiKey)throw Error('Reoon unavailable: no server-side API key configured.');
  const url=new URL('https://emailverifier.reoon.com/api/v1/'+endpoint);
  if(!body){url.searchParams.set('key',apiKey);for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);}
  let response;try{response=await fetchImpl(url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify({...body,key:apiKey})}:{}),signal:AbortSignal.timeout(90000)});}catch{throw Error('Reoon did not respond; result remains unavailable.');}
  if(!response.ok)throw Error(`Reoon request failed (HTTP ${response.status}); no positive result recorded.`);
  let result;try{result=await response.json();}catch{throw Error('Reoon returned an unreadable result.');}
  if(result.status==='error')throw Error('Reoon rejected the request. Check account credits and API permissions.');
  return result;
 }
 return {enabled:!!apiKey,
  async verify(email){if(!isEmail(email))throw Error('Invalid email syntax.');return interpretResult(await request('verify',{email:normalizeEmail(email),mode:'power'}),email);},
  balance:()=>request('check-account-balance/'),
  submit:emails=>request('create-bulk-verification-task/',{}, {name:'Wind projects 2026-10-15',emails}),
  poll:taskId=>request('get-result-bulk-verification-task/',{task_id:String(taskId)})
 };
}
