import test from 'node:test';
import assert from 'node:assert/strict';
import {hostedPlan,inBusinessHours,offsetISO,sydneyStart,HostedBooking,followUpText} from './hosted-schedule.mjs';
import {PulseClient} from './pulse-client.mjs';
import {prepareJobs} from './h2-campaign.mjs';
const now=Date.parse('2026-11-04T12:00:00Z'),start='2026-11-05T10:30:00+11:00';
function fixtures(count=8){const zones=['New South Wales','Victoria','Tasmania','Queensland','South Australia','Western Australia','Northern Territory','Australian Capital Territory'];const records=Array.from({length:count},(_,i)=>({id:'p'+i,name:'Hydrogen '+i,country:'Australia',region:zones[i%zones.length],developer:'Developer '+i,domainUrl:'https://example.com',summary:'A project awaiting partner qualification.',contacts:[{name:'Person '+i,email:`person${i}@example.com`,title:'Director',source:'https://example.com/team',emailType:'Published individual business email'}]}));const jobs=records.map((r,i)=>({id:'j'+i,recordId:r.id,project:r.name,company:r.developer,companyKey:'company'+i,name:r.contacts[0].name,email:r.contacts[0].email,body:'Dear Person,\n\nProject discussion.\n\nBest regards,\nMubashir',subject:'Hydrogen '+i+' partnership',followUpText:'Following up on the earlier note regarding [Company]. Please let me know who handles the next discussion, and I will share a concise project summary for review.',status:'pending'}));return {records,jobs};}
const safe=email=>({email,provider:'Reoon',mode:'power',status:'safe',deliverable:true,checkedAt:new Date(now).toISOString()});

test('each planned timestamp is a weekday 09–17 Australian local slot with an ISO offset',()=>{
 const f=fixtures(),out=hostedPlan(f.jobs,f.records,start,{now,gapSeconds:()=>120});assert.equal(out.jobs.length,8);
 for(const job of out.jobs){assert(inBusinessHours(Date.parse(job.scheduledAt),job.timeZone));assert.match(job.scheduledAt,/\+\d\d:\d\d$/);assert.equal(job.crm.company.country,'Australia');assert(job.crm.people[0].name);}
 assert.equal(sydneyStart('2026-11-05T10:30'),'2026-11-04T23:30:00.000Z');
 assert.match(offsetISO(Date.parse(start),'Australia/Adelaide'),/\+10:30$/);assert.match(offsetISO(Date.parse(start),'Australia/Darwin'),/\+09:30$/);assert.match(offsetISO(Date.parse(start),'Australia/Perth'),/\+08:00$/);
});
test('2–5 minute timestamp gaps and rolling 40/hour ceiling hold for a large same-zone queue',()=>{
 const f=fixtures(100);for(const r of f.records)r.region='New South Wales';const out=hostedPlan(f.jobs,f.records,start,{now,gapSeconds:()=>120});const times=out.jobs.map(j=>Date.parse(j.scheduledAt));
 for(let i=1;i<times.length;i++){const delta=times[i]-times[i-1];assert(delta>=120000&&delta<=300000);assert(times.filter(t=>t<=times[i]&&t>times[i]-3600000).length<=40);}
});
test('weekend and after-hours spillover moves to next workday without squeezing gaps',()=>{
 const f=fixtures(4);for(const r of f.records)r.region='New South Wales';const out=hostedPlan(f.jobs,f.records,'2026-11-06T16:59:00+11:00',{now,gapSeconds:()=>300});
 assert.match(out.jobs[0].scheduledAt,/2026-11-06T16:59/);assert.match(out.jobs[1].scheduledAt,/2026-11-09T09:00/);assert(out.jobs.every(j=>inBusinessHours(Date.parse(j.scheduledAt),j.timeZone)));
});
test('keys are stable across replans and no-contact / unknown-zone projects are excluded',()=>{
 const f=fixtures();f.records[0].contacts=[];f.records[1].region='Australia-wide';const a=hostedPlan(f.jobs,f.records,start,{now,gapSeconds:()=>120}),b=hostedPlan(f.jobs,f.records,'2026-11-05T11:00:00+11:00',{now,gapSeconds:()=>300});assert.equal(a.excluded.length,2);for(const job of a.jobs){assert.equal(job.idempotencyKey,b.jobs.find(j=>j.id===job.id).idempotencyKey);assert.equal(job.idempotencyKey,`h2-projects:${job.recordId}:${job.email}:intro`);}
 const missing=prepareJobs([{id:'no-email',name:'No email',contacts:[]}],{},[],{},now);assert.match(missing.excluded[0].reason,/No named contact email/);
});
test('Solar/Wind mode uses its own module, source and recipient country metadata',()=>{
 const f=fixtures(1);f.records[0].country='Poland';f.records[0].region='Europe';
 const out=hostedPlan(f.jobs,f.records,start,{now,gapSeconds:()=>120,moduleKey:'investors-jv',source:'solar-wind-investors-jv',regionToZone:()=> 'Europe/Warsaw',crmCountry:record=>record.country});
 assert.equal(out.jobs[0].idempotencyKey,'investors-jv:p0:person0@example.com:intro');
 assert.equal(out.jobs[0].crm.module,'investors-jv');assert.equal(out.jobs[0].crm.company.country,'Poland');assert.equal(out.jobs[0].timeZone,'Europe/Warsaw');
});
function bookingFixture(result={status:'scheduled',scheduledId:'booking-id'}){
 const f=fixtures(1),plan=hostedPlan(f.jobs,f.records,start,{now,gapSeconds:()=>120});let state={id:'campaign',status:'planned',schedulingHold:false,jobs:plan.jobs},calls=[],entries=[],historyResults=[];
 const queue={snapshot:()=>structuredClone(state),edit:async fn=>fn(state)};
 const booking=new HostedBooking({queue,records:()=>f.records,verify:async email=>safe(email),client:{send:async payload=>{calls.push(payload);return {...result,scheduledAt:payload.scheduled_at};}},history:{entries:()=>entries,begin:async req=>{entries.push(req);return 'history-id';},complete:async(id,value)=>historyResults.push(value)},now:()=>now});return {booking,queue,calls,historyResults,setHold:()=>{state.schedulingHold=true;}};
}
test('hosted booking passes CRM, stable key, tailored follow_up_text and sign-off',async()=>{
 const f=bookingFixture();await f.booking.book({campaignId:'campaign',confirmBooking:true,acceptProjectTimeZones:true});assert.equal(f.calls.length,1);const p=f.calls[0];assert(p.crm);assert.equal(p.source,'h2-projects');assert.equal(p.to,'person0@example.com');assert(p.body_text.endsWith('Best regards,\nMubashir'));assert.match(p.follow_up_text,/Developer 0/);assert.doesNotMatch(p.follow_up_text,/^(?:dear|hello|hi)\b/i);assert.doesNotMatch(p.follow_up_text,/(?:best regards|kind regards|sincerely)/i);assert(!('noFollowUp'in p));assert(!('followUpText'in p));assert(!('allowDisposable'in p));assert.equal(f.queue.snapshot().jobs[0].bookingId,'booking-id');assert.equal(f.historyResults[0].summary.scheduled,1);
});
test('follow_up_text validates length and excludes greetings and signatures',()=>{
 assert.equal(followUpText('Following up on the earlier note regarding [Company]. Please let me know who handles the next discussion, and I will share a concise project summary for review.','Green Genius').includes('Green Genius'),true);
 assert.throws(()=>followUpText('Hi there','Company'),/40–1500/);
 assert.throws(()=>followUpText('Dear team, this is a sufficiently long follow-up message that should not be accepted because it starts with a greeting and continues beyond the minimum length.','Company'),/greeting/);
 assert.throws(()=>followUpText('This is a sufficiently long follow-up message for the test and it ends with a signature.\nBest regards,','Company'),/signature/);
});
test('scheduling hold blocks prospect calls, even if timestamps are planned',async()=>{
 const f=bookingFixture();f.setHold();await assert.rejects(f.booking.book({campaignId:'campaign',confirmBooking:true,acceptProjectTimeZones:true}),/hold/);assert.equal(f.calls.length,0);
});
test('unexpected immediate send and provider uncertainty stop the batch without automatic retries',async()=>{
 const f=bookingFixture({status:'sent'});await assert.rejects(f.booking.book({campaignId:'campaign',confirmBooking:true,acceptProjectTimeZones:true}),/immediately/);assert.equal(f.calls.length,1);assert.equal(f.queue.snapshot().status,'paused');assert.equal(f.queue.snapshot().jobs[0].status,'sent');
 const g=bookingFixture({status:'failed',httpStatus:0,error:'Timeout'});await assert.rejects(g.booking.book({campaignId:'campaign',confirmBooking:true,acceptProjectTimeZones:true}),/Timeout/);assert.equal(g.calls.length,1);assert.equal(g.queue.snapshot().jobs[0].status,'uncertain');
});
test('Pulse scheduled/replay responses are distinct from sent; invalid timestamps never reach network',async()=>{
 let calls=0;const future=new Date(Date.now()+600000).toISOString();const client=new PulseClient({key:'fake-secret',baseUrl:'https://fake.test',fetchImpl:async(url,init)=>{calls++;const p=JSON.parse(init.body);return {ok:true,status:200,json:async()=>({scheduled:true,replay:true,id:'uuid',scheduledAt:p.scheduled_at})};}});
 const p={to:'self@example.com',subject:'Mock',body_text:'Body',scheduled_at:future,idempotency_key:'stable',crm:{module:'h2-projects'}};const result=await client.send(p);assert.equal(result.status,'scheduled');assert(result.replay);assert.equal(result.scheduledId,'uuid');
 assert.equal((await client.send({...p,scheduled_at:new Date().toISOString()})).httpStatus,400);assert.equal((await client.send({...p,allowDisposable:['self@example.com']})).httpStatus,400);assert.equal(calls,1);
});
test('503 is a definite unbooked retry-later result, while timeout remains uncertain',async()=>{
 const f=bookingFixture({status:'failed',httpStatus:503,error:'Recipient check unavailable'});await assert.rejects(f.booking.book({campaignId:'campaign',confirmBooking:true,acceptProjectTimeZones:true}),/unavailable/);assert.equal(f.queue.snapshot().jobs[0].status,'retryable');assert.equal(f.calls.length,1);
});
test('timestamp is checked again after a slow recipient check to prevent immediate-send fallback',async()=>{
 const f=bookingFixture();await f.queue.edit(s=>{s.jobs[0].scheduledAt=new Date(now+600000).toISOString();});f.booking.verify=async address=>{f.booking.now=()=>now+300000;return safe(address);};
 await assert.rejects(f.booking.book({campaignId:'campaign',confirmBooking:true,acceptProjectTimeZones:true}),/Verification took too long/);assert.equal(f.calls.length,0);
});
