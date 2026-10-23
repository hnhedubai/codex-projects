import {pickerProjects} from './project-picker.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const OFFER_STATUSES=['Awaiting response','Interested','Declined','NDA requested','Details disclosed'];
export const offerTime=value=>value?`${new Date(value).toLocaleString('en-GB',{timeZone:'Asia/Dubai',hour12:false})} (UTC+04:00)`:'Not recorded';
export function renderOfferHistory(entries,{editable=true}={}){
 return `<div class="offer-history"><h3>Project offer history · internal only</h3><p class="muted">Times shown in UTC+04:00; original UTC timestamps retained. Sent means Pulse confirmed submission, not inbox delivery. Older emails without project links are labelled explicitly.</p>${entries.length?entries.map(entry=>{
  const projects=entry.offerProjects||[],results=entry.results||[],confirmed=results.some(result=>result.status==='sent');
  const outcome=entry.source==='external-manual'?'External email · manually reported':entry.status==='sending'?'Outcome unknown · check Pulse before retrying':confirmed?'Sent · Pulse confirmed':results.some(result=>/not respond|unconfirmed/i.test(result.error||''))?'Outcome uncertain · check Pulse':'Not sent / blocked / failed';
  const overrides=new Set((entry.catchAllOverride||[]).map(email=>String(email).toLowerCase()));
  return `<details class="card" style="padding:12px;margin:10px 0"><summary><strong>${esc(offerTime(entry.at))} · ${esc(outcome)}</strong><br>${esc(projects.map(project=>project.internalName).join(' + ')||'Projects not linked — historical/legacy draft')}</summary><p>Prospect: ${esc(entry.recordName||entry.recordId||'Current company')}</p><p>Subject: ${esc(entry.subject)}</p><p>Started: ${esc(offerTime(entry.at))}<br>Completed: ${esc(offerTime(entry.completedAt))}${entry.recordedAt?`<br>Recorded: ${esc(offerTime(entry.recordedAt))}`:''}</p><ul>${projects.map(project=>`<li><strong>${esc(project.internalName)}</strong> (${esc(project.id)}) — ${esc([project.technology,project.mwBand,project.stage,project.regionBand].join(' · '))}</li>`).join('')}</ul><ul>${(entry.recipients||[]).map(person=>`<li>${esc(person.name)} · ${esc(person.email)} · ${esc(person.field||'to')}${overrides.has(String(person.email).toLowerCase())?' · Catch-all, delivery unconfirmed':''}</li>`).join('')}</ul><ul>${results.map(result=>`<li>${esc((result.emails||[]).join(', '))}: ${esc(result.status)}${result.replay?' · duplicate retry, no new email':''} ${esc(result.error||'')} ${result.attemptedAt?` · ${esc(offerTime(result.attemptedAt))} → ${esc(offerTime(result.completedAt))}`:''}</li>`).join('')}</ul><p>Message submitted to Pulse (signature added by Pulse):</p>${(entry.messages?.length?entry.messages:[{body:entry.body||'Message body not retained by the earlier history format.'}]).map(message=>`<p>${esc((message.emails||[]).join(', '))}</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit">${esc(message.body)}</pre>`).join('')}<p>Follow-up: ${esc(entry.offerStatus||(confirmed?'Awaiting response':'Not recorded'))}</p>${editable?`<label>Update follow-up <select data-offer-status="${esc(entry.id)}"><option value="">Choose status</option>${OFFER_STATUSES.map(status=>`<option>${esc(status)}</option>`).join('')}</select></label><span data-offer-result="${esc(entry.id)}" role="status"></span>`:''}<ul>${(entry.offerEvents||[]).map(event=>`<li>${esc(offerTime(event.at))} — ${esc(event.status)}</li>`).join('')}</ul></details>`;
 }).join(''):'<p>No project offers recorded yet.</p>'}</div>`;
}

export function installOfferHistory({OpportunityPlatformApp:App,PlatformNavigation:Navigation}){
 const refresh=App.prototype.refreshProjectPicker;
 App.prototype.refreshProjectPicker=function(...args){const result=refresh?.apply(this,args);this.refreshOfferBadges();return result;};
 App.prototype.refreshOfferBadges=function(){
  if(this.path!=='/investors-jv')return;
  const entries=this.sendHistory?.projects?.[this.detailRecordId]?.history||[];
  this.root.querySelectorAll('[data-outreach-project]').forEach(input=>{
   const offers=entries.filter(entry=>entry.offerProjects?.some(project=>project.id===input.dataset.outreachProject)&&entry.results?.some(result=>result.status==='sent'&&!result.replay));
   let label=input.parentElement.querySelector('[data-previous-offer]');if(!label){label=this.root.ownerDocument.createElement('small');label.dataset.previousOffer='';(input.parentElement.querySelector('span')||input.parentElement).append(label);}
   label.textContent=offers.length?`Previously offered ${offers.length} time(s) · ${offerTime(offers[0].at)}`:'';
  });
 };
 const history=App.prototype.renderImportedOutreachHistory;
 App.prototype.renderImportedOutreachHistory=function(){
  const original=history.call(this);if(this.path!=='/investors-jv')return original;
  this.refreshOfferBadges();
  const entries=this.sendHistory?.projects?.[this.detailRecordId]?.history||[];
  return original+renderOfferHistory(entries)+`<details><summary>Record external email</summary><p>For emails already sent outside 8181. This records your report; it does not send an email. Enter the send time in your computer’s local timezone.</p><div data-external-offer><label>Date and time sent <input type="datetime-local" data-external-time></label><label>Recipient name <input data-external-name></label><label>Recipient email <input type="email" data-external-email></label><label>Subject <input data-external-subject></label><label>Exact sent message <textarea data-external-body rows="6"></textarea></label><p>Projects actually offered:</p>${pickerProjects.map(project=>`<label style="display:block"><input type="checkbox" data-external-project="${esc(project.id)}"> ${esc(project.internalName)}</label>`).join('')}<button type="button" data-record-external>Save external email record</button><p data-external-result role="status"></p></div></details>`;
 };
 const bind=App.prototype.bind;
 App.prototype.bind=function(...args){const result=bind.apply(this,args);
  const write=async(action,input)=>{
   const api=this.pulse?.api;if(!api)throw Error('History connection unavailable.');
   if(!api.token)await api.status();
   const response=await api.fetch(`/api/pulse/investors-jv/${action}`,{method:'POST',headers:{'Content-Type':'application/json','X-Pulse-Token':api.token},body:JSON.stringify(input)});
   const data=await response.json();if(!response.ok)throw Error(data.error||'History could not be saved.');return data;
  };
  this.root.addEventListener('change',async event=>{
   const id=event.target.dataset?.offerStatus;if(!id||!event.target.value||this.path!=='/investors-jv')return;
   const control=event.target;control.disabled=true;
   try{await write('offer-status',{id,status:control.value});await this.pulse.refresh();}catch(error){control.disabled=false;control.nextElementSibling.textContent=error.message;}
  });
  this.root.addEventListener('click',async event=>{
   const button=event.target.closest('[data-record-external]');if(!button||this.path!=='/investors-jv')return;
   const form=button.closest('[data-external-offer]'),get=selector=>form.querySelector(selector).value,status=form.querySelector('[data-external-result]');button.disabled=true;
   try{const time=get('[data-external-time]');if(!time)throw Error('Enter the send date and time in your computer’s local timezone.');
    await write('external-offer',{recordId:this.detailRecordId,recordName:this.rows.find(row=>row.id===this.detailRecordId)?.name||this.detailRecordId,mode:'together',subject:get('[data-external-subject]'),body:get('[data-external-body]'),sentAt:new Date(time).toISOString(),recipients:[{email:get('[data-external-email]'),name:get('[data-external-name]'),field:'to',origin:'added'}],offer:{projectIds:[...form.querySelectorAll('[data-external-project]:checked')].map(input=>input.dataset.externalProject)}});
    await this.pulse.refresh();
   }catch(error){status.textContent=error.message;button.disabled=false;}
  });
  return result;
 };
 // Reverse lookup uses the same immutable server history, not a second copy.
 App.prototype.refreshOfferedTo=async function(){
  if(this.path!=='/listed-projects'||this.detailTab!=='outreach')return;
  const recordId=this.detailRecordId,host=this.root.querySelector('[data-offered-to]');if(!host)return;
  try{const response=await fetch('/api/pulse/investors-jv/history',{cache:'no-store'});if(!response.ok)throw Error('History unavailable');const data=await response.json();if(!data.available)throw Error('History unavailable');
   const entries=Object.entries(data.projects).flatMap(([id,company])=>(company.history||[]).filter(entry=>entry.offerProjects?.some(project=>project.id===recordId)).map(entry=>({...entry,recordId:id})));
   if(this.detailRecordId===recordId)host.innerHTML='<h2>Offered to</h2>'+renderOfferHistory(entries.sort((a,b)=>b.at.localeCompare(a.at)),{editable:false});
  }catch{host.textContent='Offer history is unavailable. Retry by reopening this tab.';}
 };
 const render=App.prototype.renderOutreachPanel;
 App.prototype.renderOutreachPanel=function(record){const markup=render.call(this,record);return this.path==='/listed-projects'?markup+'<section class="card" data-offered-to><h2>Offered to</h2><p>Loading offer history…</p></section>':markup;};
 const restore=Navigation.prototype.restore;
 Navigation.prototype.restore=function(...args){const result=restore.apply(this,args);this.app?.refreshOfferedTo?.();return result;};
}
