import {readFile,copyFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {atomicJson} from '../atomic-json.mjs';

const SCHEMA_VERSION=1;
const emailCount=result=>Array.isArray(result?.emails)&&result.emails.length?result.emails.length:1;

/** Send history for one module: platform-shell/data/pulse-sends/<module>.json.
    Entries are never deleted. A send is recorded as "sending" before Pulse is called and completed afterwards,
    so an interrupted send is still visible. Writes are serialised, atomic (temp file + rename) and keep a .bak. */
export class SendHistoryStore {
 static async open(file,{now=()=>new Date().toISOString()}={}){
  let state={schemaVersion:SCHEMA_VERSION,sends:[]};
  try{
   const parsed=JSON.parse(await readFile(file,'utf8'));
   if(parsed?.schemaVersion!==SCHEMA_VERSION||!Array.isArray(parsed.sends))throw Error('unsupported schema');
   state=parsed;
  }catch(error){
   if(error.code!=='ENOENT')throw Object.assign(Error(`Send history ${file} cannot be read safely (${error.message}). Restore it from the .bak file; it has not been overwritten.`),{status:503});
  }
  return new SendHistoryStore(file,state,now);
 }
 #file;#state;#queue=Promise.resolve();#now;
 constructor(file,state,now){this.#file=file;this.#state=state;this.#now=now;}
 #edit(change){
  const job=this.#queue.then(async()=>{
   const next=structuredClone(this.#state);const result=change(next);
   try{await copyFile(this.#file,this.#file+'.bak');}catch(error){if(error.code!=='ENOENT')throw error;}
   await atomicJson(this.#file,next);this.#state=next;return result;
  });
  this.#queue=job.catch(()=>{});return job;
 }
 /** Records a send before any Pulse call. Returns the entry id. */
 begin(request){
  const entry={id:randomUUID(),at:this.#now(),status:'sending',module:request.module,recordId:request.recordId,recordName:request.recordName,mode:request.mode,subject:request.subject,body:request.body,
   recipients:request.recipients.map(({email,name,field,origin})=>({email,name,field,origin})),results:[],summary:{sent:0,blocked:0,failed:0}};
  return this.#edit(next=>{next.sends.push(entry);return entry.id;});
 }
 complete(id,{results,summary}){
  return this.#edit(next=>{
   const entry=next.sends.find(item=>item.id===id);if(!entry)throw Error('Send history entry not found.');
   Object.assign(entry,{status:'done',completedAt:this.#now(),summary,
    results:results.map(({emails,status,httpStatus,error,emailMessageId,replay})=>({emails,status,httpStatus:httpStatus??0,error:error||'',emailMessageId:emailMessageId||null,replay:!!replay}))});
   return structuredClone(entry);
  });
 }
 entries(){return structuredClone(this.#state.sends);}
 /** Browser view: per record counts and newest-first history. No Pulse message IDs or HTTP internals. */
 snapshot(){
  const projects={};
  for(const send of this.#state.sends){
   const project=projects[send.recordId]??={lastSentAt:null,sentCount:0,blockedCount:0,failedCount:0,pendingCount:0,history:[]};
   if(send.status==='sending')project.pendingCount+=1;
   for(const result of send.results){
    const count=emailCount(result);
    if(result.status==='sent')project.sentCount+=count;else if(result.status==='blocked')project.blockedCount+=count;else project.failedCount+=count;
   }
   if(send.results.some(result=>result.status==='sent')&&(!project.lastSentAt||send.at>project.lastSentAt))project.lastSentAt=send.at;
   project.history.push({id:send.id,at:send.at,status:send.status,mode:send.mode,subject:send.subject,
    recipients:send.recipients.map(({email,name,field})=>({email,name,field})),
    results:send.results.map(({emails,status,error})=>({emails,status,error}))});
  }
  for(const project of Object.values(projects))project.history.sort((a,b)=>b.at.localeCompare(a.at));
  return {available:true,generatedAt:this.#now(),projects};
 }
}
