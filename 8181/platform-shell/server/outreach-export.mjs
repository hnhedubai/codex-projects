import {mkdir,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {partnerRecords,partnerContacts} from '../../modules/investors-jv/data/source.js';
import {listedProjects} from '../../modules/listed-projects/data/source.js';
import {buildOutreachExport} from '../../modules/investors-jv/outreach-export.js';

/** GET generates an artifact only. It cannot accept record changes, a destination or remote URLs. */
export class OutreachExportRoute {
 constructor(root,{partners=partnerRecords,contacts=partnerContacts,projects=listedProjects,now=()=>new Date()}={}){Object.assign(this,{root,partners,contacts,projects,now});this.pending=Promise.resolve();}
 matches(pathname){return pathname==='/api/outreach-data/export';}
 async handle(req,res){
  const send=(status,body,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(body);};
  if(req.method!=='GET')return send(405,JSON.stringify({error:'GET export only.'}),{Allow:'GET'});
  // Same-origin fetch is mandatory, in addition to server.mjs's unchanged local-host boundary.
  if(req.headers['sec-fetch-site']!=='same-origin'||req.headers['x-outreach-export']!=='1')return send(403,JSON.stringify({error:'Use Export outreach data (JSON) inside 8181.'}));
  let body;
  try{
   const encoded=req.headers['x-outreach-state']||'';
   if(typeof encoded!=='string'||encoded.length>12000||!/^[-A-Za-z0-9+/=]*$/.test(encoded))throw Error('Export state is too large or invalid.');
   const state=encoded?JSON.parse(Buffer.from(encoded,'base64').toString('utf8')):{favourites:[],companies:{}};
   body=JSON.stringify(buildOutreachExport({partners:this.partners,contacts:this.contacts,projects:this.projects,state,now:this.now()}),null,2)+'\n';
  }catch(error){return send(422,JSON.stringify({error:error.message}));}
  const job=this.pending.catch(()=>{}).then(()=>this.save(body));this.pending=job;
  try{await job;}catch{return send(500,JSON.stringify({error:'The project-folder export could not be saved. No records were changed; retry the export.'}));}
  return send(200,body,{'Content-Disposition':'attachment; filename="outreach-data.json"'});
 }
 async save(body){
  const directory=path.join(this.root,'exports');await mkdir(directory,{recursive:true});
  const temporary=path.join(directory,`.outreach-${randomUUID()}.tmp`);
  try{await writeFile(temporary,body,{encoding:'utf8',flag:'wx'});await rename(temporary,path.join(directory,'outreach-data.json'));}
  finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
 }
}
