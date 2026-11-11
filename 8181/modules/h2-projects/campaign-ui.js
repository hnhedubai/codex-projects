const endpoint='/api/pulse/h2-projects/campaign';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function installH2Campaign({OpportunityPlatformApp:App,PlatformNavigation:Navigation}){
 const panel=App.prototype.renderOutreachPanel;
 App.prototype.renderOutreachPanel=function(...args){const markup=panel.apply(this,args);return this.path==='/h2-projects'?markup.replace('<label>Email status','<p data-h2-booking-status role="status"></p><label>Email status'):markup;};
 const history=App.prototype.renderImportedOutreachHistory;
 App.prototype.renderImportedOutreachHistory=function(...args){
  if(this.path!=='/h2-projects')return history.apply(this,args);
  const project=this.sendHistory?.projects?.[this.detailRecordId],entries=project?.history||[],scheduled=entries.flatMap(e=>(e.results||[]).filter(r=>r.status==='scheduled'));
  const view=Object.create(this);view.sendHistory={...this.sendHistory,projects:{...this.sendHistory?.projects,[this.detailRecordId]:{...project,history:entries.map(e=>({...e,results:(e.results||[]).filter(r=>r.status!=='scheduled')}))}}};
  const label=scheduled.length?`Email status: Scheduled ${new Date(scheduled[0].scheduledAt).toLocaleString('en-AU',{timeZone:'Australia/Sydney'})} Sydney time${scheduled.length>1?` · ${scheduled.length} bookings`:''}. Check Pulse → Scheduled for edits or cancellations.`:'';
  const node=this.root?.querySelector?.('[data-h2-booking-status]');if(node)node.textContent=label;
  return history.apply(view,args)+(scheduled.length?`<ul>${scheduled.map(r=>`<li>Scheduled ${esc(new Date(r.scheduledAt).toLocaleString('en-AU',{timeZone:'Australia/Sydney'}))} Sydney time · ${esc((r.emails||[]).join(', '))} · Booking ${esc(r.scheduledId)}</li>`).join('')}</ul>`:'');
 };
 const restore=Navigation.prototype.restore;
 Navigation.prototype.restore=function(...args){const result=restore.apply(this,args);this.app?.syncH2CampaignButton();return result;};
 App.prototype.syncH2CampaignButton=function(){
  const actions=this.root.querySelector('.topbar-actions');if(!actions)return;
  let button=actions.querySelector('[data-h2-campaign]');
  if(!button){button=this.root.ownerDocument.createElement('button');button.type='button';button.className='quiet';button.dataset.h2Campaign='';button.textContent='Outreach queue';actions.append(button);}
  button.hidden=this.path!=='/h2-projects';
 };
 const bind=App.prototype.bind;
 App.prototype.bind=function(...args){const result=bind.apply(this,args);this.syncH2CampaignButton();this.root.addEventListener('click',event=>{if(event.target.closest('[data-h2-campaign]')&&this.path==='/h2-projects')this.openH2Campaign();});return result;};
 App.prototype.openH2Campaign=async function(){
  let dialog=this.root.querySelector('[data-h2-queue-dialog]');if(dialog){dialog.showModal();return;}
  dialog=this.root.ownerDocument.createElement('dialog');dialog.dataset.h2QueueDialog='';
  dialog.style.cssText='width:min(1100px,94vw);max-height:88vh;overflow:auto;border:1px solid #d7e4df;border-radius:14px;padding:24px;color:#203d41;background:#fff';
  this.root.append(dialog);let state=null,busy=false,poll;
  const request=async input=>{
   const options={cache:'no-store'};
   if(input){const status=await fetch('/api/pulse/status',{cache:'no-store'}).then(r=>r.json());Object.assign(options,{method:'POST',headers:{'Content-Type':'application/json','X-Pulse-Token':status.token},body:JSON.stringify(input)});}
   const response=await fetch(endpoint,options),data=await response.json();if(!response.ok)throw Error(data.error||'Queue request failed.');return data;
  };
  const render=()=>{
   const scroll=dialog.scrollTop,opened=new Set([...dialog.querySelectorAll('details[open]')].map(d=>d.dataset.job));
   const jobs=state?.jobs||[],counts=jobs.reduce((a,j)=>(a[j.status]=(a[j.status]||0)+1,a),{}),running=state?.status==='booking';
   dialog.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px"><h2>H2 Projects outreach queue</h2><button class="quiet" data-q="close" type="button">Close</button></div>
    <p>Sender: <strong>mubashir@hnh.ae</strong> — confirmed by your self-preview. One recipient per email. Pulse holds the bookings and sends them independently of this laptop. Planned times are <strong>2–5 minutes apart</strong> within Australian weekday business hours; overnight and weekend breaks are longer.</p>
    <p>Save draft edits before preparing. The queue uses saved drafts where available, fills each recipient’s greeting, assigns distinct subjects, and includes each eligible email address only once across all projects. Current individual Reoon-safe business contacts only.</p>
    <p role="status" data-queue-status><strong>${esc(state?.status||'Loading')}</strong>${state?.schedulingHold!==false?' · Scheduling ON HOLD':''} · ${jobs.length} recipients · ${counts.scheduled||0} booked · ${counts.sent||0} sent · ${counts.pending||0} pending · ${counts.blocked||0} blocked · ${counts.uncertain||0} uncertain</p>
    <p>${esc(state?.error||state?.note||'Prepare the queue to review recipients and messages. No emails start automatically.')}</p>
    <label>First start, Sydney local time <input type="datetime-local" data-plan-start value="${esc(state?.sydneyStart||'2026-11-05T10:30')}"></label>
    <p>Contact time zones take precedence. Otherwise the project’s region is a proxy and must be reviewed; an Australia-wide project needs a confirmed time zone.</p>
    <label><input type="checkbox" data-zone-consent style="width:auto"> I reviewed and accept the displayed project-region time zones for these recipients.</label>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
    <button type="button" class="quiet" data-q="prepare" ${running||busy?'disabled':''}>Prepare / refresh recipients</button>
    <button type="button" class="quiet" data-q="plan" ${!state?.id||!counts.pending||busy?'disabled':''}>Preview hosted schedule</button>
    <button type="button" class="primary" data-q="book" ${state?.status!=='planned'||state?.schedulingHold!==false||!counts.pending||busy||state?.error?'disabled':''}>Book reviewed emails in Pulse</button>
    <button type="button" class="quiet" data-q="cancel" ${!state?.id||counts.scheduled||busy?'disabled':''}>Cancel unbooked queue</button>
    <button type="button" class="quiet" data-q="refresh" ${busy?'disabled':''}>Refresh status</button></div>
    <p>Nothing is sent or booked by previewing. After booking, use Pulse → Scheduled to edit or cancel. Provider limits may move delivery later. Pulse alone handles automatic follow-ups. Uncertain bookings require reconciliation with the same stable key.</p>
    <div style="overflow:auto;max-height:45vh"><table style="width:100%"><thead><tr><th>Project / company</th><th>Recipient</th><th>Subject / message</th><th>Status</th><th></th></tr></thead><tbody>${jobs.map(j=>`<tr><td>${esc(j.project)}<br><small>${esc(j.company)}</small></td><td>${esc(j.name)}<br>${esc(j.email)}</td><td><details data-job="${esc(j.id)}"${opened.has(j.id)?' open':''}><summary>${esc(j.subject)}</summary><pre style="white-space:pre-wrap;font:inherit;max-width:580px">${esc(j.body)}</pre></details></td><td>${esc(j.status)}${j.scheduledAt?`<br><strong>Scheduled ${esc(new Date(j.scheduledAt).toLocaleString('en-AU',{timeZone:j.timeZone||'Australia/Sydney'}))}</strong><br><small>${esc(j.timeZone)} · ${esc(j.timeZoneBasis||'')}</small>`:''}${j.completedAt?`<br><small>${esc(new Date(j.completedAt).toLocaleString())}</small>`:''}${j.error?`<br><small>${esc(j.error)}</small>`:''}</td><td>${j.status==='pending'?`<button type="button" class="quiet" data-q="remove" data-job-id="${esc(j.id)}"${running?' disabled':''}>Remove</button>`:''}</td></tr>`).join('')||'<tr><td colspan="5">No prepared recipients.</td></tr>'}</tbody></table></div>
    <details><summary>Excluded or deduplicated entries (${(state?.excluded?.length||0)+(state?.planningExcluded?.length||0)})</summary>${[...(state?.excluded||[]),...(state?.planningExcluded||[])].map(e=>`<p>${esc(e.project||e.jobId)} · ${esc(e.email||e.name||'')} — ${esc(e.reason)}</p>`).join('')}</details>`;
   dialog.scrollTop=scroll;
  };
  const load=async()=>{try{state=await request();render();}catch(error){dialog.innerHTML=`<h2>Outreach queue</h2><p role="alert">${esc(error.message)}</p><button type="button" data-q="close">Close</button>`;}};
  dialog.addEventListener('click',async event=>{
   const button=event.target.closest('[data-q]');if(!button||button.disabled)return;
   const command=button.dataset.q;if(command==='close'){dialog.close();return;}if(busy)return;
   const start=dialog.querySelector('[data-plan-start]')?.value,consent=dialog.querySelector('[data-zone-consent]')?.checked;
   busy=true;render();
   try{
    if(command==='refresh')state=await request();
    else {let workflows={};if(command==='prepare'){const raw=(this.navigation?.storage||localStorage).getItem('oplatform:/h2-projects:detail-workflow');workflows=raw?JSON.parse(raw):{};}
     state=await request({command,campaignId:state?.id,jobId:button.dataset.jobId,...(command==='prepare'?{workflows}:{}),...(command==='plan'?{sydneyStart:start}:{}),...(command==='book'?{confirmBooking:true,acceptProjectTimeZones:consent}:{})});}
   }catch(error){state={...state,error:error.message};}
   finally{busy=false;render();}
  });
  dialog.addEventListener('close',()=>{clearInterval(poll);dialog.remove();},{once:true});dialog.showModal();await load();
  poll=setInterval(()=>{if(dialog.open&&!busy&&state?.status==='running')load();},3000);
 };
}
