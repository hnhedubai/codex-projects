import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/* Read-only view of the Wind Projects desk (9601) send history for 8181.
   Reads apps/wind-projects/private/sends.json; never writes, locks or sends. Only whitelisted fields leave this module. */
const here=path.dirname(fileURLToPath(import.meta.url));
export const defaultWindSendsFile=path.resolve(here,'..','..','..','apps','wind-projects','private','sends.json');
export const windSendsFile=()=>process.env.WIND_SENDS_FILE?path.resolve(process.env.WIND_SENDS_FILE):defaultWindSendsFile;

const text=value=>typeof value==='string'?value:'';
const emailCount=result=>Array.isArray(result?.emails)&&result.emails.length?result.emails.length:1;
const publicEntry=send=>({
  at:text(send.at),mode:text(send.mode),subject:text(send.subject),
  recipients:(Array.isArray(send.recipients)?send.recipients:[]).map(item=>({email:text(item?.email),field:text(item?.field)})),
  results:(Array.isArray(send.results)?send.results:[]).map(item=>({emails:(Array.isArray(item?.emails)?item.emails:[]).map(text),status:text(item?.status),error:text(item?.error)}))
});

export function summarizeSends(sends){
  const projects={};
  for(const send of sends){
    if(!send||typeof send.projectId!=='string'||!send.projectId)continue;
    const project=projects[send.projectId]??={lastSentAt:null,sentCount:0,blockedCount:0,failedCount:0,history:[]};
    const entry=publicEntry(send);
    for(const result of entry.results){
      const count=emailCount(result);
      if(result.status==='sent')project.sentCount+=count;
      else if(result.status==='blocked')project.blockedCount+=count;
      else project.failedCount+=count;
    }
    if(entry.results.some(result=>result.status==='sent')&&(!project.lastSentAt||entry.at>project.lastSentAt))project.lastSentAt=entry.at;
    project.history.push(entry);
  }
  for(const project of Object.values(projects))project.history.sort((a,b)=>b.at.localeCompare(a.at));
  return projects;
}

export async function readOutreachStatus(file=windSendsFile(),{log=console.error}={}){
  let raw;
  try{raw=await readFile(file,'utf8');}
  catch(error){
    if(error.code==='ENOENT')return {available:false,projects:{}};
    log(`[wind-outreach-status] ${file}: ${error.message}`);
    return {available:false,error:'Send history could not be read'};
  }
  try{
    const parsed=JSON.parse(raw);
    if(parsed?.schemaVersion!==1||!Array.isArray(parsed.sends))throw Error(`unsupported schemaVersion ${JSON.stringify(parsed?.schemaVersion)}`);
    return {available:true,generatedAt:new Date().toISOString(),projects:summarizeSends(parsed.sends)};
  }catch(error){
    log(`[wind-outreach-status] ${file}: ${error.message}`);
    return {available:false,error:'Send history could not be read'};
  }
}
