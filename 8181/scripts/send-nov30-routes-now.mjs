import {InvestorContactDirectory} from '../platform-shell/server/investor-contact-directory.mjs';
import {createReoonService} from '../platform-shell/server/reoon.mjs';
import {PulseClient} from '../platform-shell/server/pulse/pulse-client.mjs';
import {SendHistoryStore} from '../platform-shell/server/pulse/send-history-store.mjs';
import path from 'node:path';

const root=process.cwd();
const targetEmails=new Set([
  'anagh.atal@cleanmax.com','reece.stephens@edf-power.com','joest.bunse@eef.de',
  'njn@europeanenergy.com','development@greengenius.com','lihy05@tongwei.com',
  'info@mercuryrenewables.ie','spain-info@qenergy.eu','frederick.castro@acme.in',
  'i.rehmann@greentech.energy','media@renalfa.com','investorrelations@acenrenewables.com',
  'ir@ueg.com','info@ppcr.gr',
  'sonali.charkha@cleanmax.com','mohamed.taleb@edf-power.com','leonie.neef@eef.de',
  'eyal@econergytech.com','martyna.giedraite@greengenius.com','germany@sungrow-emea.com',
  'jduffy@mercuryrenewables.ie','jk@nexun.eu','rimjim.bora@acme.in',
  'contact@greentech.energy','l.kelly@qair.energy','info@terrawind.co.jp',
  'sales@sanyglobal.com','nir@enlightenergy.co.il'
]);
const directory=await new InvestorContactDirectory(root).read();
const reoon=await createReoonService({root,allowedEmails:new Set()});
const verification=reoon.results();
const pulse=await PulseClient.fromEnvironment(root);
if(!pulse.enabled)throw Error('Pulse is not connected; no requests submitted.');
const history=await SendHistoryStore.open(path.join(root,'platform-shell','data','pulse-sends','investors-jv.json'));
const zoneFor=country=>{const s=String(country||'').toLowerCase(),map=[[/australia/,'Australia/Sydney'],[/india/,'Asia/Kolkata'],[/china/,'Asia/Shanghai'],[/germany/,'Europe/Berlin'],[/france/,'Europe/Paris'],[/spain/,'Europe/Madrid'],[/united kingdom|england|scotland|wales/,'Europe/London'],[/poland/,'Europe/Warsaw'],[/netherlands/,'Europe/Amsterdam'],[/italy/,'Europe/Rome'],[/portugal/,'Europe/Lisbon'],[/sweden/,'Europe/Stockholm'],[/denmark/,'Europe/Copenhagen'],[/norway/,'Europe/Oslo'],[/usa|united states/,'America/New_York'],[/canada/,'America/Toronto']];return(map.find(item=>item[0].test(s))||[null,'Europe/London'])[1];};
const parts=(ms,zone)=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
const localEpoch=(p,zone)=>{let guess=Date.UTC(p.y,p.mo-1,p.d,p.h,p.mi),target=guess;for(let i=0;i<5;i++){const q=parts(guess,zone);guess+=target-Date.UTC(q.year,q.month-1,q.day,q.hour,q.minute,q.second);}return guess;};
const iso=(ms,zone)=>{const p=parts(ms,zone),q=n=>String(n).padStart(2,'0'),off=Math.round((Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-Math.floor(ms/1000)*1000)/60000);return p.year+'-'+q(p.month)+'-'+q(p.day)+'T'+q(p.hour)+':'+q(p.minute)+':'+q(p.second)+(off<0?'-':'+')+q(Math.floor(Math.abs(off)/60))+':'+q(Math.abs(off)%60);};
const nextWork=(ms,zone)=>{const p=parts(ms,zone);let day=new Date(Date.UTC(p.year,p.month-1,p.day));if(p.hour>=17)day.setUTCDate(day.getUTCDate()+1);for(let i=0;i<10;i++){const wd=day.getUTCDay();if(wd>=1&&wd<=5){const candidate=localEpoch({y:day.getUTCFullYear(),mo:day.getUTCMonth()+1,d:day.getUTCDate(),h:9,mi:0},zone);if(candidate>=ms)return candidate;}day.setUTCDate(day.getUTCDate()+1);}throw Error('No local working-hour slot found.');};
let cursor=Date.now()+6*60*1000;

const routes=[],seen=new Set();
for(const company of directory.companies){
  if(company.referralOnly)continue;
  for(const contact of company.contacts||[]){
    const emails=[];
    if(contact.email)emails.push(contact.email);
    for(const item of contact.emails||[])if(item?.email)emails.push(item.email);
    for(const item of contact.corporateRoutes||[])if(item?.email)emails.push(item.email);
    for(const email of [...new Set(emails.map(x=>String(x).trim().toLowerCase()))]){
      if(!targetEmails.has(email)||seen.has(email))continue;
      const result=verification[email];
      if(!result||!['safe','catch_all','role_account'].includes(result.status))continue;
      seen.add(email);
      routes.push({recordId:company.id,company:company.company,country:company.country,contact,email,status:result.status,sources:company.sources||[],summary:company.summary||company.intent||company.company,domain:company.domainUrl||company.website||''});
    }
  }
}
if(routes.length!==targetEmails.size)throw Error('Expected 13 target routes, found '+routes.length+'. No requests submitted.');
const bodyFor=(route,kind,url)=>{
  const greeting=route.contact?.name||route.company+' team';
  const lead=kind==='evidence'
    ? 'I am contacting you in reference to '+route.company+'\'s published partnership or investment route, where the company presents routes for renewable-energy collaboration.\n\n'+url
    : 'A brief enquiry regarding '+route.company+'\'s current renewable-energy investment and partnership criteria.';
  const pass=kind==='shared'?'\n\nPlease pass this note to the person responsible for partnerships, investment or new projects.':'';
  return ['Dear '+greeting+',','',lead+pass,'','I represent a selected, mandated portfolio of solar/PV and wind-energy opportunities available for potential investment, acquisition, joint venture and co-development. The portfolio includes:','',
    '• Capacity 510 MW across Albania, Croatia and Kosovo,','• offtake/PPA agreements arranged,','• all land secured,','• 70%–75% bankability secured,','• government and municipality approvals in place,','• shovel-ready / RTB opportunities.','',
    'Could you confirm whether '+route.company+' is currently reviewing external opportunities and whether a 30-minute meeting would be convenient to discuss the preferred countries, capacity range and development stages?','',
    'We ensure our best cooperation and look for a long-term fruitful business relationship.','','Best regards,','Mubashir'].join('\n');
};
const followFor=(route,kind)=>kind==='shared'
  ? 'Please pass this note to the person responsible for partnerships, investment or new projects at '+route.company+'. If there is a suitable route, I would welcome a short discussion about the relevant criteria and next steps.'
  : 'I am following up on my brief renewable-energy enquiry to '+route.company+'. If external opportunities are currently within your remit, would a short discussion about fit and next steps be useful?';
const results=[];
for(const [index,route] of routes.entries()){
  const kind=route.status==='role_account'?'shared':route.sources.find(x=>x?.url)?'evidence':'noEvidence';
  const url=route.sources.find(x=>x?.url)?.url||'';
  const zone=zoneFor(route.country),scheduledAt=nextWork(cursor,zone);
  const payload={
    to:route.email,
    subject:'Renewable '+(kind==='shared'?'routing':kind==='evidence'?'published route':'criteria')+' discussion — '+route.company+' — immediate follow-up',
    body_text:bodyFor(route,kind,url),
    scheduled_at:iso(scheduledAt,zone),
    idempotency_key:'investors-jv:'+route.recordId+':'+route.email+':today-nov5',
    source:'solar-wind-investors-jv',
    ...(route.status==='catch_all'?{allowCatchAll:[route.email]}:{}),
    crm:{module:'investors-jv',recordId:route.recordId,company:{name:route.company,website:route.domain,country:route.country,role:route.contact?.title||route.contact?.role||'Partnerships / investment contact',summary:String(route.summary).slice(0,500)},people:[{email:route.email,name:route.contact?.name||route.company+' team',title:route.contact?.title||route.contact?.role||''}]},
    follow_up_text:followFor(route,kind)
  };
  cursor=scheduledAt+(2+(index%3))*60*1000;
  const historyId=await history.begin({
    module:'investors-jv',recordId:route.recordId,recordName:route.company,mode:'separate',
    subject:payload.subject,body:payload.body_text,
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
  results.push({company:route.company,email:route.email,status:result.status,httpStatus:result.httpStatus,error:result.error||'',emailMessageId:result.emailMessageId||null});
}
console.log(JSON.stringify({submitted:results.length,sent:results.filter(x=>x.status==='sent').length,blocked:results.filter(x=>x.status==='blocked').length,failed:results.filter(x=>!['sent','blocked'].includes(x.status)).length,results},null,2));
