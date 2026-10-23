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
   recipients:request.recipients.map(({email,name,field,origin})=>({email,name,field,origin})),
   offerProjects:structuredClone(request.offerProjects||[]),verification:structuredClone(request.verification||[]),...(request.catchAllOverride?.length?{catchAllOverride:[...request.catchAllOverride]}:{}),
   ...(request.disposableOverride?.length?{disposableOverride:[...request.disposableOverride]}:{}),
   messages:request.calls().map(({emails,payload})=>({emails,subject:payload.subject,body:payload.body_text})),
   results:[],summary:{sent:0,blocked:0,failed:0}};
  return this.#edit(next=>{next.sends.push(entry);return entry.id;});
 }
 complete(id,{results,summary,pulseVerification=[]}){
  return this.#edit(next=>{
   const entry=next.sends.find(item=>item.id===id);if(!entry)throw Error('Send history entry not found.');
   Object.assign(entry,{status:'done',completedAt:this.#now(),summary,...(pulseVerification.length?{pulseVerification:structuredClone(pulseVerification)}:{}),
    results:results.map(({emails,status,httpStatus,error,emailMessageId,replay,attemptedAt,completedAt})=>({emails,status,httpStatus:httpStatus??0,error:error||'',emailMessageId:emailMessageId||null,replay:!!replay,...(attemptedAt?{attemptedAt}:{}),...(completedAt?{completedAt}:{})}))});
   return structuredClone(entry);
  });
 }
 entries(){return structuredClone(this.#state.sends);}
 recordExternal(request,sentAt){
  const entry={id:randomUUID(),at:sentAt,recordedAt:this.#now(),completedAt:sentAt,status:'done',module:request.module,recordId:request.recordId,recordName:request.recordName,mode:request.mode,subject:request.subject,body:request.body,source:'external-manual',offerProjects:structuredClone(request.offerProjects),recipients:structuredClone(request.recipients),messages:request.recipients.map(person=>({emails:[person.email],subject:request.subject,body:request.body})),results:[{emails:request.recipients.map(person=>person.email),status:'sent',reported:true}],summary:{sent:request.recipients.length,blocked:0,failed:0}};
  return this.#edit(next=>{next.sends.push(entry);return {id:entry.id};});
 }
 updateOfferStatus(id,status){
  const allowed=['Awaiting response','Interested','Declined','NDA requested','Details disclosed'];
  if(!allowed.includes(status))throw Object.assign(Error('Invalid offer status.'),{status:422});
  return this.#edit(next=>{const entry=next.sends.find(item=>item.id===id);if(!entry)throw Object.assign(Error('Offer not found.'),{status:404});const event={at:this.#now(),status};entry.offerStatus=status;(entry.offerEvents??=[]).push(event);return event;});
 }
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
   project.history.push({id:send.id,at:send.at,status:send.status,mode:send.mode,subject:send.subject,verification:send.verification||[],...(send.catchAllOverride?.length?{catchAllOverride:[...send.catchAllOverride]}:{}),
    ...(send.module==='investors-jv'?{recordId:send.recordId,recordName:send.recordName,completedAt:send.completedAt||null,recordedAt:send.recordedAt||null,source:send.source||'pulse',body:send.body,offerProjects:send.offerProjects||[],messages:send.messages||[],offerStatus:send.offerStatus||'',offerEvents:send.offerEvents||[]}:{}),
    recipients:send.recipients.map(({email,name,field})=>({email,name,field})),
    results:send.results.map(({emails,status,error,attemptedAt,completedAt,replay,reported})=>({emails,status,error,...(attemptedAt?{attemptedAt,completedAt}:{}),...(replay?{replay:true}:{}),...(reported?{reported:true}:{})}))});
  }
  for(const project of Object.values(projects))project.history.sort((a,b)=>b.at.localeCompare(a.at));
  return structuredClone({available:true,generatedAt:this.#now(),projects});
 }
}
