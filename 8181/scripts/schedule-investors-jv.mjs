import {InvestorContactDirectory} from '../platform-shell/server/investor-contact-directory.mjs';
import {createReoonService} from '../platform-shell/server/reoon.mjs';
import {PulseClient} from '../platform-shell/server/pulse/pulse-client.mjs';
import {SendHistoryStore} from '../platform-shell/server/pulse/send-history-store.mjs';
import path from 'node:path';

const root = process.cwd();
const directory = await new InvestorContactDirectory(root).read();
const reoon = await createReoonService({root, allowedEmails:new Set()});
const verification = reoon.results();
const pulse = await PulseClient.fromEnvironment(root);
if (!pulse.enabled) throw Error('Pulse is not connected; no requests submitted.');
const history = await SendHistoryStore.open(path.join(root,'platform-shell','data','pulse-sends','investors-jv.json'));

const zoneFor = country => {
  const s = String(country || '').toLowerCase();
  const map = [
    [/australia|new south wales|canberra/,'Australia/Sydney'],[/victoria/,'Australia/Melbourne'],[/tasmania/,'Australia/Hobart'],[/queensland/,'Australia/Brisbane'],[/south australia/,'Australia/Adelaide'],[/western australia/,'Australia/Perth'],
    [/germany/,'Europe/Berlin'],[/poland/,'Europe/Warsaw'],[/united kingdom|england|scotland|wales/,'Europe/London'],[/ireland/,'Europe/Dublin'],[/france/,'Europe/Paris'],[/spain/,'Europe/Madrid'],[/italy/,'Europe/Rome'],[/portugal/,'Europe/Lisbon'],[/netherlands/,'Europe/Amsterdam'],[/belgium/,'Europe/Brussels'],[/denmark/,'Europe/Copenhagen'],[/sweden/,'Europe/Stockholm'],[/finland/,'Europe/Helsinki'],[/norway/,'Europe/Oslo'],[/austria/,'Europe/Vienna'],[/switzerland/,'Europe/Zurich'],[/czech/,'Europe/Prague'],[/slovak/,'Europe/Bratislava'],[/hungary/,'Europe/Budapest'],[/romania/,'Europe/Bucharest'],[/greece/,'Europe/Athens'],[/turkey/,'Europe/Istanbul'],[/ukraine/,'Europe/Kyiv'],[/bulgaria/,'Europe/Sofia'],[/serbia|kosovo/,'Europe/Belgrade'],[/croatia/,'Europe/Zagreb'],[/albania/,'Europe/Tirane'],[/macedonia/,'Europe/Skopje'],
    [/uae|united arab emirates|dubai/,'Asia/Dubai'],[/saudi/,'Asia/Riyadh'],[/qatar/,'Asia/Qatar'],[/oman/,'Asia/Muscat'],[/bahrain/,'Asia/Bahrain'],[/kuwait/,'Asia/Kuwait'],[/india/,'Asia/Kolkata'],[/china/,'Asia/Shanghai'],[/japan/,'Asia/Tokyo'],[/korea/,'Asia/Seoul'],[/singapore/,'Asia/Singapore'],[/malaysia/,'Asia/Kuala_Lumpur'],[/thailand/,'Asia/Bangkok'],[/philippines/,'Asia/Manila'],[/indonesia/,'Asia/Jakarta'],[/vietnam/,'Asia/Ho_Chi_Minh'],
    [/united states|usa|\bus\b/,'America/New_York'],[/canada/,'America/Toronto'],[/brazil/,'America/Sao_Paulo'],[/south africa/,'Africa/Johannesburg'],[/egypt/,'Africa/Cairo'],[/kenya/,'Africa/Nairobi'],[/chile/,'America/Santiago'],[/mexico/,'America/Mexico_City'],[/new zealand/,'Pacific/Auckland']
  ];
  return (map.find(item => item[0].test(s)) || [null,'Europe/London'])[1];
};
const parts = (ms, zone) => Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
const localEpoch = (p, zone) => { let guess=Date.UTC(p.y,p.mo-1,p.d,p.h,p.mi); const target=guess; for(let i=0;i<5;i++){const q=parts(guess,zone);guess+=target-Date.UTC(q.year,q.month-1,q.day,q.hour,q.minute,q.second);} return guess; };
const iso = (ms, zone) => { const p=parts(ms,zone), q=n=>String(n).padStart(2,'0'), off=Math.round((Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-Math.floor(ms/1000)*1000)/60000); return p.year+'-'+q(p.month)+'-'+q(p.day)+'T'+q(p.hour)+':'+q(p.minute)+':'+q(p.second)+(off<0?'-':'+')+q(Math.floor(Math.abs(off)/60))+':'+q(Math.abs(off)%60); };

const dates=[];
for(let d=6;d<=30&&dates.length<17;d++){const day=new Date(Date.UTC(2026,10,d));if(day.getUTCDay()>=1&&day.getUTCDay()<=5)dates.push('2026-11-'+String(d).padStart(2,'0'));}

const routes=[], seen=new Set();
for(const company of directory.companies){
  if(company.referralOnly) continue;
  for(const contact of company.contacts || []){
    const emails=[];
    if(contact.email) emails.push(contact.email);
    for(const item of contact.emails || []) if(item?.email) emails.push(item.email);
    for(const item of contact.corporateRoutes || []) if(item?.email) emails.push(item.email);
    for(const raw of [...new Set(emails.map(value=>String(value).trim().toLowerCase()))]){
      const result=verification[raw];
      if(!result || !['safe','catch_all','role_account'].includes(result.status) || seen.has(raw)) continue;
      seen.add(raw);
      routes.push({recordId:company.id,company:company.company,country:company.country,contact,email:raw,status:result.status,sources:company.sources||[],latestEvidence:company.latestEvidence||'',summary:company.summary||company.intent||company.company,domain:company.domainUrl||company.website||''});
    }
  }
}

const byCompany=new Map();
for(const route of routes){if(!byCompany.has(route.company))byCompany.set(route.company,[]);byCompany.get(route.company).push(route);}
const dayJobs=dates.map(()=>[]);
for(const entry of [...byCompany.entries()].sort((a,b)=>b[1].length-a[1].length)){
  const used=new Set();
  for(const route of entry[1]){
    const index=dates.map((_,i)=>i).filter(i=>!used.has(i)).sort((a,b)=>dayJobs[a].length-dayJobs[b].length||a-b)[0];
    used.add(index);
    dayJobs[index].push(route);
  }
}

const evidenceFor = route => route.sources.find(item=>item?.url)?.url || '';
const messageFor = (route, kind, url) => {
  const greeting=route.contact?.name || route.company+' team';
  const lead=kind==='evidence'
    ? 'I am contacting you in reference to '+route.company+'\'s published partnership or investment route, where the company presents routes for renewable-energy collaboration.\n\n'+url
    : 'A brief enquiry regarding '+route.company+'\'s current renewable-energy investment and partnership criteria.';
  const pass=kind==='shared'?'\n\nPlease pass this note to the person responsible for partnerships, investment or new projects.':'';
  return [
    'Dear '+greeting+',','',lead+pass,'',
    'I represent a selected, mandated portfolio of solar/PV and wind-energy opportunities available for potential investment, acquisition, joint venture and co-development. The portfolio includes:','',
    '• Capacity 510 MW across Albania, Croatia and Kosovo,',
    '• offtake/PPA agreements arranged,',
    '• all land secured,',
    '• 70%–75% bankability secured,',
    '• government and municipality approvals in place,',
    '• shovel-ready / RTB opportunities.','',
    'Could you confirm whether '+route.company+' is currently reviewing external opportunities and whether a 30-minute meeting would be convenient to discuss the preferred countries, capacity range and development stages?','',
    'We ensure our best cooperation and look for a long-term fruitful business relationship.','',
    'Best regards,','Mubashir'
  ].join('\n');
};
const followFor = (route, kind) => kind==='shared'
  ? 'Please pass this note to the person responsible for partnerships, investment or new projects at '+route.company+'. If there is a suitable route, I would welcome a short discussion about the relevant criteria and next steps.'
  : 'I am following up on my brief renewable-energy enquiry to '+route.company+'. If external opportunities are currently within your remit, would a short discussion about fit and next steps be useful?';

let jobs=[];
for(let dayIndex=0;dayIndex<dayJobs.length;dayIndex++){
  const counters=new Map();
  for(const route of dayJobs[dayIndex].sort((a,b)=>a.country.localeCompare(b.country)||a.company.localeCompare(b.company)||a.email.localeCompare(b.email))){
    const zone=zoneFor(route.country), index=counters.get(zone)||0, gap=10+((index*7)%11), minute=9*60+index*gap;
    if(minute>=17*60) throw Error('Local working-hour capacity exceeded for '+route.company+' on '+dates[dayIndex]);
    const day=Number(dates[dayIndex].slice(-2)), at=localEpoch({y:2026,mo:11,d:day,h:Math.floor(minute/60),mi:minute%60},zone);
    counters.set(zone,index+1);
    const kind=route.status==='role_account'?'shared':evidenceFor(route)?'evidence':'noEvidence';
    jobs.push({route,zone,kind,at,dayIndex,subject:'Renewable '+(kind==='shared'?'routing':kind==='evidence'?'published route':'criteria')+' discussion — '+route.company+' — '+route.email,body:messageFor(route,kind,evidenceFor(route)),follow:followFor(route,kind)});
  }
}

// The user requested an intentional second touch tomorrow for the six original
// queue days 17–24 November; preserve all original bookings and use a new key.
jobs=jobs.filter(job=>job.dayIndex>=7&&job.dayIndex<=12);
const tomorrowCounters=new Map();
for(const job of jobs.slice().sort((a,b)=>a.zone.localeCompare(b.zone)||a.route.company.localeCompare(b.route.company)||a.route.email.localeCompare(b.route.email))){
  const slot=tomorrowCounters.get(job.zone)||0, gap=2+(slot%3), minute=9*60+slot*gap;
  if(minute>=17*60)throw Error('Tomorrow local working-hour capacity exceeded for '+job.route.company+' in '+job.zone);
  job.at=localEpoch({y:2026,mo:11,d:6,h:Math.floor(minute/60),mi:minute%60},job.zone);
  tomorrowCounters.set(job.zone,slot+1);
}

console.error(JSON.stringify({routes:routes.length,dates,dayCounts:dayJobs.map(items=>items.length),topCompanies:[...byCompany.entries()].sort((a,b)=>b[1].length-a[1].length).slice(0,3).map(item=>[item[0],item[1].length])}));
let scheduled=0,replay=0,failed=[];
for(const job of jobs){
  const route=job.route, payload={
    to:route.email,
    subject:job.subject,
    body_text:job.body,
    scheduled_at:iso(job.at,job.zone),
    idempotency_key:'investors-jv:'+route.recordId+':'+route.email+':tomorrow-nov6',
    source:'solar-wind-investors-jv',
    ...(route.status==='catch_all'?{allowCatchAll:[route.email]}:{}),
    crm:{module:'investors-jv',recordId:route.recordId,company:{name:route.company,website:route.domain,country:route.country,role:route.contact?.title||route.contact?.role||'Partnerships / investment contact',summary:String(route.summary).slice(0,500)},people:[{email:route.email,name:route.contact?.name||route.company+' team',title:route.contact?.title||route.contact?.role||''}]},
    follow_up_text:job.follow
  };
  const historyId=await history.begin({
    module:'investors-jv',recordId:route.recordId,recordName:route.company,mode:'separate',
    subject:job.subject,body:job.body,
    recipients:[{email:route.email,name:route.contact?.name||route.company+' team',field:'to',origin:'published'}],
    calls:()=>[{emails:[route.email],payload}],
    verification:[{email:route.email,status:route.status}],
    ...(route.status==='catch_all'?{catchAllOverride:[route.email]}:{})
  });
  let result;
  try { result=await pulse.send(payload); }
  catch(error) { result={status:'failed',httpStatus:error.status||0,error:error.message}; }
  await history.complete(historyId,{
    results:[{emails:[route.email],...result}],
    summary:{sent:result.status==='sent'?1:0,blocked:result.status==='blocked'?1:0,failed:['sent','scheduled','blocked'].includes(result.status)?0:1}
  });
  if(result.status==='scheduled'){scheduled++;if(result.replay)replay++;}
  else failed.push({company:route.company,email:route.email,status:result.status,httpStatus:result.httpStatus,error:result.error});
  if((scheduled+failed.length)%20===0)console.error('progress '+(scheduled+failed.length)+'/'+jobs.length);
}
console.log(JSON.stringify({submitted:jobs.length,scheduled,replay,failedCount:failed.length,failed},null,2));
