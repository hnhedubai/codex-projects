import {SendError,SendRequest} from './send-request.mjs';
import {PulseClient} from './pulse-client.mjs';
import {checkAnonymity,ANONYMITY_WARNING} from '../../../modules/investors-jv/outreach-policy.js';

/** Runs one send at a time: validate → record "sending" → Pulse calls within a deadline → record results. */
export class PulseSendService {
 static SEND_DEADLINE_MS=90000;
 #busy=false;
 constructor({client,deadlineMs=PulseSendService.SEND_DEADLINE_MS,now=()=>Date.now()}){this.client=client;this.deadlineMs=deadlineMs;this.now=now;}
 get enabled(){return this.client.enabled;}
 async send(module,input){
  const request=SendRequest.parse(input,module);
  const calls=request.calls();
  if(module.key==='investors-jv'&&(!checkAnonymity(`${request.subject}\n${request.body}`).safe||calls.some(call=>!checkAnonymity(`${call.payload.subject}\n${call.payload.body_text}`).safe)))throw new SendError(ANONYMITY_WARNING);
  if(!module.history)throw new SendError(`${module.label} send history cannot be read, so sending is paused. ${module.historyError}`,503);
  if(!this.client.enabled)throw new SendError('Pulse is not connected. Set PULSE_SEND_KEY and restart 8181.',503);
  if(this.#busy)throw new SendError('A Pulse send is already in progress. Wait for it to finish.',409);
  this.#busy=true;
  try{
   const id=await module.history.begin(request);
   const results=await this.#run(calls);
   const summary={sent:0,blocked:0,failed:0};for(const result of results)summary[result.status==='sent'||result.status==='blocked'?result.status:'failed']+=result.emails.length;
   const entry=await module.history.complete(id,{results,summary});
   return {id,summary,results:entry.results.map(({emails,status,error})=>({emails,status,error}))};
  }finally{this.#busy=false;}
 }
 async #run(calls){
  const stop=this.now()+this.deadlineMs;const results=[];
  for(const call of calls){
   const remaining=stop-this.now();
   if(remaining<=0){results.push({emails:call.emails,status:'failed',httpStatus:0,error:'Not attempted — time limit. Send again to continue.'});continue;}
   results.push({emails:call.emails,...await this.client.send(call.payload,{timeoutMs:Math.min(PulseClient.CALL_TIMEOUT_MS,remaining)})});
  }
  return results;
 }
}
