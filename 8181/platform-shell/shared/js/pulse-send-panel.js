import {pulseModules,PULSE_MAX_RECIPIENTS} from './pulse-modules.js';
import {parseDraft,placeholderPattern} from './pulse-format.js';
import {isSourcedCorporateCandidate} from './contact-registry.js';
import {OUTREACH_DRAFT_V2,OUTREACH_CATCHALL_CONSENT} from '../../../modules/investors-jv/outreach-settings.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NOT_SENDABLE=/candidate only|historical|not established|user-reported invalid/i;

/** Browser client for the 8181 Pulse API (/api/pulse/…). */
export class PulseSendApi {
 constructor(fetchImpl=(...args)=>fetch(...args)){this.fetch=fetchImpl;this.token='';}
 async #json(url,options={}){
  let response;try{response=await this.fetch(url,{cache:'no-store',...options});}catch{throw Error('8181 server is not reachable.');}
  let body={};try{body=await response.json();}catch{}
  if(!response.ok)throw Object.assign(Error(body.error||`Request failed (HTTP ${response.status}).`),{status:response.status});
  return body;
 }
 async status(){const status=await this.#json('/api/pulse/status');this.token=status.token||'';return status;}
 history(key){return this.#json(`/api/pulse/${encodeURIComponent(key)}/history`);}
 deskHistory(url){return this.#json(url);}
 reoonResults(){return this.#json('/api/reoon/results');}
 verifyEmail(email,context){return this.#json('/api/reoon/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emails:[email],refresh:true,context})});}
 async send(key,input){
  if(!this.token)await this.status();
  return this.#json(`/api/pulse/${encodeURIComponent(key)}/send`,{method:'POST',headers:{'Content-Type':'application/json','X-Pulse-Token':this.token},body:JSON.stringify(input)});
 }
}

/** "Send with Pulse" for one 8181 module: recipient picker, optional checklist, send, and merged send history.
    History is fetched on load, after each send and on "Refresh send history" only (no polling). */
export class PulseSendController {
 static forPath(path,api=new PulseSendApi()){const module=pulseModules[path];return module?new PulseSendController({path,module,api}):null;}
 constructor({path,module,api}){Object.assign(this,{path,module,api});this.status=null;this.sending=false;this.app=null;this.verification={};this.verifying=new Set();this.catchAllPending=null;}
 attach(app){
  this.app=app;
  this.listeners?.abort();this.listeners=new AbortController();
  app.root.addEventListener('change',event=>{
   if(event.target.matches('[data-pulse-mode]'))this.#syncMode();
   if(event.target.matches('[data-pulse-check]')&&app.detailRecordId){
    const checks={...(app.windWorkflow(app.detailRecordId).pulseChecks||{}),[event.target.dataset.pulseCheck]:event.target.checked};
    app.saveWindWorkflow(app.detailRecordId,{pulseChecks:checks});this.#syncButton();
   }
   if(event.target.matches('[data-pulse-recipient],[data-pulse-field]'))this.#syncButton();
   if(event.target.matches('[data-pulse-catchall]'))this.#syncCatchAllButton();
   if(event.target.matches('[data-pulse-recipient]')&&event.target.checked)this.verifySelected();
  },{signal:this.listeners.signal});
  app.root.addEventListener('click',event=>{const button=event.target.closest('[data-pulse-reoon]');if(!button)return;const detail=button.nextElementSibling;if(detail){detail.textContent=this.verificationDetails(button.dataset.pulseReoon);detail.hidden=!detail.hidden;button.setAttribute('aria-expanded',String(!detail.hidden));}},{signal:this.listeners.signal});
  return this;
 }
 detach(){this.listeners?.abort();}
 get checks(){return this.module.requiredChecks||[];}
 checksDone(recordId){const saved=this.app.windWorkflow(recordId).pulseChecks||{};return this.checks.every(check=>saved[check.id]===true);}

 /* ---------- history ---------- */
 verificationLabel(email){
  if(this.verifying.has(email))return '⏳ Reoon: checking';
  const item=this.verification[email];if(!item)return '○ Reoon: not checked';
  if(item.error&&!item.checkedAt)return `⚠ Reoon: unavailable — ${item.error}`;
  const age=Date.now()-Date.parse(item.checkedAt);if(!Number.isFinite(age)||age>30*86400000||age< -60000)return '⚠ Reoon: stale — recheck required';
  return `${item.deliverable===true&&['safe','role_account','catch_all'].includes(item.status)?'✓':'✕'} Reoon: ${item.status}${item.isRoleAccount?' · shared mailbox':''}`;
 }
 refreshVerification(){
  this.app?.root.querySelectorAll?.('[data-pulse-reoon]').forEach(button=>{const label=this.verificationLabel(button.dataset.pulseReoon);button.style.color=label.startsWith('✓')?'#176b45':label.startsWith('✕')?'#a52d27':'#755516';});
  this.app?.root.querySelectorAll?.('[data-pulse-reoon]').forEach(button=>{const email=button.dataset.pulseReoon;button.textContent=this.verificationLabel(email);const detail=button.nextElementSibling;if(detail)detail.textContent=this.verificationDetails(email);
   if(button.dataset.pulseCorporateCandidate==='true'){const row=button.closest('tr'),input=row?.querySelector('[data-pulse-recipient]'),ready=this.corporateMailboxReady(email);if(input){input.disabled=!ready;if(!ready)input.checked=false;}const note=row?.querySelector('.outreach-recipient-status');if(note)note.textContent=this.corporateCandidateNote(email);}
  });
 }
 verificationDetails(email){const item=this.verification[email];return `${email} · ${item?`Provider: ${item.provider||'Reoon'} · Mode: ${item.mode||'unknown'} · Status: ${item.status||'unavailable'} · Deliverable: ${item.deliverable===true?'yes':'not confirmed'} · Checked: ${item.checkedAt||'not recorded'}${item.checkedAt?' · Dubai: '+new Date(item.checkedAt).toLocaleString('en-GB',{timeZone:'Asia/Dubai'}):''}${item.error?' · '+item.error:''}`:'No verification result recorded.'} · Mailbox verification does not prove person-email ownership.`;}
 corporateMailboxReady(email){const item=this.verification[email],age=Date.now()-Date.parse(item?.checkedAt);return item?.provider==='Reoon'&&item.mode==='power'&&item.deliverable===true&&['safe','role_account','catch_all'].includes(item.status)&&Number.isFinite(age)&&age>=-60000&&age<=30*86400000;}
 corporateCandidateNote(email){return `${this.corporateMailboxReady(email)?'Corporate business route; person-email association unconfirmed. Pulse still checks before sending.':'Not sendable until Reoon confirms a fresh safe corporate mailbox.'}`;}
 async verifySelected(){
  const recordId=this.app.detailRecordId;
  for(const person of this.#selected()){
   if(this.verifying.has(person.email))continue;
   const saved=this.verification[person.email],age=Date.now()-Date.parse(saved?.checkedAt);if(saved&&age>=0&&age<=30*86400000)continue;
   if(!this.api.verifyEmail)continue;
   this.verifying.add(person.email);this.refreshVerification();
   try{const data=await this.api.verifyEmail(person.email,{module:this.path,recordId,name:person.name||person.email,email:person.email,...(person.origin==='added'?{provenance:'manual-contact-entry'}:{})});for(const result of data.results||[])this.verification[result.email]=result;}
   catch(error){this.verification[person.email]={status:'unavailable',error:error.message};}
   finally{this.verifying.delete(person.email);this.refreshVerification();}
  }
 }
 async refresh(){
  const app=this.app;const notices=[];
  const own=await this.api.history(this.module.key).catch(error=>({available:false,error:error.message}));
  if(!own.available)notices.push('8181 send history is not available right now.');
  let desk=null;
  if(this.module.deskHistory){desk=await this.api.deskHistory(this.module.deskHistory).catch(()=>({available:false}));if(!desk.available)notices.push('Send history from the Wind Projects desk is not available right now.');}
  if(!this.status)this.status=await this.api.status().catch(error=>({enabled:false,error:error.message}));
  if(this.api.reoonResults){try{const saved=await this.api.reoonResults();Object.assign(this.verification,saved.results||{});}catch{/* Keep unavailable states visible; server gate remains mandatory. */}}
  const projects={};
  const merge=(source,origin)=>{for(const [id,item] of Object.entries(source?.available&&source.projects||{})){
   const target=projects[id]??={lastSentAt:null,sentCount:0,blockedCount:0,failedCount:0,pendingCount:0,history:[]};
   for(const field of ['sentCount','blockedCount','failedCount','pendingCount'])target[field]+=Number(item[field])||0;
   if(item.lastSentAt&&(!target.lastSentAt||item.lastSentAt>target.lastSentAt))target.lastSentAt=item.lastSentAt;
   target.history.push(...(Array.isArray(item.history)?item.history:[]).map(entry=>({...entry,origin})));
  }};
  merge(own,'8181');merge(desk,'Wind Projects desk');
  for(const item of Object.values(projects))item.history.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  if(app.pulse&&app.pulse!==this)return null;
  app.sendHistory={available:!!own.available||!!desk?.available,projects,syncedAt:own.generatedAt||desk?.generatedAt||new Date().toISOString(),notices};
  if(app.sidebar){app.sidebar.sendHistory=projects;app.sidebar.refreshOutreachSignals();}
  const section=app.root?.querySelector?.('.outreach-send-history');
  if(section)section.innerHTML=app.renderSendHistorySync()+app.renderImportedOutreachHistory();
  this.#syncButton();
  this.refreshVerification();
  return app.sendHistory;
 }

 /* ---------- rendering ---------- */
 recipients(record){
  const state=this.app.windWorkflow(this.app.detailRecordId);
  const contacts=[...(Array.isArray(record.contacts)?record.contacts:[]).map(contact=>({contact,origin:'published'})),...(Array.isArray(state.contactsAdded)?state.contactsAdded:[]).map(contact=>({contact,origin:'added'}))];
  const seen=new Set();const rows=[];
  for(const {contact,origin} of contacts)for(const route of this.app.contactEmailRoutes(contact)){
   const email=String(route.email||'').trim().toLowerCase();if(!email.includes('@')||seen.has(email))continue;seen.add(email);
   const restriction=[contact.status,contact.roleStatus,contact.title,contact.role,route.status,route.type].filter(Boolean).join(' ');
   const corporateCandidate=isSourcedCorporateCandidate(contact,route);
   const blocked=corporateCandidate?!this.corporateMailboxReady(email):NOT_SENDABLE.test(restriction)||/\bformer\b|replaced|not a current/i.test(restriction);
   rows.push({email,name:contact.name||'',title:contact.title||contact.role||'',origin,blocked,corporateCandidate,note:corporateCandidate?this.corporateCandidateNote(email):blocked?(contact.roleStatus||contact.status||route.status||'Historical or restricted route'):origin==='added'?'Added by you':route.status||route.type||'Published route'});
  }
  return rows;
 }
 renderChecklist(recordId){
  if(!this.checks.length)return '';
  const saved=this.app.windWorkflow(recordId).pulseChecks||{};
  return `<section class="card wind-outreach-card pulse-checklist"><h2>Before sending</h2><p class="muted">${esc(this.module.label)} outreach is locked until every check is ticked. Ticks are saved in this browser.</p>${this.checks.map(check=>`<label class="pulse-check"><input type="checkbox" data-pulse-check="${esc(check.id)}" ${saved[check.id]===true?'checked':''}> ${esc(check.label)}</label>`).join('')}</section>`;
 }
 renderCard(record){
  const rows=this.recipients(record);
  const enabled=this.status?.enabled===true;
  const help=this.status==null?'Checking the Pulse connection…':enabled?`Sends through Pulse (api.grynh2.com). Pulse checks every recipient and adds your signature. Up to ${PULSE_MAX_RECIPIENTS} recipients per send.`:`Pulse is not connected${this.status?.error?` (${esc(this.status.error)})`:''}. Set PULSE_SEND_KEY and restart 8181.`;
const recipientRows=rows.length?rows.map(row=>`<tr><td><input type="checkbox" data-pulse-recipient="${esc(row.email)}" data-name="${esc(row.name)}" data-origin="${row.origin}"${OUTREACH_DRAFT_V2&&this.path==='/investors-jv'?` data-job-title="${esc(row.title)}"`:''} ${row.blocked?'disabled':''} aria-label="Select ${esc(row.email)}"></td><td><strong>${esc(row.name||'Unnamed contact')}</strong><br><small class="muted">${esc(row.title||'Role not recorded')}</small></td><td>${esc(row.email)}<br><span class="outreach-recipient-status">${esc(row.blocked?'Not sendable · '+row.note:row.note)}</span></td><td><select data-pulse-field="${esc(row.email)}" aria-label="Field for ${esc(row.email)}" hidden><option value="to">To</option><option value="cc">CC</option><option value="bcc">BCC</option></select></td></tr>`).join(''):'<tr><td colspan="4" class="wind-detail-empty">No email routes recorded. Add a contact on the Contacts tab.</td></tr>';
  const verifiedRows=recipientRows.replace(/(<td>)([^<]+)(<br><span class="outreach-recipient-status">)/g,(match,open,address,tail)=>{
   const row=rows.find(row=>esc(row.email)===address);return row?`${open}${address}<br><button type="button" class="quiet" data-pulse-reoon="${esc(row.email)}" data-pulse-corporate-candidate="${row.corporateCandidate}" aria-expanded="false" title="View the saved Reoon verification result">${esc(this.verificationLabel(row.email))}</button><p hidden role="status">${esc(this.verificationDetails(row.email))}</p>${tail}`:match;
  });
  const heading=this.module.deskHistory?'Send history (8181 and Wind Projects desk)':'Send history';
  return `<section class="card wind-outreach-card wind-pulse-card" data-pulse-card><h2>Send with Pulse</h2><p class="muted">${help}</p><div class="outreach-mode"><label><input type="radio" name="pulse-mode" value="separate" data-pulse-mode checked> One by one (personal greeting)</label><label><input type="radio" name="pulse-mode" value="together" data-pulse-mode> One email (To / CC / BCC)</label></div><table class="outreach-recipients"><tbody>${verifiedRows}</tbody></table><p><button type="button" class="primary" data-detail-action="pulse-send" disabled>Send with Pulse</button></p><section class="pulse-catchall-confirmation" data-pulse-catchall-confirmation hidden><h3>Confirm catch-all addresses</h3><p>These domains accept all mail, so Pulse cannot confirm the mailbox exists. The message may bounce or go unread. I want to send to these addresses anyway.</p><div data-pulse-catchall-list></div><p><button type="button" class="primary" data-detail-action="pulse-send-anyway" disabled>Send anyway</button></p></section><p class="pulse-send-status" role="status" aria-live="polite"></p><h3>${heading}</h3><div class="outreach-send-history">${this.app.renderSendHistorySync()}${this.app.renderImportedOutreachHistory()}</div></section>`;
 }
 /** Outreach tab for modules without the shared Wind draft layout (EN590). */
 renderOutreachTab(record,{title,draft}){
  const state=this.app.windWorkflow(this.app.detailRecordId);
  return `<div class="wind-outreach-grid"><div>${this.renderChecklist(this.app.detailRecordId)}<section class="card wind-outreach-card"><h2>Draft</h2><p class="muted">Start with a “Subject: …” line. Pulse adds your signature.</p><label class="sr-only" for="outreach-draft">Email draft</label><textarea id="outreach-draft" rows="14">${esc(state.outreachDraft||draft)}</textarea><p><button type="button" class="primary" data-detail-action="save-outreach-draft">Save draft</button></p></section>${this.renderCard(record)}</div><aside><section class="card wind-outreach-card"><h2>${esc(title)}</h2><p class="muted">Email status follows the send history. Sends are recorded in 8181 (platform-shell/data/pulse-sends/${esc(this.module.key)}.json).</p></section></aside></div>`;
 }

 /* ---------- sending ---------- */
 #card(){return this.app.root.querySelector('[data-pulse-card]');}
 #mode(){return this.app.root.querySelector('[data-pulse-mode]:checked')?.value||'separate';}
 #selected(){
  const card=this.#card();if(!card)return [];
  const together=this.#mode()==='together';
  return [...card.querySelectorAll('[data-pulse-recipient]:checked')].map(input=>({email:input.dataset.pulseRecipient,name:input.dataset.name,jobTitle:input.dataset.jobTitle,origin:input.dataset.origin,field:together?card.querySelector(`[data-pulse-field="${CSS.escape(input.dataset.pulseRecipient)}"]`)?.value||'to':'to'}));
 }
 #syncMode(){const card=this.#card();if(!card)return;const together=this.#mode()==='together';card.querySelectorAll('[data-pulse-field]').forEach(select=>{select.hidden=!together;});this.#syncButton();}
 refreshReadiness(){this.#syncButton();}
 #syncButton(){
  const button=this.#card()?.querySelector('[data-detail-action="pulse-send"]');if(!button)return;
  const count=this.#selected().length;const ready=this.status?.enabled===true&&!this.sending&&count>0&&count<=PULSE_MAX_RECIPIENTS&&this.checksDone(this.app.detailRecordId);
  button.disabled=!ready||this.app.outreachSafety?.().safe===false;
  button.textContent=this.sending?'Sending…':count?`Send with Pulse (${count})`:'Send with Pulse';
  button.title=!this.checksDone(this.app.detailRecordId)?'Complete the checklist first':count>PULSE_MAX_RECIPIENTS?`Up to ${PULSE_MAX_RECIPIENTS} recipients`:'';
 }
 #syncCatchAllButton(){const button=this.#card()?.querySelector('[data-detail-action="pulse-send-anyway"]');if(!button)return;button.disabled=!this.#card().querySelector('[data-pulse-catchall]:checked')||this.sending;}
 #showCatchAllConfirmation(candidates){
  if(!OUTREACH_CATCHALL_CONSENT)return;
  const card=this.#card(),section=card?.querySelector('[data-pulse-catchall-confirmation]'),list=card?.querySelector('[data-pulse-catchall-list]');if(!section||!list)return;
  list.innerHTML=candidates.map(item=>`<label style="display:block;margin:6px 0"><input type="checkbox" data-pulse-catchall value="${esc(item.email)}"> ${esc(item.email)}</label>`).join('');
  section.hidden=false;this.#syncCatchAllButton();
 }
 #catchAllCandidates(result){
  const blocked=new Set((result.results||[]).filter(item=>item.status==='blocked').flatMap(item=>item.emails||[]).map(email=>String(email).toLowerCase()));
  const verification=Array.isArray(result.pulseVerification)?result.pulseVerification:(result.pulseVerification?.risky||[]);
  return verification.filter(item=>item?.catchAll===true&&blocked.has(String(item.address||item.email||'').toLowerCase())&&!item.invalid).map(item=>({email:String(item.address||item.email).toLowerCase()}));
 }
 #say(text){const status=this.#card()?.querySelector('.pulse-send-status');if(status)status.textContent=text;}
 async send(record){
  if(this.sending)return null;
  const safety=this.app.outreachSafety?.();if(safety?.safe===false){this.#say(safety.message);return null;}
  const recordId=this.app.detailRecordId;
  const {subject,body}=parseDraft(this.app.root.querySelector('#outreach-draft')?.value||'');
  const recipients=this.#selected();const mode=this.#mode();
  if(!subject){this.#say('Start the draft with a “Subject: …” line.');return null;}
  if(placeholderPattern.test(subject)||placeholderPattern.test(body)){this.#say('Replace the [placeholder] text in the draft first.');return null;}
  if(!recipients.length){this.#say('Select at least one recipient.');return null;}
  let offer;try{offer=this.app.projectOfferContext?.();}catch(error){this.#say(error.message);return null;}
  const list=recipients.map(item=>`${mode==='together'?item.field.toUpperCase()+' ':''}${item.email}`).join(', ');
  const input={recordId,recordName:record.name||record.buyer||record.company||record.partner||'',mode,subject,body,recipients,...(offer?{offer}:{}),checks:this.app.windWorkflow(recordId).pulseChecks||{}};
  this.sending=true;this.#syncButton();this.#say(`Sending through Pulse to ${list}…`);
  try{
   const result=await this.api.send(this.module.key,input);
   for(const item of result.verification||[])this.verification[item.email]=item;this.refreshVerification();
   const {sent,blocked,failed}=result.summary;
   const candidates=this.#catchAllCandidates(result);
   if(candidates.length){const sentEmails=new Set((result.results||[]).filter(item=>item.status==='sent').flatMap(item=>item.emails||[]).map(email=>String(email).toLowerCase()));this.catchAllPending={input,sentEmails,candidates};this.#showCatchAllConfirmation(candidates);this.#say('Pulse blocked catch-all addresses. Review the confirmation below to retry only selected addresses.');}
   else if((!this.app.pulse||this.app.pulse===this)&&this.app.detailRecordId===recordId)this.#say(`Sent ${sent} · Blocked ${blocked} · Failed ${failed}.${result.results.filter(item=>item.error).map(item=>` ${item.emails.join(', ')}: ${item.error}`).join('')}`);
   return result;
   }catch(error){if((!this.app.pulse||this.app.pulse===this)&&this.app.detailRecordId===recordId)this.#say(error.message);return null;}
  finally{this.sending=false;await this.refresh();}
 }
 async sendAnyway(){
  if(this.sending||!this.catchAllPending)return null;
  const checked=[...this.#card()?.querySelectorAll('[data-pulse-catchall]:checked')||[]].map(input=>input.value.toLowerCase());
  if(!checked.length){this.#say('Select at least one catch-all address to confirm.');return null;}
  const pending=this.catchAllPending,already=pending.sentEmails||new Set();
  const recipients=pending.input.recipients.filter(item=>checked.includes(String(item.email).toLowerCase())&&!already.has(String(item.email).toLowerCase()));
  if(!recipients.length){this.#say('All confirmed addresses were already sent successfully.');return null;}
  this.sending=true;this.#syncCatchAllButton();this.#say(`Retrying through Pulse to ${recipients.map(item=>item.email).join(', ')}…`);
  try{
   const result=await this.api.send(this.module.key,{...pending.input,recipients,catchAllOverride:checked.filter(email=>recipients.some(item=>item.email.toLowerCase()===email))});
   for(const item of result.verification||[])this.verification[item.email]=item;this.refreshVerification();
   if(result.summary?.sent) this.catchAllPending=null;
   const refusal=result.results?.some(item=>item.status==='blocked');
   this.#say(refusal?'Pulse did not accept the catch-all override. The Pulse server update must be deployed and the key needs the override permission.':`Sent ${result.summary.sent} · Blocked ${result.summary.blocked} · Failed ${result.summary.failed}.`);
   return result;
  }catch(error){this.#say(error.message);return null;}
  finally{this.sending=false;await this.refresh();this.#syncCatchAllButton();}
 }
}
