import {mkdir,readFile,writeFile,rename,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {projects,projectRegistry} from './dist/data.js';
import {isEmail,normalizeEmail} from './reoon.mjs';
export const defaultStoreFile=new URL('./private/contacts.json',import.meta.url);
const fields=['name','title','role','linkedin','source','notes','association'];
export function sanitizeContact(input){
 if(!input||typeof input!=='object')throw Error('Contact details required.');
 const out={};for(const field of fields){if(input[field]!=null&&typeof input[field]!=='string')throw Error('Invalid contact field.');out[field]=(input[field]||'').trim().slice(0,field==='notes'?5000:1000);}
 if(!out.name)throw Error('Name is required.');
 for(const field of ['linkedin','source'])if(out[field]){let url;try{url=new URL(out[field]);}catch{throw Error('Source and LinkedIn links must be valid HTTPS URLs.');}if(url.protocol!=='https:')throw Error('Source and LinkedIn links must use HTTPS.');if(field==='linkedin'&&!/(^|\.)linkedin\.com$/.test(url.hostname))throw Error('Use a LinkedIn profile URL.');}
 if(!['personal','shared','unconfirmed'].includes(out.association))out.association='unconfirmed';
 if(!Array.isArray(input.emails)||input.emails.length>10||input.emails.some(x=>!isEmail(x)))throw Error('Enter up to 10 valid email addresses.');
 out.emails=[...new Set(input.emails.map(normalizeEmail))];
 if(!Array.isArray(input.phones)||input.phones.length>10||input.phones.some(x=>typeof x!=='string'||x.length>100))throw Error('Enter up to 10 phone numbers.');
 out.phones=[...new Set(input.phones.map(x=>x.trim()).filter(Boolean))];
 return out;
}
export async function createContactStore(file=defaultStoreFile){
 let state={schemaVersion:1,overrides:{},checks:{},history:[],providerHistory:[],bulkTask:null};
 try{const parsed=JSON.parse(await readFile(file,'utf8'));if(parsed.schemaVersion!==1||!parsed.overrides||!parsed.checks||!Array.isArray(parsed.history))throw Error('Invalid contact store');state=parsed;if(!Array.isArray(state.providerHistory))state.providerHistory=[];}catch(e){if(e.code!=='ENOENT')throw Error('Contact store cannot be loaded safely. Restore it from backup; it has not been overwritten.');}
 const seeds=Object.fromEntries(projects.map(p=>[p.id,p.contacts.map((c,i)=>({...c,id:`${p.id}-${i}`,emails:c.email?[normalizeEmail(c.email)]:[],phones:Array.isArray(c.phones)?c.phones:[],association:/shared|company mailbox|project mailbox/i.test(c.status)?'shared':'unconfirmed',source:c.source||'',notes:'',version:1,original:structuredClone(c)}))]));
 const registry=structuredClone(projectRegistry);
 let queue=Promise.resolve();
 const edit=fn=>{const job=queue.then(async()=>{const next=structuredClone(state);next.registry=registry;const result=fn(next);const dir=path.dirname(file instanceof URL? (await import('node:url')).fileURLToPath(file):file);await mkdir(dir,{recursive:true});const filename=file instanceof URL?(await import('node:url')).fileURLToPath(file):file;const temp=filename+'.tmp';await writeFile(temp,JSON.stringify(next,null,2));try{await copyFile(filename,filename+'.bak');}catch(e){if(e.code!=='ENOENT')throw e;}await rename(temp,filename);state=next;return result;});queue=job.catch(()=>{});return job;};
 const mergedContacts=(projectId,current=state)=>{
  if(!Object.hasOwn(seeds,projectId))throw Error('Unknown project.');
  const override=current.overrides[projectId];
  if(!override)return structuredClone(seeds[projectId]);
  const all=structuredClone(override);
  const existingIds=new Set(all.map(c=>c.id));
  const existingNames=new Set(all.map(c=>String(c.name||'').trim().toLowerCase()));
  for(const seed of seeds[projectId]){
   const name=String(seed.name||'').trim().toLowerCase();
   if(!existingIds.has(seed.id)&&!existingNames.has(name)){all.push(structuredClone(seed));existingNames.add(name);}
  }
  return all;
 };
 const contacts=projectId=>mergedContacts(projectId);
 return {
  contacts,
  snapshot(){return {contacts:Object.fromEntries(projects.map(p=>[p.id,contacts(p.id)])),checks:structuredClone(state.checks),registry};},
  task:()=>structuredClone(state.bulkTask),
  setTask:task=>edit(next=>{next.bulkTask=task;}),
  check:email=>structuredClone(state.checks[normalizeEmail(email)]||null),
  recordCheck:result=>edit(next=>{const previous=next.checks[result.email];if(previous)next.history.push({type:'verification',previous});next.checks[result.email]=result;}),
  recordProviderLookup:entry=>edit(next=>{next.providerHistory.push({...entry,at:new Date().toISOString()});}),
  async save(projectId,input){const clean=sanitizeContact(input);contacts(projectId);return edit(next=>{
   const all=mergedContacts(projectId,next);
   const old=input.id?all.find(c=>c.id===input.id):null;
   if(input.id&&!old)throw Error('Contact not found.');
   if(old&&input.version!==old.version)throw Error('This contact changed. Refresh before editing again.');
   const value={...old,...clean,id:old?.id||randomUUID(),version:(old?.version||0)+1,updatedAt:new Date().toISOString(),status:old?.status||'User-entered · not verified',original:old?.original||null};
   next.history.push({type:'contact-edit',projectId,at:value.updatedAt,previous:old||null,id:value.id});
   if(old)all[all.findIndex(c=>c.id===old.id)]=value;else all.push(value);
   next.overrides[projectId]=all;return value;
  });}
 };
}
