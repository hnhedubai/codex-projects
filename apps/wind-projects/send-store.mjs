import {mkdir,readFile,writeFile,rename,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
export const defaultSendFile=new URL('./private/sends.json',import.meta.url);
export const defaultPartnerSendFile=new URL('./private/partner-sends.json',import.meta.url);

/** Pulse send history in private/sends.json (temp file + rename, previous file kept as .bak). */
export async function createSendStore(file=defaultSendFile){
 const filename=file instanceof URL?fileURLToPath(file):file;
 let state={schemaVersion:1,sends:[]};
 try{const parsed=JSON.parse(await readFile(filename,'utf8'));if(parsed.schemaVersion!==1||!Array.isArray(parsed.sends))throw Error('Invalid send store');state=parsed;}catch(e){if(e.code!=='ENOENT')throw Error('Send history cannot be loaded safely. Restore it from backup; it has not been overwritten.');}
 let queue=Promise.resolve();
 const edit=fn=>{const job=queue.then(async()=>{const next=structuredClone(state);const result=fn(next);await mkdir(path.dirname(filename),{recursive:true});const temp=filename+'.tmp';await writeFile(temp,JSON.stringify(next,null,2));try{await copyFile(filename,filename+'.bak');}catch(e){if(e.code!=='ENOENT')throw e;}await rename(temp,filename);state=next;return result;});queue=job.catch(()=>{});return job;};
 return {
  record:entry=>edit(next=>{const value={id:randomUUID(),at:new Date().toISOString(),...entry};next.sends.push(value);return value;}),
  list:(projectId,limit=20)=>structuredClone(state.sends.filter(s=>s.projectId===projectId).slice(-limit).reverse()),
  // Per project: number of addresses Pulse accepted and the time of the latest send with at least one accepted address.
  summary:()=>{const out={};for(const s of state.sends){if(typeof s?.projectId!=='string'||!s.projectId)continue;const item=out[s.projectId]??={lastSentAt:null,sentCount:0};const sent=(Array.isArray(s.results)?s.results:[]).filter(r=>r?.status==='sent').reduce((n,r)=>n+(Array.isArray(r.emails)&&r.emails.length?r.emails.length:1),0);if(sent){item.sentCount+=sent;if(!item.lastSentAt||s.at>item.lastSentAt)item.lastSentAt=s.at;}}return out;}
 };
}
