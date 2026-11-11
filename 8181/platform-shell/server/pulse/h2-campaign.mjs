import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {randomInt,randomUUID} from 'node:crypto';
import {atomicJson} from '../atomic-json.mjs';
import {SendError} from './send-request.mjs';
import {buildH2Outreach} from '../../../modules/h2-projects/data/outreach-drafts.js';
import {personalise,parseDraft,placeholderPattern} from '../../shared/js/pulse-format.js';

export const H2_SENDER='mubashir@hnh.ae';
export const MIN_GAP=120000,MAX_GAP=300000;
const email=value=>String(value||'').trim().toLowerCase();
export function safeForCampaign(result,now){
 const age=now-Date.parse(result?.checkedAt);
 return result?.provider==='Reoon'&&result.mode==='power'&&result.status==='safe'&&result.deliverable===true&&!result.isRoleAccount&&result.raw?.is_catch_all!==true&&age>=0&&age<=30*86400000;
}
const restriction=c=>[c.roleStatus,c.status,c.emailType,c.title].filter(Boolean).join(' ');
const personal=c=>c.name&&String(c.name).trim().split(/\s+/).length>=2&&!/\b(team|desk|enquiries|inbox)\b/i.test(c.name)&&!/former|historical|candidate|guessed|unconfirmed|not confirmed|not established|likely|shared|generic|company (?:inbox|mailbox|route)|(?:project|team) (?:inbox|mailbox)|audit only/i.test(restriction(c));
const validEmail=value=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);

export function prepareJobs(records,results,history,workflows={},now=Date.now()){
 const seen=new Set(),contacted=new Set(),jobs=[],excluded=[];
 for(const entry of history){
  if(entry.status==='sending')for(const p of entry.recipients||[])contacted.add(email(p.email));
  for(const r of entry.results||[])if(r.status!=='blocked')for(const address of r.emails||[])contacted.add(email(address));
 }
 const subjects=new Set();
 for(const record of records){
  const workflow=workflows[record.id]||{},draft=workflow.outreachDraft?parseDraft(workflow.outreachDraft):buildH2Outreach(record);
  const contacts=[...(record.contacts||[]),...(workflow.contactsAdded||[])];
  if(!contacts.some(c=>personal(c)&&[c.email,...(c.emails||[]).map(e=>e.email)].some(validEmail)))excluded.push({recordId:record.id,project:record.name,reason:'No named contact email recorded for this project.'});
  if(/response received|closed|on hold/i.test([workflow.outreachEmailStatus,workflow.emailStatus,workflow.outreachStage].join(' '))){excluded.push({recordId:record.id,project:record.name,reason:'Response received, closed or on hold in your saved workflow.'});continue;}
  for(const c of contacts){
   const routes=[{email:c.email,source:c.source,type:c.emailType},...(c.emails||[])];
   for(const route of routes){
    const address=email(route.email);if(!validEmail(address))continue;
    const skip=reason=>excluded.push({recordId:record.id,project:record.name,name:c.name,email:address,reason});
    if(!personal(c)||/shared|generic|historical|candidate|guessed|unconfirmed|not established|team (?:inbox|mailbox)/i.test(route.type||'')){skip('Not a confirmed current individual business contact.');continue;}
    if(!/^https?:\/\//i.test(route.source||c.source||'')){skip('Contact publication source is missing.');continue;}
    if(results[address]?.email!==address||!safeForCampaign(results[address],now)){skip('Fresh Reoon Power safe individual mailbox required; no catch-all or shared overrides.');continue;}
    if(contacted.has(address)){skip('Previously sent or attempted in H2 Projects; review history before any further approach.');continue;}
    if(seen.has(address)){skip('Duplicate address across projects; included once.');continue;}
    const body=personalise(draft.body,c.name);
    if(placeholderPattern.test(body)||!body.trim()||/GrynH2|H&H|Dubai|DIFC|\bNDA\b/i.test(body)){skip('Draft needs review: missing placeholder or disallowed sender wording.');continue;}
    const short=String(record.name||record.projectName||'Hydrogen project').replace(/[\r\n]/g,' ').slice(0,160);
    const who=String(c.name).replace(/^(Dr\.?|Prof\.?)\s+/i,'').split(/\s+/)[0];
    const choices=['partnership priorities','development collaboration','next-stage partner discussion','commercial participation','project collaboration','development requirements','strategic partnership enquiry','partner process'];
    let subject;
    for(let n=0;n<1000;n++){
     const candidate=`${short} — ${who}, ${choices[n%choices.length]}${n>=choices.length?` — ${c.name}`:''}${n>=choices.length*2?` (${n})`:''}`;
     if(!subjects.has(candidate.toLowerCase())){subject=candidate;break;}
    }
    if(!subject||subject.length>300||placeholderPattern.test(subject)){skip('A distinct valid subject could not be prepared.');continue;}
    subjects.add(subject.toLowerCase());seen.add(address);
    jobs.push({id:randomUUID(),recordId:record.id,project:record.name,company:record.developer,companyKey:address.split('@')[1],name:c.name,email:address,source:route.source||c.source,origin:'published',subject,body,status:'pending',preparedVerification:results[address]});
   }
  }
 }
 // Round-robin company domains: spread colleagues across the campaign when possible.
 const groups=new Map();for(const job of jobs){if(!groups.has(job.companyKey))groups.set(job.companyKey,[]);groups.get(job.companyKey).push(job);}
 const ordered=[];while([...groups.values()].some(g=>g.length))for(const group of groups.values())if(group.length)ordered.push(group.shift());
 return {jobs:ordered,excluded};
}

export class H2Campaign {
 static async open(root,options){
  const file=path.join(root,'platform-shell/data/h2-outreach-campaign.json');let state={version:1,campaign:null};
  try{state=JSON.parse(await readFile(file,'utf8'));if(state.version!==1||!('campaign'in state)||state.campaign&&(!Array.isArray(state.campaign.jobs)||!['ready','planned','booking','booked','scheduled','running','paused','completed','cancelled'].includes(state.campaign.status)))throw Error('Unsupported campaign store');}
  catch(error){if(error.code!=='ENOENT')throw new SendError('Campaign store cannot be read safely; restore it before sending. Existing files were not overwritten.',503);}
  const queue=new H2Campaign({file,state,...options});
  if(state.campaign?.status==='booking'||state.campaign?.jobs.some(j=>j.status==='booking'))await queue.edit(c=>{c.status='paused';c.note='Booking interrupted. Reconcile Pulse Scheduled using the existing keys before retrying.';for(const j of c.jobs)if(j.status==='booking')j.status='uncertain';});
  if(state.campaign?.status==='running'||state.campaign?.jobs.some(j=>j.status==='sending'))await queue.edit(c=>{c.status='paused';c.note='Server restarted. Review send history and resume explicitly.';for(const j of c.jobs)if(j.status==='sending'){j.status='uncertain';j.error='Interrupted send; check Pulse Sent. Never retried automatically.';}});
  return queue;
 }
 constructor({file,state={version:1,campaign:null},records,results,verify,history,send,now=Date.now,persist=atomicJson,gap=()=>randomInt(MIN_GAP,MAX_GAP+1)}){Object.assign(this,{file,state,records,results,verify,history,send,now,persist,gap});this.serial=Promise.resolve();this.busy=false;this.fault='';}
 snapshot(){return {...structuredClone(this.state.campaign||{status:'empty',jobs:[],excluded:[]}),...(this.fault?{status:'paused'}:{}),error:this.fault,minGapSeconds:120,maxGapSeconds:300,sender:H2_SENDER};}
 get reserved(){return this.busy||['ready','scheduled','running','paused'].includes(this.state.campaign?.status)&&this.state.campaign.jobs.some(j=>['pending','sending','uncertain'].includes(j.status));}
 edit(change){const job=this.serial.then(async()=>{if(this.fault)throw new SendError(this.fault,503);const next=structuredClone(this.state);const result=change(next.campaign,next);await this.persist(this.file,next);this.state=next;return result;});this.serial=job.catch(()=>{});return job;}
 async prepare(workflows={}){
  if(!workflows||typeof workflows!=='object'||Array.isArray(workflows))throw new SendError('Saved workflow data must be an object.');
  for(const item of Object.values(workflows))if(!item||typeof item!=='object'||item.outreachDraft!==undefined&&(typeof item.outreachDraft!=='string'||item.outreachDraft.length>20000)||item.contactsAdded!==undefined&&(!Array.isArray(item.contactsAdded)||item.contactsAdded.length>100))throw new SendError('Invalid saved drafts or added-contact list.');
  if(this.busy||['running','scheduled'].includes(this.state.campaign?.status))throw new SendError('Pause the current campaign before preparing another.',409);
  if(this.state.campaign?.jobs.some(j=>['sending','uncertain'].includes(j.status)))throw new SendError('Reconcile uncertain sends before replacing the campaign.',409);
  const {jobs,excluded}=prepareJobs(this.records(),this.results(),this.history(),workflows,this.now());
  await this.edit((c,next)=>{next.campaign={id:randomUUID(),createdAt:new Date(this.now()).toISOString(),status:'ready',schedulingHold:true,transport:'pulse-hosted',sender:H2_SENDER,senderConfirmation:'User confirmed the self-preview sender on 2026-11-04.',jobs,excluded,nextAt:null,lastCompletedAt:null,gapMs:null,note:'Prepared only. Scheduling is on hold until explicitly authorised.'};});
  return this.snapshot();
 }
 async command(input){
  if(input.command==='prepare')return this.prepare(input.workflows||{});
  if(!this.state.campaign||input.campaignId!==this.state.campaign.id)throw new SendError('Campaign changed; refresh before continuing.',409);
  if(!['start','schedule','pause','resume','cancel','remove'].includes(input.command))throw new SendError('Unknown campaign command.');
  await this.edit(c=>{
   if(input.command==='remove'){const j=c.jobs.find(j=>j.id===input.jobId);if(['running','scheduled'].includes(c.status)||j?.status!=='pending')throw new SendError('Pause and select a pending recipient first.');j.status='removed';return;}
   if(input.command==='pause'){if(['running','scheduled'].includes(c.status)){c.status='paused';c.note='Paused. Any email already in flight must finish; no next email will start.';}return;}
   if(input.command==='cancel'){c.status='cancelled';for(const j of c.jobs)if(j.status==='pending')j.status='cancelled';return;}
   if(!['ready','paused'].includes(c.status)||!c.jobs.some(j=>j.status==='pending')||c.jobs.some(j=>j.status==='uncertain'))throw new SendError('No startable queue, or an uncertain send needs review.');
   if(input.command==='schedule'){
    const startAt=Date.parse(input.startAt);
    if(!Number.isFinite(startAt)||startAt<this.now()+60000||startAt>this.now()+7*86400000)throw new SendError('Choose a start between one minute and seven days from now.');
    c.status='scheduled';c.scheduledAt=startAt;c.nextAt=Math.max(startAt,c.lastCompletedAt?c.lastCompletedAt+(c.gapMs||MIN_GAP):startAt);c.timeZone='Australia/Sydney';c.note='Scheduled start. Keep the computer awake and localhost:8181 running. If the start is missed by over 15 minutes, the queue pauses for review.';return;
   }
   c.status='running';c.note='One recipient at a time. A random 120–300 second wait follows every completed attempt.';
   if(c.nextAt===null){c.gapMs=this.checkedGap();c.nextAt=this.now()+c.gapMs;}
  });return this.snapshot();
 }
 checkedGap(){const value=this.gap();if(!Number.isInteger(value)||value<MIN_GAP||value>MAX_GAP)throw new SendError('Invalid delay; campaign stopped.',503);return value;}
 startTimer(){this.timer=setInterval(()=>this.tick().catch(()=>{}),1000);this.timer.unref();}
 close(){clearInterval(this.timer);}
 async tick(){
  if(this.busy||this.fault||!['running','scheduled'].includes(this.state.campaign?.status)||this.now()<this.state.campaign.nextAt)return false;
  this.busy=true;let job;
  try{
   await this.edit(c=>{
    if(c.status==='scheduled'){
     if(this.now()-c.scheduledAt>15*60000){c.status='paused';c.note='Scheduled start missed by over 15 minutes. Review and resume explicitly; no catch-up burst will occur.';return;}
     c.status='running';c.note='Scheduled campaign running; random 2–5 minute gaps after each attempt.';
    }
    if(c.status!=='running'||this.now()<c.nextAt)return;job=c.jobs.find(j=>j.status==='pending');if(!job){c.status='completed';return;}job.status='sending';job.startedAt=new Date(this.now()).toISOString();job=structuredClone(job);
   });
   if(!job)return false;
   let result,error='';
   try{
    const checked=await this.verify(job.email);
    if(checked?.email!==job.email||!safeForCampaign(checked,this.now()))result={summary:{sent:0,blocked:1,failed:0},results:[{status:'blocked',error:'Reoon no longer reports a fresh safe individual mailbox.'}]};
    else if(this.state.campaign.status!=='running'){
     await this.edit(c=>{const saved=c.jobs.find(j=>j.id===job.id);saved.status=c.status==='cancelled'?'cancelled':'pending';delete saved.startedAt;});return false;
    }else result=await this.send({recordId:job.recordId,recordName:job.project,mode:'separate',subject:job.subject,body:job.body,recipients:[{email:job.email,name:job.name,origin:job.origin}]});
   }catch(e){error=e.message;}
   const completed=this.now(),delay=this.checkedGap();
   await this.edit(c=>{const saved=c.jobs.find(j=>j.id===job.id);saved.completedAt=new Date(completed).toISOString();saved.historyId=result?.id||null;saved.error=error||result?.results?.find(r=>r.status!=='sent')?.error||'';
    saved.status=result?.summary?.sent===1?'sent':result?.summary?.blocked===1?'blocked':'uncertain';
    c.lastCompletedAt=completed;c.gapMs=delay;c.nextAt=completed+delay;
    if(saved.status!=='sent'){if(c.status!=='cancelled')c.status='paused';c.note='Verification or sending stopped. Review the result before any further email.';}
    else if(c.status==='running'&&!c.jobs.some(j=>j.status==='pending')){c.status='completed';c.note='Campaign completed.';}
   });return true;
  }catch(error){this.fault='Campaign paused because persistence or processing failed. Review stored history before resuming: '+error.message;return false;}
  finally{this.busy=false;}
 }
}
