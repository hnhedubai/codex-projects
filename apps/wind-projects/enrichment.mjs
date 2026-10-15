import {readFile} from 'node:fs/promises';
import {isEmail,normalizeEmail} from './reoon.mjs';

async function loadKey(name){
 if(process.env[name])return process.env[name];
 if(process.env.REOON_ENV_FILE){const s=await readFile(process.env.REOON_ENV_FILE,'utf8');const line=s.split(/\r?\n/).find(x=>new RegExp(`^\\s*${name}\\s*=`).test(x));return line?.slice(line.indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2')||'';}
 return '';
}
const json=async(response,label)=>{let data;try{data=await response.json();}catch{throw Error(`${label} returned an unreadable result.`);}if(!response.ok)throw Error(`${label} request failed (${response.status}): ${data?.message||data?.error||data?.errors?.[0]?.message||'Provider rejected the request.'}`);return data;};
export async function createEnrichmentProviders({fetchImpl=fetch}={}){
 const apolloKey=await loadKey('APOLLO_API_KEY'),hunterKey=await loadKey('HUNTER_API_KEY');
 const request=async(url,options,label)=>json(await fetchImpl(url,{...options,signal:AbortSignal.timeout(60000)}),label);
 return {apolloEnabled:!!apolloKey,hunterEnabled:!!hunterKey,
 async apollo(contact,{domain='' }={}){if(!apolloKey)throw Error('Apollo unavailable: configure APOLLO_API_KEY on the server.');const params=new URLSearchParams({reveal_personal_emails:'false',reveal_phone_number:'false'});if(contact.emails?.[0])params.set('email',normalizeEmail(contact.emails[0]));else{params.set('name',contact.name);if(domain)params.set('domain',domain);}return request(`https://api.apollo.io/api/v1/people/match?${params}`,{method:'POST',headers:{'x-api-key':apolloKey,'Content-Type':'application/json','Cache-Control':'no-cache'}},'Apollo');},
  async hunterFind(contact,domain){if(!hunterKey)throw Error('Hunter unavailable: configure HUNTER_API_KEY on the server.');if(!domain)throw Error('Company domain is required for Hunter Email Finder.');const parts=contact.name.trim().split(/\s+/);const params=new URLSearchParams({domain,first_name:parts.shift()||'',last_name:parts.join(' '),api_key:hunterKey});return request(`https://api.hunter.io/v2/email-finder?${params}`,{method:'GET'},'Hunter');},
  async hunterVerify(email){if(!hunterKey)throw Error('Hunter unavailable: configure HUNTER_API_KEY on the server.');if(!isEmail(email))throw Error('A valid email is required for Hunter verification.');const params=new URLSearchParams({email:normalizeEmail(email),api_key:hunterKey});return request(`https://api.hunter.io/v2/email-verifier?${params}`,{method:'GET'},'Hunter');}
 };
}
