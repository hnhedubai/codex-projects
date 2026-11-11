import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';

// A fresh worker gives every changed research helper a fresh ESM graph. Importing
// source.js with a query string alone would leave its dependencies cached.
if(!isMainThread&&workerData?.investorDirectory){
 const {partnerRecords,partnerContacts}=await import(pathToFileURL(workerData.source).href);
 parentPort.postMessage(partnerRecords.map(record=>({...record,contacts:partnerContacts[record.id]||[]})));
}

export class InvestorContactDirectory {
 constructor(root){this.root=root;this.snapshot=null;this.revision=null;this.pending=null;}
 async overrides(){
  try{
   const value=JSON.parse(await readFile(path.join(this.root,'modules/investors-jv/data/contact-imports.json'),'utf8'));
   return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  }catch{return {};}
 }
 async importContacts(entries,{apply=false}={}){
  const requested=Array.isArray(entries)?entries:[];
  const overrides=await this.overrides(),added=[],updated=[],duplicates=[],conflicts=[],invalid=[];
  const current=await this.read();
  const companies=new Map(current.companies.map(company=>[company.id,company]));
  for(const entry of requested){
   const recordId=String(entry?.recordId||'').trim(),name=String(entry?.name||'').trim(),email=String(entry?.email||'').trim().toLowerCase();
   if(!recordId||!name||!email||!/^\S+@\S+\.\S+$/.test(email)){invalid.push({recordId,name,email,reason:'recordId, name and valid email are required'});continue;}
   const company=companies.get(recordId);if(!company){invalid.push({recordId,name,email,reason:'recordId not found'});continue;}
   const existing=(company.contacts||[]).find(contact=>String(contact.name||'').trim().toLocaleLowerCase()===name.toLocaleLowerCase());
   const imported=(overrides[recordId]||[]).find(contact=>String(contact.name||'').trim().toLocaleLowerCase()===name.toLocaleLowerCase());
   const knownEmail=String(existing?.email||imported?.email||'').trim().toLowerCase();
   if(knownEmail&&knownEmail===email){duplicates.push({recordId,name,email});continue;}
   if(knownEmail&&knownEmail!==email){conflicts.push({recordId,name,email,existingEmail:knownEmail});continue;}
   const contact={name,title:String(entry.title||entry.designation||'').trim(),email,source:String(entry.source||'Google Sheet import').trim(),verification:'Imported from Google Sheet; Reoon verification remains separate'};
   if(existing){updated.push({recordId,name,email});if(apply){const list=overrides[recordId]||[];const index=list.findIndex(item=>String(item.name||'').trim().toLocaleLowerCase()===name.toLocaleLowerCase());if(index>=0)list[index]=contact;else list.push(contact);overrides[recordId]=list;}}
   else{added.push({recordId,name,email});if(apply){const list=overrides[recordId]||[];list.push(contact);overrides[recordId]=list;}}
  }
  if(apply){const target=path.join(this.root,'modules/investors-jv/data/contact-imports.json');const temp=`${target}.tmp`;const {writeFile,rename}=await import('node:fs/promises');await writeFile(temp,JSON.stringify(overrides,null,2)+'\n','utf8');await rename(temp,target);this.snapshot=null;this.revision=null;}
  return {requested:requested.length,added,updated,duplicates,conflicts,invalid,applied:apply};
 }
 async fingerprint(){
  const directory=path.join(this.root,'modules/investors-jv/data');
  const names=(await readdir(directory)).filter(name=>/\.(js|json)$/.test(name)).sort();
  const hash=createHash('sha256');
  for(const name of names){hash.update(name);hash.update(await readFile(path.join(directory,name)));}
  return hash.digest('hex');
 }
 async read(){
  if(this.pending)return this.pending;
  this.pending=this.refresh().finally(()=>{this.pending=null;});return this.pending;
 }
 async refresh(){
  try{
   const revision=await this.fingerprint();
   if(revision!==this.revision){
    const companies=await new Promise((resolve,reject)=>{
     const worker=new Worker(new URL(import.meta.url),{workerData:{investorDirectory:true,source:path.join(this.root,'modules/investors-jv/data/source.js')},execArgv:[]});
     const timeout=setTimeout(()=>{worker.terminate();reject(Error('Research refresh timed out.'));},10000);
     worker.once('message',value=>{clearTimeout(timeout);resolve(value);});
     worker.once('error',error=>{clearTimeout(timeout);reject(error);});
     worker.once('exit',code=>{clearTimeout(timeout);if(code)reject(Error('Research refresh failed.'));});
    });
    if(!Array.isArray(companies)||companies.some(item=>!item.id||!item.company||!Array.isArray(item.contacts)))throw Error('Invalid company directory.');
    // Never publish a snapshot built while the source files were being edited.
    if(await this.fingerprint()!==revision)throw Error('Research is being updated; retrying shortly.');
    const overrides=await this.overrides();
    for(const company of companies){
     for(const imported of overrides[company.id]||[]){
      const index=company.contacts.findIndex(contact=>String(contact.name||'').trim().toLocaleLowerCase()===String(imported.name||'').trim().toLocaleLowerCase());
      if(index>=0)company.contacts[index]={...company.contacts[index],...imported};else company.contacts.push(imported);
     }
    }
    this.snapshot=companies;this.revision=revision;
   }
   return {companies:this.snapshot,revision:this.revision,stale:false};
  }catch(error){
   if(this.snapshot)return {companies:this.snapshot,revision:this.revision,stale:true,error:'Research refresh unavailable. Showing the last successful snapshot; retrying automatically.'};
   throw Error('Contact directory is temporarily unavailable. No saved company data has been changed.');
  }
 }
}
