import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {PulseClient} from './pulse-client.mjs';
import {PulseSendService} from './send-service.mjs';
import {RecordIndex} from './crm-hint.mjs';
import {SendModuleRegistry} from './send-modules.mjs';
import {SendRequest,SendError} from './send-request.mjs';
import {H2Campaign} from './h2-campaign.mjs';
import {HostedBooking} from './hosted-schedule.mjs';

const PREFIX='/api/pulse/';

/** HTTP API for Pulse sending in 8181 (local same-origin only):
    GET  /api/pulse/status           → {enabled, token, modules}
    GET  /api/pulse/<module>/history → {available, generatedAt, projects:{recordId:{…counts, history}}}
    POST /api/pulse/<module>/send    → {id, summary, results}   (X-Pulse-Token header, JSON body) */
export class PulseSendRoutes {
 static async create(root,{client,historyDirectory=process.env.PULSE_HISTORY_DIR||path.join(root,'platform-shell','data','pulse-sends'),deadlineMs,verifyRecipients,campaign}={}){
  const pulse=client||await PulseClient.fromEnvironment(root);
  const routes=new PulseSendRoutes({registry:await SendModuleRegistry.open(historyDirectory),service:new PulseSendService({client:pulse,deadlineMs,records:new RecordIndex(root),verifyRecipients:verifyRecipients|| (async()=>{throw new SendError('Reoon send verification is unavailable. Sending is paused.',503);})})});
  if(campaign){try{
   routes.campaign=await H2Campaign.open(root,{...campaign,history:()=>{const history=routes.registry.get('h2-projects')?.history;if(!history)throw new SendError('H2 send history is unavailable.',503);return history.entries();},send:input=>routes.service.send(routes.registry.get('h2-projects'),input)});
   // Hosted Pulse is the only production scheduling engine. Never start the
   // laptop timer; a legacy local schedule is paused during migration.
   if(routes.campaign.state.campaign)await routes.campaign.edit(c=>{c.schedulingHold=c.schedulingHold!==false;c.transport='pulse-hosted';if(['running','scheduled'].includes(c.status)){c.status='paused';c.schedulingHold=true;c.note='Local timer disabled. Plan and book through Pulse hosted scheduling.';}});
   routes.booking=new HostedBooking({queue:routes.campaign,records:campaign.records,verify:campaign.verify,client:pulse,history:routes.registry.get('h2-projects').history});
  }catch(error){routes.campaignError=error.message;}}
  return routes;
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
   if(action==='campaign'&&module.key==='h2-projects'&&req.method==='GET')return json(200,this.campaign?.snapshot()||{status:'unavailable',jobs:[],excluded:[],error:this.campaignError||'Campaign is unavailable.'});
   if(['send','external-offer','offer-status','campaign'].includes(action)){
    if(req.method!=='POST')return json(405,{error:'Method not supported.'});
    if(req.headers['x-pulse-token']!==this.#token||!String(req.headers['content-type']||'').startsWith('application/json'))return json(403,{error:'Reload the page before sending.'});
    let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>(action==='campaign'?524288:65536))return json(413,{error:'Request too large.'});body+=chunk;}
    let input;try{input=JSON.parse(body);}catch{return json(400,{error:'Invalid JSON.'});}
    if(action==='campaign'){
     if(module.key!=='h2-projects'||!this.campaign)throw new SendError('H2 campaign is unavailable.',503);
     if(!input||typeof input!=='object'||Array.isArray(input))throw new SendError('Campaign command required.');
     if(['start','resume','schedule'].includes(input.command))throw new SendError('Local send timers are disabled. Plan and book with Pulse hosted scheduling.');
     if(input.command==='plan')return json(200,await this.booking.plan(input));
     if(input.command==='book')return json(200,await this.booking.book(input));
     if(input.command==='release-hold'){
      if(input.campaignId!==this.campaign.snapshot().id||input.confirm!=='AUTHORISE_PULSE_BOOKING')throw new SendError('Explicit booking authorisation required.');
      await this.campaign.edit(c=>{c.schedulingHold=false;c.note='Scheduling hold released explicitly; review the plan before booking.';});return json(200,this.campaign.snapshot());
     }
     if(this.booking.busy)throw new SendError('Wait for the current booking operation before changing the queue.',409);
     if(input.command==='cancel'&&this.campaign.snapshot().jobs.some(j=>j.status==='scheduled'))throw new SendError('Remote bookings must be cancelled in Pulse → Scheduled. A local cancel would not stop those emails.');
     return json(200,await this.campaign.command(input));
    }
    if(action!=='send'){
     if(module.key!=='investors-jv'||!module.history)throw new SendError('Offer tracking is unavailable.',503);
     if(action==='offer-status')return json(200,await module.history.updateOfferStatus(input.id,input.status));
     const request=SendRequest.parse(input,module),time=Date.parse(input.sentAt);
     if(!request.offerProjects.length||!Number.isFinite(time)||time>Date.now()+60000)throw new SendError('Choose projects and a valid past send date and time.');
     return json(200,await module.history.recordExternal(request,new Date(time).toISOString()));
    }
    if(module.key==='h2-projects'&&(this.campaign?.reserved||this.booking?.busy))throw new SendError('The H2 campaign owns the send queue. Review its pending or booked recipients before using manual send.',409);
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
