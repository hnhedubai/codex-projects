import {mkdir,readFile,writeFile,rename,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
export const defaultSendFile=new URL('./private/sends.json',import.meta.url);

/** Pulse send history in private/sends.json (temp file + rename, previous file kept as .bak). */
export async function createSendStore(file=defaultSendFile){
 const filename=file instanceof URL?fileURLToPath(file):file;
 let state={schemaVersion:1,sends:[]};
 try{const parsed=JSON.parse(await readFile(filename,'utf8'));if(parsed.schemaVersion!==1||!Array.isArray(parsed.sends))throw Error('Invalid send store');state=parsed;}catch(e){if(e.code!=='ENOENT')throw Error('Send history cannot be loaded safely. Restore it from backup; it has not been overwritten.');}
 let queue=Promise.resolve();
 const edit=fn=>{const job=queue.then(async()=>{const next=structuredClone(state);const result=fn(next);await mkdir(path.dirname(filename),{recursive:true});const temp=filename+'.tmp';await writeFile(temp,JSON.stringify(next,null,2));try{await copyFile(filename,filename+'.bak');}catch(e){if(e.code!=='ENOENT')throw e;}await rename(temp,filename);state=next;return result;});queue=job.catch(()=>{});return job;};
 return {
  record:entry=>edit(next=>{const value={id:randomUUID(),at:new Date().toISOString(),...entry};next.sends.push(value);return value;}),
  list:(projectId,limit=20)=>structuredClone(state.sends.filter(s=>s.projectId===projectId).slice(-limit).reverse())
 };
}
