import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {PulseClient} from './pulse-client.mjs';
import {PulseSendService} from './send-service.mjs';
import {SendModuleRegistry} from './send-modules.mjs';
import {SendRequest,SendError} from './send-request.mjs';

const PREFIX='/api/pulse/';

/** HTTP API for Pulse sending in 8181 (local same-origin only):
    GET  /api/pulse/status           → {enabled, token, modules}
    GET  /api/pulse/<module>/history → {available, generatedAt, projects:{recordId:{…counts, history}}}
    POST /api/pulse/<module>/send    → {id, summary, results}   (X-Pulse-Token header, JSON body) */
export class PulseSendRoutes {
 static async create(root,{client,historyDirectory=process.env.PULSE_HISTORY_DIR||path.join(root,'platform-shell','data','pulse-sends'),deadlineMs,verifyRecipients}={}){
  const pulse=client||await PulseClient.fromEnvironment(root);
  return new PulseSendRoutes({registry:await SendModuleRegistry.open(historyDirectory),service:new PulseSendService({client:pulse,deadlineMs,verifyRecipients:verifyRecipients|| (async()=>{throw new SendError('Reoon send verification is unavailable. Sending is paused.',503);})})});
 }
 #token=randomBytes(32).toString('hex');
 constructor({registry,service}){this.registry=registry;this.service=service;}
 matches(pathname){return pathname.startsWith(PREFIX);}
 static trusted(req){
  const port=req.socket.localPort;const allowed=[`localhost:${port}`,`127.0.0.1:${port}`];
  if(!allowed.includes(req.headers.host))return false;
  if(req.headers.origin&&!allowed.map(host=>`http://${host}`).includes(req.headers.origin))return false;
  return !req.headers['sec-fetch-site']||['same-origin','none'].includes(req.headers['sec-fetch-site']);
 }
 async handle(req,res,url){
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  if(!PulseSendRoutes.trusted(req))return json(403,{error:'Local same-origin requests only.'});
  const [moduleKey,action,...rest]=url.pathname.slice(PREFIX.length).split('/');
  try{
   if(moduleKey==='status'&&!action){
    if(req.method!=='GET')return json(405,{error:'Method not supported.'});
    return json(200,{enabled:this.service.enabled,token:this.#token,modules:Object.fromEntries(this.registry.all().map(module=>[module.key,module.describe()]))});
   }
   const module=this.registry.get(moduleKey);
   if(!module||rest.length)return json(404,{error:'Pulse route not found.'});
   if(action==='history'){
    if(req.method!=='GET')return json(405,{error:'Method not supported.'});
    if(!module.history){console.error(`[pulse-history] ${module.historyError}`);return json(200,{available:false,error:'Send history could not be read'});}
    return json(200,module.history.snapshot());
   }
   if(['send','external-offer','offer-status'].includes(action)){
    if(req.method!=='POST')return json(405,{error:'Method not supported.'});
    if(req.headers['x-pulse-token']!==this.#token||!String(req.headers['content-type']||'').startsWith('application/json'))return json(403,{error:'Reload the page before sending.'});
    let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)return json(413,{error:'Request too large.'});body+=chunk;}
    let input;try{input=JSON.parse(body);}catch{return json(400,{error:'Invalid JSON.'});}
    if(action!=='send'){
     if(module.key!=='investors-jv'||!module.history)throw new SendError('Offer tracking is unavailable.',503);
     if(action==='offer-status')return json(200,await module.history.updateOfferStatus(input.id,input.status));
     const request=SendRequest.parse(input,module),time=Date.parse(input.sentAt);
     if(!request.offerProjects.length||!Number.isFinite(time)||time>Date.now()+60000)throw new SendError('Choose projects and a valid past send date and time.');
     return json(200,await module.history.recordExternal(request,new Date(time).toISOString()));
    }
    return json(200,await this.service.send(module,input));
   }
   return json(404,{error:'Pulse route not found.'});
  }catch(error){
   if(error.status)return json(error.status,{error:error.message});
   console.error(`[pulse-send] ${error.stack||error.message}`);
   return json(500,{error:'The send could not be completed. Check the send history and Pulse Sent before sending again.'});
  }
 }
}
