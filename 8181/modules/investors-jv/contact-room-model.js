import {defaultSectors} from './sectors.js';

export const normalizeEmail=value=>String(value||'').trim().toLowerCase();
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function profileUrl(value){
 try{const url=new URL(value);return url.protocol==='https:'&&/(^|\.)linkedin\.com$/i.test(url.hostname)&&/^\/in\/[^/]+/.test(url.pathname)?url.href:'';}catch{return '';}
}
export function externalUrl(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}}
export function emailRoutes(contact){
 const result=[];
 for(const route of [{email:contact.email,type:contact.emailType,source:contact.source},...(contact.emails||[]),...(contact.corporateRoutes||[]).map(item=>({...item,shared:true}))]){
  const item=typeof route==='string'?{email:route}:route,email=normalizeEmail(item.email);
  if(!email||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))continue;
  const previous=result.find(value=>value.email===email);
  if(previous)Object.assign(previous,{...item,email,type:item.type||previous.type,shared:previous.shared||item.shared});
  else result.push({...item,email});
 }
 return result;
}
export function verificationState(result,contact={},route={},now=Date.now()){
 const checked=Date.parse(result?.checkedAt),age=now-checked;
 const fresh=Number.isFinite(checked)&&age>=0&&age<=30*86400000;
 const candidate=/candidate|guessed|pattern|historical|replaced|former/i.test([contact.emailType,contact.roleStatus,route.type,route.status].filter(Boolean).join(' '));
 const shared=route.shared===true||result?.isRoleAccount===true||result?.status==='role_account'||/shared|generic|corporate route|company route|role mailbox/i.test(route.type||'')||/^(info|sales|marketing|office|contact|hello|enquiries|enquiry|admin|support|business|global\.sales)@/i.test(route.email||'');
 const verified=!candidate&&fresh&&result?.provider==='Reoon'&&result.mode==='power'&&result.deliverable===true&&['safe','catch_all','role_account'].includes(result.status);
 const status=!result?'Unchecked':!fresh?'Recheck needed':result.status==='catch_all'?'Catch-all · allowed by default':String(result.status||'Unknown').replaceAll('_',' ');
 return {verified,shared,candidate,fresh,status,checkedAt:result?.checkedAt||'',detail:verified?`Reoon Power: ${result.status}; checked ${result.checkedAt}. Mailbox check only, not proof of identity or delivery.`:candidate?'Candidate or historical person-email route; identity/role review needed.':`Reoon: ${status}${result?.checkedAt?`; checked ${result.checkedAt}`:''}.`};
}
export function buildContactRows(companies,workflows={},results={},now=Date.now()){
 const rows=[];
 for(const company of companies){
  const state=workflows[company.id]||{},seen=new Set();
  const contacts=[...(company.contacts||[]),...(Array.isArray(state.contactsAdded)?state.contactsAdded:[])];
  // Keep a company visible even before its first contact is researched.
  for(const contact of contacts.length?contacts:[{name:'Contact not yet researched'}]){
   const routes=emailRoutes(contact),linkedin=profileUrl(contact.linkedin);
   for(const route of routes.length?routes:[{email:''}]){
    const key=[company.id,String(contact.name||'').toLowerCase(),route.email,linkedin].join('|');
    if(seen.has(key))continue;seen.add(key);
    const verification=verificationState(results[route.email],contact,route,now);
    rows.push({key,hasContact:contacts.length>0,companyId:company.id,company:company.company,intent:company.intent||'Intent not established',intentValue:company.intentStrength||company.currentMandate||company.outreachPriority?.label||'Not assessed',priority:company.outreachPriority?.level==='priority',priorityLabel:company.outreachPriority?.label||'',evidenceDate:company.evidenceDate||company.latestEvidence||'',country:company.originCountry||'Unknown',markets:company.country||'',sectors:Array.isArray(state.sectors)?state.sectors:defaultSectors(company),name:contact.name||'Name not recorded',designation:contact.title||contact.role||'Not recorded',email:route.email,linkedin,phone:[...new Set([...(contact.phones||[]),contact.phone].filter(Boolean))].join(' · '),source:externalUrl(route.source||contact.source),verification,routeLabel:verification.shared?'Shared mailbox — not this person’s own email':verification.candidate?'Candidate / role review needed':'Business email — identity separate',lastSent:state.outreachSentAt||state.lastSentAt||'',followup:state.outreachFollowup||''});
   }
  }
 }
 return rows.sort((a,b)=>Number(b.priority)-Number(a.priority)||a.company.localeCompare(b.company)||a.name.localeCompare(b.name)||a.email.localeCompare(b.email));
}
export function filterContactRows(rows,filters={}){
 const query=String(filters.search||'').trim().toLowerCase();
 return rows.filter(row=>(!query||[row.company,row.name,row.designation,row.email,row.intent,row.intentValue,row.country,row.markets,...row.sectors].join(' ').toLowerCase().includes(query))&&(!filters.priority||row.priority)&&(!filters.linkedin||row.linkedin)&&(!filters.country||row.country===filters.country)&&(!filters.sector||row.sectors.includes(filters.sector))&&(!filters.verification|| (filters.verification==='verified'?row.verification.verified:filters.verification==='missing'?!row.email:filters.verification==='unchecked'?row.email&&!row.verification.checkedAt:!row.verification.verified&&!!row.email))&&(!filters.route||(filters.route==='shared'?row.verification.shared:row.email&&!row.verification.shared&&!row.verification.candidate)));
}

export const CONTACT_COLUMNS=Object.freeze([
 {id:'company',label:'Company',width:220},{id:'intent',label:'Intent value / evidence',width:330},
 {id:'person',label:'Contact person',width:210},{id:'designation',label:'Designation',width:250},
 {id:'email',label:'Email / connection route',width:310},{id:'verification',label:'Reoon verified',width:185},
 {id:'linkedin',label:'LinkedIn',width:140},{id:'actions',label:'Connect / follow-up',width:210}
]);
export const CONTACT_LAYOUT_KEY='investor-contact-room:columns:v1';
export function normalizeContactLayout(saved={}){
 const ids=CONTACT_COLUMNS.map(column=>column.id),order=[...new Set((Array.isArray(saved?.order)?saved.order:[]).filter(id=>ids.includes(id)))];
 for(const id of ids)if(!order.includes(id))order.push(id);
 return {order,widths:Object.fromEntries(CONTACT_COLUMNS.map(column=>{const width=saved?.widths?.[column.id];return [column.id,typeof width==='number'&&Number.isFinite(width)?Math.min(1200,Math.max(90,Math.round(width))):column.width];}))};
}
export function moveContactColumn(layout,from,to,after=false){
 const next=normalizeContactLayout(layout);
 if(from===to||!next.order.includes(from)||!next.order.includes(to))return next;
 next.order=next.order.filter(id=>id!==from);next.order.splice(next.order.indexOf(to)+(after?1:0),0,from);return next;
}
export function renderContactCell(row,id,path='/investors-jv'){
 const url=tab=>`${path}#record/${encodeURIComponent(row.companyId)}/${tab}`,v=row.verification;
 const text=(value,extra='')=>`<span class="cr-cell-text ${extra}">${escapeHtml(value)}</span>`;
 let detail='',body='';
 switch(id){
  case 'company':detail=[row.company,row.priorityLabel,row.country,row.sectors.join(' · ')].filter(Boolean).join('\n');body=`<a class="cr-cell-text cr-company" href="${url('overview')}">${escapeHtml(row.company)}</a>${row.priority?`<small>${escapeHtml(row.priorityLabel)}</small>`:''}<small>${escapeHtml(row.country)} · ${escapeHtml(row.sectors.join(' · '))}</small>`;break;
  case 'intent':detail=[row.intentValue,row.intent,`Evidence: ${row.evidenceDate||'Not dated'}`].join('\n');body=`<span class="cr-vote">${escapeHtml(row.intentValue)}</span><div class="cr-intent">${escapeHtml(row.intent)}</div><small>Evidence: ${escapeHtml(row.evidenceDate||'Not dated')}</small>`;break;
  case 'person':detail=row.name;body=`<strong class="cr-cell-text">${escapeHtml(row.name)}</strong>`+(row.source?`<div class="cr-source"><a href="${escapeHtml(row.source)}" target="_blank" rel="noopener noreferrer" aria-label="Source for ${escapeHtml(row.name)}">Contact source ↗</a></div>`:'');break;
  case 'designation':detail=row.designation;body=text(row.designation);break;
  case 'email':detail=[row.email||'No email published',row.routeLabel,row.phone].filter(Boolean).join('\n');body=text(row.email||'No email published — use LinkedIn / company contact')+(row.email?`<small>${escapeHtml(row.routeLabel)}</small><button type="button" class="cr-copy cr-cell-action" data-cr-copy="${escapeHtml(row.email)}" aria-label="Copy ${escapeHtml(row.email)}">Copy email</button>`:'')+(row.phone?`<small>${escapeHtml(row.phone)}</small>`:'');break;
  case 'verification':detail=v.detail;body=(v.verified?'<span class="cr-tick" role="img" aria-label="Reoon verified">✓</span>':'')+text(v.verified?(v.shared?'Shared mailbox':'Reoon safe'):(row.email?v.status:'—'))+(v.checkedAt?`<small>${escapeHtml(new Date(v.checkedAt).toLocaleDateString())}</small>`:'');break;
  case 'linkedin':detail=row.linkedin||'LinkedIn profile not found';body=row.linkedin?`<a class="cr-cell-text" href="${escapeHtml(row.linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile of ${escapeHtml(row.name)}">Profile ↗</a>`:text('Not found');break;
  case 'actions':detail=[`Connect with ${row.name} at ${row.company}`,row.lastSent?`Last sent: ${row.lastSent}`:'',row.followup?`Follow-up: ${row.followup}`:''].filter(Boolean).join('\n');body=`<div class="cr-actions"><a href="${url('outreach')}">Outreach →</a><a href="${url('contacts')}">Contacts →</a></div>${row.lastSent?`<small>Last sent: ${escapeHtml(row.lastSent)}</small>`:''}${row.followup?`<small>Follow-up: ${escapeHtml(row.followup)}</small>`:''}`;break;
 }
 return `<td data-cr-column="${id}" title="${escapeHtml(detail)}"><div class="cr-cell-content">${body}</div></td>`;
}

