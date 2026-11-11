import {randomInt} from 'node:crypto';
import {SendError} from './send-request.mjs';
import {safeForCampaign} from './h2-campaign.mjs';

const formatters=new Map();
export function followUpText(value,company){
 const text=String(value||'').replaceAll('[Company]',String(company||'')).trim();
 if(text.length<40||text.length>1500)throw new SendError('follow_up_text must contain 40–1500 characters.');
 if(/^(?:dear|hello|hi)\b/im.test(text)||/(?:^|\n)\s*(?:best regards|kind regards|sincerely)[, ]*$/im.test(text))throw new SendError('follow_up_text must not contain a greeting or signature.');
 return text;
}
export function localParts(time,zone){
 if(!formatters.has(zone))formatters.set(zone,new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}));
 return Object.fromEntries(formatters.get(zone).formatToParts(time).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
}
function localEpoch(p,zone){let guess=Date.UTC(p.year,p.month-1,p.day,p.hour||0,p.minute||0,p.second||0);const target=guess;for(let i=0;i<4;i++){const q=localParts(guess,zone);guess+=target-Date.UTC(q.year,q.month-1,q.day,q.hour,q.minute,q.second);}return guess;}
export function sydneyStart(value){const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);if(!m)throw new SendError('Choose a Sydney date and time.');const [year,month,day,hour,minute]=m.slice(1).map(Number),at=localEpoch({year,month,day,hour,minute},'Australia/Sydney'),p=localParts(at,'Australia/Sydney');if(p.year!==year||p.month!==month||p.day!==day||p.hour!==hour||p.minute!==minute)throw new SendError('Invalid or unavailable Sydney local time.');return new Date(at).toISOString();}
export function inBusinessHours(time,zone){const p=localParts(time,zone),day=new Date(Date.UTC(p.year,p.month-1,p.day)).getUTCDay();return day>=1&&day<=5&&p.hour>=9&&p.hour<17;}
export function nextBusinessSlot(time,zone){
 if(inBusinessHours(time,zone))return time;
 const p=localParts(time,zone),day=new Date(Date.UTC(p.year,p.month-1,p.day));if(p.hour>=17)day.setUTCDate(day.getUTCDate()+1);
 for(let i=0;i<8;i++){if(day.getUTCDay()>=1&&day.getUTCDay()<=5){const candidate=localEpoch({year:day.getUTCFullYear(),month:day.getUTCMonth()+1,day:day.getUTCDate(),hour:9},zone);if(candidate>=time)return candidate;}day.setUTCDate(day.getUTCDate()+1);}throw new SendError('Could not find an Australian working-hour slot.');
}
export function offsetISO(time,zone){
 const p=localParts(time,zone),offset=Math.round((Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-Math.floor(time/1000)*1000)/60000),pad=n=>String(n).padStart(2,'0');
 return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}${offset<0?'-':'+'}${pad(Math.floor(Math.abs(offset)/60))}:${pad(Math.abs(offset)%60)}`;
}
export function projectZone(region){const r=String(region||'');return /Western Australia|^WA$/i.test(r)?'Australia/Perth':/South Australia|^SA$/i.test(r)?'Australia/Adelaide':/Northern Territory|^NT$/i.test(r)?'Australia/Darwin':/Queensland|^QLD$/i.test(r)?'Australia/Brisbane':/Tasmania|^TAS$/i.test(r)?'Australia/Hobart':/Victoria|^VIC$/i.test(r)?'Australia/Melbourne':/New South Wales|Australian Capital|^NSW$|^ACT$/i.test(r)?'Australia/Sydney':null;}
const supportedZone=zone=>{try{new Intl.DateTimeFormat('en',{timeZone:zone}).format();return true;}catch{return false;}};
export function hostedPlan(jobs,records,startAt,{now=Date.now(),gapSeconds=()=>randomInt(120,301),moduleKey='h2-projects',source=moduleKey,regionToZone=projectZone,crmCountry=()=> 'Australia'}={}){
 const requested=Date.parse(startAt);if(!Number.isFinite(requested)||requested<now+600000)throw new SendError('Choose a start at least 10 minutes ahead; no immediate-send fallback is permitted.');
 const map=new Map(records.map(r=>[r.id,r])),pending=[],excluded=[],planned=[],times=[];
 for(const j of jobs.filter(j=>['pending','retryable','invalid'].includes(j.status))){
  const r=map.get(j.recordId),c=r?.contacts?.find(c=>String(c.email||'').toLowerCase()===j.email||(c.emails||[]).some(e=>e.email===j.email));
  if(r?.referralOnly===true){excluded.push({jobId:j.id,recordId:r.id,project:r.name||r.company||r.developer,reason:'Referral/intermediary route — automated scheduling is disabled. Verify and contact the introduced investor separately.'});continue;}
  if(!r||!j.name||!j.email||!c){excluded.push({jobId:j.id,reason:'Named project contact email not found in the current registry.'});continue;}
  const explicit=c.timeZone||c.timezone,zone=explicit||regionToZone(r.region,r);
  if(!supportedZone(zone)){excluded.push({jobId:j.id,reason:'Recipient time zone is missing or invalid; confirm it before booking.'});continue;}
  pending.push({...j,status:'pending',timeZone:zone,timeZoneBasis:explicit?'Contact time zone':'Project-region proxy — confirm recipient location',timeZoneConfirmed:Boolean(explicit),
   crm:{module:moduleKey,recordId:r.id,company:{name:r.developer||r.company||r.name,website:r.domainUrl||r.website||r.sources?.[0]?.url||'',country:crmCountry(r),role:'Project developer / sponsor — current role to confirm',summary:String(r.summary||r.partnership||r.name).slice(0,500)},people:[{email:j.email,name:j.name,title:c.title||c.role||''}]}});
 }
 let cursor=requested,lastCompany='';
 while(pending.length){
  const choices=pending.map((j,i)=>({i,at:nextBusinessSlot(cursor,j.timeZone),same:j.companyKey===lastCompany})).sort((a,b)=>a.at-b.at||Number(a.same)-Number(b.same)||a.i-b.i);const choice=choices[0],job=pending.splice(choice.i,1)[0];let at=choice.at;
  while(times.filter(t=>at-t<3600000).length>=40)at=nextBusinessSlot(times[times.length-40]+3600000,job.timeZone);
  const key=`${moduleKey}:${job.recordId}:${job.email.toLowerCase()}:intro`;
  planned.push({...job,scheduledAt:offsetISO(at,job.timeZone),idempotencyKey:key});times.push(at);lastCompany=job.companyKey;
  const gap=gapSeconds();if(!Number.isInteger(gap)||gap<120||gap>300)throw new SendError('Scheduling gap must be 120–300 seconds.');cursor=at+gap*1000;
 }
 return {jobs:planned,excluded,startAt:new Date(requested).toISOString()};
}

export class HostedBooking {
 constructor({queue,records,verify,client,history,now=Date.now,moduleKey='h2-projects',source=moduleKey,regionToZone=projectZone,crmCountry=()=> 'Australia'}){Object.assign(this,{queue,records,verify,client,history,now,moduleKey,source,regionToZone,crmCountry});this.busy=false;}
 async plan(input){
  if(this.busy)throw new SendError('Booking is already in progress.',409);
  const c=this.queue.snapshot();if(c.id!==input.campaignId||!['ready','paused','planned'].includes(c.status)||c.jobs.some(j=>['booking','uncertain'].includes(j.status)))throw new SendError('Refresh or reconcile the current campaign before planning.',409);
  const plan=hostedPlan(c.jobs,this.records(),input.sydneyStart?sydneyStart(input.sydneyStart):input.startAt,{now:this.now(),moduleKey:this.moduleKey,source:this.source,regionToZone:this.regionToZone,crmCountry:this.crmCountry});
  await this.queue.edit(state=>{const byId=new Map(plan.jobs.map(j=>[j.id,j]));state.jobs=state.jobs.map(j=>byId.get(j.id)||(j.status==='pending'?{...j,scheduledAt:undefined,idempotencyKey:undefined}:j));state.planningExcluded=plan.excluded;state.hostedStartAt=plan.startAt;state.sydneyStart=input.sydneyStart||'';state.status='planned';state.transport='pulse-hosted';state.schedulingHold=state.schedulingHold!==false;state.note='Draft schedule only. No booking has been made. Pulse will execute booked emails independently of this laptop.';});return this.queue.snapshot();
 }
 async book(input){
  if(this.busy)throw new SendError('Booking is already in progress.',409);
  const c=this.queue.snapshot();if(c.id!==input.campaignId||c.status!=='planned'||c.schedulingHold!==false||input.confirmBooking!==true)throw new SendError('Scheduling is on hold. Explicit authorisation is required before booking.',409);
  const eligible=c.jobs.filter(j=>j.status==='pending'&&j.scheduledAt);
  if(eligible.some(j=>!j.timeZoneConfirmed)&&input.acceptProjectTimeZones!==true)throw new SendError('Confirm recipient time zones or explicitly accept the displayed project-region proxies.');
  this.busy=true;
  try{
   for(const job of eligible){
    if(Date.parse(job.scheduledAt)<this.now()+330000)throw new SendError('A timestamp is too close or past. Replan; immediate sending is forbidden.');
    const checked=await this.verify(job.email);if(checked?.email!==job.email||!safeForCampaign(checked,this.now()))throw new SendError(`Reoon blocked ${job.email}; no further bookings attempted.`);
    if(Date.parse(job.scheduledAt)<this.now()+330000)throw new SendError('Verification took too long for this timestamp. Replan; immediate sending is forbidden.');
    const prior=this.history.entries();if(prior.some(e=>e.recipients?.some(p=>p.email===job.email)&&(e.status==='sending'||e.results?.some(r=>['sent','scheduled'].includes(r.status)))))throw new SendError('Recipient already sent, scheduled or uncertain; reconcile history before booking.');
    const payload={to:job.email,subject:job.subject,body_text:job.body,scheduled_at:job.scheduledAt,idempotency_key:job.idempotencyKey,source:this.source,crm:job.crm,follow_up_text:followUpText(job.followUpText||job.follow_up_text,job.crm.company.name)};
    // Pulse owns follow-up timing and signature normalisation. The tailored
    // follow-up text is supplied here without a greeting or signature.
    await this.queue.edit(state=>{state.jobs.find(j=>j.id===job.id).status='booking';});
    const historyId=await this.history.begin({module:this.moduleKey,recordId:job.recordId,recordName:job.project,mode:'separate',subject:job.subject,body:job.body,recipients:[{email:job.email,name:job.name,field:'to',origin:'published'}],calls:()=>[{emails:[job.email],payload}]});
    const result=await this.client.send(payload);
    await this.history.complete(historyId,{results:[{emails:[job.email],...result}],summary:{sent:result.status==='sent'?1:0,scheduled:result.status==='scheduled'?1:0,blocked:result.status==='blocked'?1:0,failed:['sent','scheduled','blocked'].includes(result.status)?0:1}});
    await this.queue.edit(state=>{const saved=state.jobs.find(j=>j.id===job.id);Object.assign(saved,{status:result.status==='scheduled'?'scheduled':result.status==='sent'?'sent':result.status==='blocked'?'blocked':result.httpStatus===503?'retryable':result.httpStatus===400?'invalid':'uncertain',bookingId:result.scheduledId||null,scheduledAt:result.scheduledAt||job.scheduledAt,historyId,error:result.error||''});});
    if(result.status!=='scheduled')throw new SendError(result.status==='sent'?'Pulse sent immediately instead of booking. Campaign stopped; inspect Sent.':result.error||'Booking stopped; reconcile Pulse Scheduled before retrying.');
   }
   await this.queue.edit(state=>{state.status='booked';state.note='Booked in Pulse. Closing or powering off this laptop does not cancel remote bookings. Manage edits/cancellations in Pulse → Scheduled.';});
  }catch(error){await this.queue.edit(state=>{state.status='paused';state.note=error.message;for(const j of state.jobs)if(j.status==='booking'){j.status='uncertain';j.error='Booking outcome uncertain. Reconcile Pulse Scheduled using the same idempotency key.';}});throw error;}
  finally{this.busy=false;}
  return this.queue.snapshot();
 }
}
