import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {H2Campaign,prepareJobs,MIN_GAP,MAX_GAP} from './h2-campaign.mjs';

const date=Date.parse('2026-11-04T12:00:00Z');
const safe=(email,now=date)=>({email,provider:'Reoon',mode:'power',status:'safe',deliverable:true,isRoleAccount:false,checkedAt:new Date(now).toISOString()});
const person=(name,email,extra={})=>({name,email,title:'Managing Director',source:'https://example.com/team',emailType:'Published individual business email',...extra});
const records=()=>[
 {id:'a',name:'Alpha Hydrogen',developer:'Alpha',contacts:[person('Alice Smith','alice@alpha.com'),person('Ann Jones','ann@alpha.com'),person('Amy Doe','amy@alpha.com')]},
 {id:'b',name:'Beta Hydrogen',developer:'Beta',contacts:[person('Bob Green','bob@beta.com')]},
 {id:'c',name:'Alpha Expansion',developer:'Alpha',contacts:[person('Alice Smith','alice@alpha.com')]}
];
const results=()=>Object.fromEntries(['alice@alpha.com','ann@alpha.com','amy@alpha.com','bob@beta.com'].map(e=>[e,safe(e)]));
function fixture(gap=MIN_GAP){let clock=date,store,sends=[];const queue=new H2Campaign({file:'mock-only',records,results,history:()=>[],verify:async e=>safe(e,clock),send:async input=>{sends.push({at:clock,input});return {id:'history-'+sends.length,summary:{sent:1,failed:0,blocked:0},results:[{status:'sent'}]};},now:()=>clock,gap:()=>gap,persist:async(f,s)=>{store=structuredClone(s);}});return {queue,sends,set:t=>clock=t,advance:t=>clock+=t,stored:()=>store};}
async function start(f){await f.queue.prepare();await f.queue.command({command:'start',campaignId:f.queue.snapshot().id});}

test('deduplicates across projects, interleaves companies and assigns distinct personal subjects and greetings',()=>{
 const {jobs,excluded}=prepareJobs(records(),results(),[],{},date);
 assert.equal(jobs.length,4);assert.equal(new Set(jobs.map(j=>j.email)).size,4);assert.equal(new Set(jobs.map(j=>j.subject)).size,4);
 assert.deepEqual(jobs.slice(0,2).map(j=>j.companyKey),['alpha.com','beta.com']);assert(excluded.some(e=>/Duplicate/.test(e.reason)));
 for(const job of jobs){assert.equal(job.status,'pending');assert.equal(job.body.match(/^Dear (.*),/)[1],job.name.split(' ')[0]);assert.doesNotMatch(job.subject,/\[|\]/);}
});
test('excludes a safe team inbox even when attached to a named executive',()=>{
 const r=records(),verified=results();r[0].contacts.push(person('Named Executive','infoaus@alpha.com',{emailType:'Published Australian PtX team inbox'}));verified['infoaus@alpha.com']=safe('infoaus@alpha.com');
 const out=prepareJobs(r,verified,[],{},date);assert(!out.jobs.some(j=>j.email==='infoaus@alpha.com'));assert(out.excluded.some(j=>j.email==='infoaus@alpha.com'));
});
test('blocks shared, historical, unknown, stale, catch-all and already-contacted addresses',()=>{
 const r=records(),verified=results();r[0].contacts.push(person('Old Person','old@alpha.com',{roleStatus:'Former executive'}),person('Team Desk','desk@alpha.com'));
 verified['old@alpha.com']=safe('old@alpha.com');verified['desk@alpha.com']=safe('desk@alpha.com');verified['ann@alpha.com']={...safe('ann@alpha.com'),status:'catch_all'};verified['amy@alpha.com']={...safe('amy@alpha.com'),checkedAt:'2026-01-01T00:00:00Z'};
 const out=prepareJobs(r,verified,[{status:'done',results:[{status:'sent',emails:['alice@alpha.com']}]}],{},date);
 assert.deepEqual(out.jobs.map(j=>j.email),['bob@beta.com']);
});
for(const gap of [MIN_GAP,MAX_GAP])test(`enforces ${gap/1000}s from completion, with no early, concurrent or burst sends`,async()=>{
 const f=fixture(gap);await start(f);assert.equal(f.sends.length,0);
 f.advance(gap-1);await f.queue.tick();assert.equal(f.sends.length,0);f.advance(1);
 await Promise.all([f.queue.tick(),f.queue.tick(),f.queue.tick()]);assert.equal(f.sends.length,1);
 for(let i=1;i<4;i++){f.advance(gap-1);await f.queue.tick();assert.equal(f.sends.length,i);f.advance(1);await f.queue.tick();assert.equal(f.sends.length,i+1);}
 for(let i=1;i<f.sends.length;i++)assert(f.sends[i].at-f.sends[i-1].at>=gap);
 assert.equal(f.queue.snapshot().status,'completed');assert(f.sends.every(s=>s.input.recipients.length===1));
});
test('pause/resume retains remaining delay rather than skipping it',async()=>{
 const f=fixture(180000);await start(f);f.advance(180000);await f.queue.tick();const due=f.queue.snapshot().nextAt;
 await f.queue.command({command:'pause',campaignId:f.queue.snapshot().id});f.advance(5000);await f.queue.tick();assert.equal(f.sends.length,1);
 await f.queue.command({command:'resume',campaignId:f.queue.snapshot().id});assert.equal(f.queue.snapshot().nextAt,due);
 f.set(due-1);await f.queue.tick();assert.equal(f.sends.length,1);f.advance(1);await f.queue.tick();assert.equal(f.sends.length,2);
});
test('delay starts after a slow in-flight send finishes, not when it starts',async()=>{
 const f=fixture();let finish;f.queue.send=input=>new Promise(resolve=>{finish=()=>resolve({summary:{sent:1},results:[{status:'sent'}]});});await start(f);f.advance(MIN_GAP);const pending=f.queue.tick();
 while(!finish)await new Promise(resolve=>setImmediate(resolve));f.advance(45000);finish();await pending;
 assert.equal(f.queue.snapshot().nextAt,date+MIN_GAP+45000+MIN_GAP);
});
test('changed Reoon result stops before Pulse; uncertain sends pause and never auto-retry',async()=>{
 const f=fixture();f.queue.verify=async e=>({...safe(e),status:'unknown',deliverable:false});await start(f);f.advance(MIN_GAP);await f.queue.tick();assert.equal(f.sends.length,0);assert.equal(f.queue.snapshot().status,'paused');assert.equal(f.queue.snapshot().jobs[0].status,'blocked');
 const g=fixture();g.queue.send=async()=>{throw Error('Uncertain provider timeout');};await start(g);g.advance(MIN_GAP);await g.queue.tick();assert.equal(g.queue.snapshot().jobs[0].status,'uncertain');assert.equal(g.queue.snapshot().status,'paused');g.advance(MAX_GAP);await g.queue.tick();await assert.rejects(g.queue.command({command:'resume',campaignId:g.queue.snapshot().id}),/uncertain/);
});
test('pause during Reoon verification prevents the network send',async()=>{
 const f=fixture();let finish;f.queue.verify=e=>new Promise(resolve=>{finish=()=>resolve(safe(e,date+MIN_GAP));});await start(f);f.advance(MIN_GAP);const pending=f.queue.tick();
 while(!finish)await new Promise(resolve=>setImmediate(resolve));await f.queue.command({command:'pause',campaignId:f.queue.snapshot().id});finish();await pending;assert.equal(f.sends.length,0);assert.equal(f.queue.snapshot().jobs[0].status,'pending');
});
test('restart restores paused queue, preserved due time and uncertain send without replay',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'h2-queue-test-'));try{
  const f=fixture();const file=path.join(root,'platform-shell/data/h2-outreach-campaign.json');f.queue.file=file;f.queue.persist=(await import('../atomic-json.mjs')).atomicJson;await start(f);
  await f.queue.edit(c=>{c.jobs[0].status='sending';});
  const recovered=await H2Campaign.open(root,{records,results,history:()=>[],send:async()=>{throw Error('Must not send');},verify:async e=>safe(e),now:()=>date});
  assert.equal(recovered.snapshot().status,'paused');assert.equal(recovered.snapshot().jobs[0].status,'uncertain');assert.equal(recovered.snapshot().nextAt,date+MIN_GAP);await recovered.tick();
  const disk=JSON.parse(await readFile(file,'utf8'));assert.equal(disk.campaign.status,'paused');
 }finally{assert(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));await rm(root,{recursive:true,force:true});}
});
test('failed persistence prevents sending and flags queue for review',async()=>{
 const f=fixture();await start(f);f.queue.persist=async()=>{throw Error('Disk full');};f.advance(MIN_GAP);await f.queue.tick();assert.equal(f.sends.length,0);assert.equal(f.queue.snapshot().status,'paused');assert.match(f.queue.snapshot().error,/persistence/);
});
test('Sydney 5 November 10:30 AEDT starts at 23:30 UTC on 4 November, never before',async()=>{
 const f=fixture();await f.queue.prepare();const target=Date.parse('2026-11-05T10:30:00+11:00');
 assert.equal(new Date(target).toISOString(),'2026-11-04T23:30:00.000Z');
 await f.queue.command({command:'schedule',campaignId:f.queue.snapshot().id,startAt:new Date(target).toISOString()});
 assert.equal(f.queue.snapshot().status,'scheduled');assert(f.queue.reserved);
 f.set(target-1);await f.queue.tick();assert.equal(f.sends.length,0);
 f.set(target);await f.queue.tick();assert.equal(f.sends.length,1);assert.equal(f.sends[0].at,target);
 f.set(target+MIN_GAP-1);await f.queue.tick();assert.equal(f.sends.length,1);f.advance(1);await f.queue.tick();assert.equal(f.sends.length,2);
});
test('missed scheduled start pauses rather than silently sending late or catching up',async()=>{
 const f=fixture();await f.queue.prepare();await f.queue.command({command:'schedule',campaignId:f.queue.snapshot().id,startAt:new Date(date+60000).toISOString()});f.set(date+60000+15*60000+1);await f.queue.tick();assert.equal(f.sends.length,0);assert.equal(f.queue.snapshot().status,'paused');assert.match(f.queue.snapshot().note,/missed/);
});
test('scheduled campaigns can be paused and cannot be overwritten or moved into the past',async()=>{
 const f=fixture();await f.queue.prepare();await assert.rejects(f.queue.command({command:'schedule',campaignId:f.queue.snapshot().id,startAt:new Date(date-1).toISOString()}),/Choose a start/);
 await f.queue.command({command:'schedule',campaignId:f.queue.snapshot().id,startAt:new Date(date+60000).toISOString()});await assert.rejects(f.queue.prepare(),/Pause/);
 await f.queue.command({command:'pause',campaignId:f.queue.snapshot().id});f.advance(60000);await f.queue.tick();assert.equal(f.sends.length,0);
});
