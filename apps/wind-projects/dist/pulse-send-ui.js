import {formatBody,parseDraft,personalise,placeholderPattern} from './format.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MAX=10;
const reoonLabel=check=>!check?['○','Not checked','uncertain']:check.status==='safe'&&check.deliverable?['✓','Reoon safe','positive']:check.status==='role_account'?['◎','Role / shared inbox','uncertain']:check.status==='catch_all'?['≈','Catch-all','uncertain']:check.status==='invalid'?['×','Invalid','negative']:['?',`Reoon ${check.status}`,'uncertain'];
const resultLabel=r=>r.status==='sent'?`<span class="pulse-result sent">✓ Sent${r.replay?' (already sent earlier)':''}</span>`:r.status==='blocked'?`<span class="pulse-result blocked">✕ Blocked — ${esc(r.error)}</span>`:`<span class="pulse-result failed">! ${esc(r.error)}</span>`;

/** "Send with Pulse" card on each project's Outreach tab: that project's contacts and that project's draft. */
export function createPulseSendUI({projects,contactDesk,notify,onSent}){
 const states=new Map();let busy=false;
 const stateFor=id=>{if(!states.has(id))states.set(id,{mode:'separate',picks:{},results:{},sends:null,loading:false});return states.get(id);};
 const rowsFor=p=>contactDesk.contacts(p).flatMap(c=>(c.emails||[]).map(email=>({c,email})));
 function defaults(p,st){const checks=contactDesk.snapshot().checks||{};let first=!Object.values(st.picks).some(x=>x.field==='to');for(const {c,email} of rowsFor(p))if(!st.picks[email]){const check=checks[email];const checked=check?.status==='safe'&&check.deliverable===true&&c.association!=='shared';st.picks[email]={contactId:c.id,checked,field:checked&&first?'to':'cc'};if(checked)first=false;}}
 const draftText=p=>document.querySelector('#draft')?.value??'';
 function selected(p,st){return rowsFor(p).filter(({email})=>st.picks[email]?.checked).map(({c,email})=>({contactId:c.id,name:c.name,email,field:st.mode==='separate'?'to':st.picks[email].field}));}
 function problem(p,st,draft){
  const enabled=contactDesk.snapshot().pulseEnabled===true;
  if(!contactDesk.isReady())return 'Loading the contact store…';
  if(!enabled)return 'Pulse not connected — set PULSE_SEND_KEY and restart the server.';
  const {subject,body}=parseDraft(draft);const picked=selected(p,st);
  if(!subject)return 'Start the draft with a "Subject: …" line.';
  if(!body)return 'The draft has no message body.';
  if(placeholderPattern.test(subject)||placeholderPattern.test(body))return 'Remove the [placeholder] lines from the draft — Pulse adds your signature.';
  if(!picked.length)return 'Tick at least one recipient.';
  if(picked.length>MAX)return `Up to ${MAX} recipients per send.`;
  if(st.mode==='together'&&!picked.some(r=>r.field==='to'))return 'Set at least one recipient to To.';
  return '';
 }
 function preview(p,st,draft){const {subject,body}=parseDraft(draft);const first=selected(p,st)[0];const text=st.mode==='separate'&&first?personalise(body,first.name):body;return `<div class="pulse-preview"><p class="muted">Preview${st.mode==='separate'&&first?` for ${esc(first.name)}`:''} · Pulse adds your signature below.</p><p class="pulse-preview-subject"><strong>Subject:</strong> ${esc(subject||'—')}</p><div class="pulse-preview-body">${formatBody(text).html}</div></div>`;}
 function history(st){if(!st.sends)return st.loading?'<p class="muted">Loading sent history…</p>':'';if(!st.sends.length)return '<p class="muted">No emails sent from this project yet.</p>';return `<ul class="pulse-history">${st.sends.map(s=>`<li><small>${esc(new Date(s.at).toLocaleString('en-GB',{timeZone:'Asia/Dubai'}))} (Dubai) · ${s.mode==='separate'?'one by one':'one email'}</small> ${esc(s.subject)} — ${s.summary.sent} sent${s.summary.blocked?`, ${s.summary.blocked} blocked`:''}${s.summary.failed?`, ${s.summary.failed} failed`:''}<br><span class="muted">${esc(s.recipients.map(r=>`${s.mode==='together'?r.field.toUpperCase()+' ':''}${r.email}`).join(', '))}</span></li>`).join('')}</ul>`;}
 async function loadHistory(p,st){if(st.loading||!contactDesk.isReady())return;st.loading=true;try{st.sends=(await contactDesk.request('/wind-projects/api/sends?projectId='+encodeURIComponent(p.id))).sends;}catch{st.sends=[];}finally{st.loading=false;refresh(p.id);}}
 function card(p,draft){
  const st=stateFor(p.id);defaults(p,st);if(st.sends===null)queueMicrotask(()=>loadHistory(p,st));
  const checks=contactDesk.snapshot().checks||{};const rows=rowsFor(p);const why=problem(p,st,draft);const count=selected(p,st).length;
  const label=busy?'Sending… (Pulse may take ~15 s to wake)':st.mode==='separate'?`Send ${count} email${count===1?'':'s'}`:`Send 1 email to ${count} ${count===1?'person':'people'}`;
  return `<div class="card pulse-send" id="pulse-send" data-pulse-project="${esc(p.id)}"><h2>Send with Pulse</h2><p class="muted">Sends this project's draft from your GrynH2 Pulse mailbox. Pulse checks every recipient and adds your signature; sent mail appears in Pulse Sent.</p>
<div class="pulse-mode" role="radiogroup" aria-label="Send mode"><label><input type="radio" name="pulse-mode" value="separate" ${st.mode==='separate'?'checked':''}> One by one (personal greeting)</label><label><input type="radio" name="pulse-mode" value="together" ${st.mode==='together'?'checked':''}> One email (To / CC / BCC)</label></div>
${rows.length?`<table class="pulse-recipients"><tbody>${rows.map(({c,email})=>{const pick=st.picks[email];const [sym,text,cls]=reoonLabel(checks[email]);const result=st.results[email];return `<tr><td><input type="checkbox" data-pulse-pick="${esc(email)}" aria-label="Send to ${esc(email)}" ${pick.checked?'checked':''}></td><td><strong>${esc(c.name)}</strong><br><small class="muted">${esc(c.title||'')}${c.association==='shared'?' · shared inbox':''}</small></td><td>${esc(email)}<br><span class="pulse-reoon ${cls}" title="${esc(text)}">${sym} ${esc(text)}</span>${result?`<br>${resultLabel(result)}`:''}</td><td>${st.mode==='together'?`<select data-pulse-field="${esc(email)}" aria-label="Field for ${esc(email)}">${['to','cc','bcc'].map(f=>`<option value="${f}" ${pick.field===f?'selected':''}>${f.toUpperCase()}</option>`).join('')}</select>`:''}</td></tr>`;}).join('')}</tbody></table>`:'<p class="muted">No contact emails yet. Add them in the Contacts tab.</p>'}
<p><button class="primary" id="pulse-send-button" ${why||busy?'disabled':''}>${esc(label)}</button></p>${why&&!busy?`<p class="muted pulse-why">${esc(why)}</p>`:''}
${preview(p,st,draft)}<h3>Sent history</h3>${history(st)}</div>`;
 }
 function refresh(projectId){const el=document.querySelector('#pulse-send');if(!el||el.dataset.pulseProject!==projectId)return;const p=projects.find(x=>x.id===projectId);if(p)el.outerHTML=card(p,draftText(p));}
 async function send(p){
  const st=stateFor(p.id);const draft=draftText(p);if(busy||problem(p,st,draft))return;
  const {subject,body}=parseDraft(draft);const recipients=selected(p,st);
  busy=true;for(const r of recipients)delete st.results[r.email];refresh(p.id);
  try{
   const out=await contactDesk.request('/wind-projects/api/send',{projectId:p.id,mode:st.mode,subject,body,recipients:recipients.map(({contactId,email,field})=>({contactId,email,field}))});
   for(const r of out.results)for(const email of r.emails)st.results[email]=r;
   const {sent,blocked,failed}=out.summary;
   notify([`${sent} sent`,blocked&&`${blocked} blocked`,failed&&`${failed} failed`].filter(Boolean).join(', ')+'.');
   if(out.workflowUpdate)onSent(p.id,out.workflowUpdate,draft);
   st.sends=null;
  }catch(e){notify(e.message);}
  finally{busy=false;refresh(p.id);}
 }
 const projectOf=()=>{const id=document.querySelector('#pulse-send')?.dataset.pulseProject;return projects.find(p=>p.id===id);};
 document.addEventListener('change',e=>{const p=projectOf();if(!p||busy)return;const st=stateFor(p.id);
  if(e.target.matches('[data-pulse-pick]')){st.picks[e.target.dataset.pulsePick].checked=e.target.checked;refresh(p.id);}
  else if(e.target.matches('[data-pulse-field]')){st.picks[e.target.dataset.pulseField].field=e.target.value;refresh(p.id);}
  else if(e.target.matches('[name="pulse-mode"]')){st.mode=e.target.value;refresh(p.id);}});
 document.addEventListener('input',e=>{if(e.target.id==='draft'){const p=projectOf();if(p&&!busy)refresh(p.id);}});
 document.addEventListener('click',e=>{if(e.target.closest('#pulse-send-button')){const p=projectOf();if(p)send(p);}});
 return {card,refresh};
}
