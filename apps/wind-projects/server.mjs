import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {createContactStore} from './contact-store.mjs';
import {createReoon,loadReoonKey,normalizeEmail} from './reoon.mjs';
import {createEnrichmentProviders} from './enrichment.mjs';
export const root = fileURLToPath(new URL('./dist/', import.meta.url));
function resolveHunterDomain(projectId,contact,requested){
 const context=`${contact.name} ${contact.title||''} ${contact.role||''}`.toLowerCase();
 if(projectId==='hexham'&&context.includes('wind prospect'))return'windprospect.com.au';
 if((projectId==='hexham'||projectId==='barn-hill')&&context.includes('agl'))return'agl.com.au';
 return String(requested||'').trim().toLowerCase();
}
const files = new Map([['/wind-projects','index.html'],['/wind-projects/','index.html'],['/wind-projects/app.js','app.js'],['/wind-projects/styles.css','styles.css'],['/wind-projects/data.js','data.js'],['/wind-projects/contacts-ui.js','contacts-ui.js'],['/wind-projects/column-widths.js','column-widths.js']]);
export function createServer({storePromise=createContactStore(),providerPromise=loadReoonKey().then(key=>createReoon(key)),enrichmentPromise=createEnrichmentProviders()}={}){
 const token=randomBytes(32).toString('hex');
 const pending=new Map();
 return http.createServer(async(req,res)=>{
  const pathname = new URL(req.url,'http://localhost').pathname;
  if(pathname.startsWith('/wind-projects/api/')){
   const json=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
   const allowed=new Set([`localhost:${req.socket.localPort}`,`127.0.0.1:${req.socket.localPort}`]);
   if(!allowed.has(req.headers.host)|| (req.headers.origin&&!allowed.has(req.headers.origin.replace(/^http:\/\//,''))) )return json(403,{error:'Local same-origin requests only.'});
   try{
    const store=await storePromise,provider=await providerPromise,enrichment=await enrichmentPromise;
    if(pathname==='/wind-projects/api/contacts'&&req.method==='GET')return json(200,{...store.snapshot(),token,reoonEnabled:provider.enabled,apolloEnabled:enrichment.apolloEnabled,hunterEnabled:enrichment.hunterEnabled});
    if(req.method!=='POST')return json(405,{error:'Method not supported.'});
    if(req.headers['x-wind-token']!==token||!req.headers['content-type']?.startsWith('application/json'))return json(403,{error:'Refresh the workspace before making changes.'});
    let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>32768)return json(413,{error:'Request too large.'});body+=chunk;}
    let input;try{input=JSON.parse(body);}catch{return json(400,{error:'Invalid JSON.'});}
    if(!input||typeof input!=='object')return json(400,{error:'Invalid request.'});
    if(pathname==='/wind-projects/api/contacts/save'){const contact=await store.save(input.projectId,input.contact);return json(200,{contact});}
    if(pathname==='/wind-projects/api/contacts/verify'){
     const contact=store.contacts(input.projectId).find(c=>c.id===input.contactId);
     const email=normalizeEmail(input.email);
     if(!contact||!contact.emails.includes(email))return json(422,{error:'Email must belong to a saved contact.'});
     if(input.force!==true&&/user-reported invalid/i.test(contact.original?.status||contact.status)&&normalizeEmail(contact.original?.email||'')===email)return json(409,{error:'This address was reported invalid; automatic retry is disabled.'});
     const cached=store.check(email);
     // Reuse results to avoid repeated credit use. A new address gets a new check.
     if(cached&&input.force!==true)return json(200,{result:cached,cached:true});
     if(!provider.enabled)return json(503,{error:'Not verified — Reoon unavailable. Configure the server key.'});
     if(pending.size>=2&&!pending.has(email))return json(429,{error:'Two checks are already running. Please wait.'});
     if(!pending.has(email))pending.set(email,(async()=>{const result=await provider.verify(email);await store.recordCheck(result);return result;})().finally(()=>pending.delete(email)));
     return json(200,{result:await pending.get(email),cached:false});
    }
    if(pathname==='/wind-projects/api/contacts/enrich'){
     const contact=store.contacts(input.projectId).find(c=>c.id===input.contactId);if(!contact)return json(422,{error:'Contact not found.'});
     const kind=input.provider,action=input.action||'enrich';let result;
     if(kind==='apollo')result=await enrichment.apollo(contact,{domain:String(input.domain||'').trim()});
     else if(kind==='hunter'&&action==='find-email'){const domain=resolveHunterDomain(input.projectId,contact,input.domain);result=await enrichment.hunterFind(contact,domain);input.resolvedDomain=domain;}
     else if(kind==='hunter'&&action==='verify-email')result=await enrichment.hunterVerify(input.email);
     else return json(422,{error:'Unsupported enrichment action.'});
     await store.recordProviderLookup({provider:kind,action,projectId:input.projectId,contactId:contact.id,input:{domain:input.domain||'',resolvedDomain:input.resolvedDomain||input.domain||'',email:input.email||''},result});
     return json(200,{provider:kind,action,result});
    }
    return json(404,{error:'API route not found.'});
  }catch(e){const message=e.message||'';const safe=/^(Apollo |Hunter |Reoon |Not verified|Invalid |Enter |Use |Source |Name |Contact |Unknown project|This contact)/.test(message)?message:'The local operation failed. No verification success has been assumed.';return json(400,{error:safe});}
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
  if(pathname==='/'){res.writeHead(302,{Location:'/wind-projects'});return res.end();}
  const file=files.get(pathname);
  if(!file){res.writeHead(404);return res.end('Not found');}
  try{const body=await readFile(path.join(root,file));res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(500);res.end('Unable to read application file');}
});}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.WIND_PORT||9601);
 const server=createServer();server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is occupied. No existing service was stopped.`:e.message);process.exitCode=1;});server.listen(port,'127.0.0.1',()=>console.log(`Wind projects: http://localhost:${port}/wind-projects`));
}
