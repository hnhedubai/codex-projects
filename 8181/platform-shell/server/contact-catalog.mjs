import {readFile} from 'node:fs/promises';
import {atomicJson} from './atomic-json.mjs';
import path from 'node:path';
import {contactModules} from '../shared/js/contact-registry.js';
import {collectPublishedEmails,normalizeEmail} from './reoon.mjs';

export async function loadContactCatalog(root,{listedProjects=[],windProjects=[],partnerProjects=[],hydrogenRows=[]}={}){
 const recordsByModule={'/listed-projects':listedProjects,'/wind-projects':windProjects,'/investors-jv':partnerProjects,'/hydrogen-offtakers':hydrogenRows};
 const allowedEmails=new Set(),modules={};
 for(const [module,config]of Object.entries(contactModules)){
  const records=recordsByModule[module]||[];let contacts=[];
  if(config.snapshot){
   try{const snapshot=JSON.parse(await readFile(path.join(root,'modules',config.directory,'data',config.snapshot),'utf8'));contacts=Array.isArray(snapshot.contacts)?snapshot.contacts:[];}
   catch(error){if(error.code!=='ENOENT')throw error;}
  }
  const sourced=collectPublishedEmails([...records,{contacts}]);
  for(const email of sourced)allowedEmails.add(email);
  modules[module]={enabled:true,contacts:records.reduce((count,record)=>count+(record.contacts||[]).length,0)+contacts.length,publishedEmails:sourced.size};
 }
 const file=path.join(root,'platform-shell/data/reoon-local-contacts.json');
 let local=[],registrationError=null;
 try{
  local=JSON.parse(await readFile(file,'utf8'));
  if(!Array.isArray(local)||local.some(entry=>!entry||!contactModules[entry.module]||typeof entry.email!=='string'||!entry.email.includes('@')))throw Error('Invalid local contact registration store');
 }catch(error){if(error.code!=='ENOENT'){local=[];registrationError='Local contact registration cannot be read safely. Existing evidence is preserved; restore the registration file from backup before registering new addresses.';}}
 for(const entry of local)if(contactModules[entry.module])allowedEmails.add(normalizeEmail(entry.email));
 let queue=Promise.resolve();
 return {allowedEmails,modules,registrationStatus(){return {available:!registrationError,error:registrationError};},register(context,emails){
  const pending=emails.filter(email=>!allowedEmails.has(normalizeEmail(email)));
  if(!pending.length)return Promise.resolve();
  if(registrationError)throw Object.assign(Error(registrationError),{status:503});
  const manual=context?.provenance==='manual-contact-entry';
  if(!context||!contactModules[context.module]||!context.recordId||!context.name||(!manual&&!/^https?:\/\//i.test(context.source||'')))throw Object.assign(Error('Add a contact source URL before verifying a locally added/imported address.'),{status:422});
  if(pending.length!==1||normalizeEmail(context.email)!==normalizeEmail(pending[0]))throw Object.assign(Error('Local contact verification must match one displayed address.'),{status:422});
  const action=async()=>{
   const email=normalizeEmail(pending[0]);
   if(allowedEmails.has(email))return;
   const entry={module:context.module,recordId:String(context.recordId).slice(0,500),name:String(context.name).slice(0,200),email,source:String(context.source||'').slice(0,2000),provenance:manual?'manual-contact-entry':'user-supplied-source',registeredAt:new Date().toISOString(),association:manual?'User-entered address; mailbox check only, person-email identity not independently verified':'User-supplied source; person-email identity not independently verified'};
   const next=[...local,entry];await atomicJson(file,next);local=next;allowedEmails.add(email);
  };
  const result=queue.then(action,action);queue=result.catch(()=>{});return result;
 }};
}
