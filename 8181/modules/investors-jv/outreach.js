import {PITCH_OPTIONS,buildAnonymousPitch,checkAnonymity} from './outreach-policy.js';

/** Module-owned content; the existing cards, editor, workflow and Pulse layout stay shared. */
export function installInvestorOutreach({OpportunityPlatformApp:App,PlatformNavigation:Navigation}){
 const render=App.prototype.renderOutreachPanel;
 App.prototype.renderOutreachPanel=function(record){
  let markup=render.call(this,record);if(this.path!=='/investors-jv')return markup;
  const saved=this.windWorkflow(this.detailRecordId).outreachDraft;
  if(!saved)markup=markup.replace(/(<textarea id="outreach-draft"[^>]*>)[\s\S]*?(<\/textarea>)/,(_,open,close)=>open+this.escape(buildAnonymousPitch(record))+close);
  markup=markup.replace('<h2>Draft an introductory enquiry</h2>','<h2>Pitch Listed Projects</h2>');
  markup=markup.replace(/<p class="muted">Editable draft for this project\.[\s\S]*?<\/p>/,'<p class="muted">Anonymous project pitch tailored to recorded recipient intent. Mandate and fit still require confirmation. Existing drafts are preserved; identifying content cannot be copied or sent through this app. Review the sender signature separately.</p>');
  return markup.replace('<label class="sr-only" for="outreach-draft">',`<label for="investor-pitch-option">Message option</label><select id="investor-pitch-option">${PITCH_OPTIONS.map(option=>`<option value="${option.id}">${option.label}</option>`).join('')}</select><p><button type="button" class="quiet" data-detail-action="generate-investor-pitch">Use selected draft</button> <button type="button" class="quiet" data-detail-action="restore-investor-pitch">Restore previous draft</button></p><div data-pitch-confirmation hidden><p>Replace the editor text? The current draft will be retained in local draft versions.</p><button type="button" class="quiet" data-detail-action="confirm-investor-pitch">Confirm replacement</button> <button type="button" class="quiet" data-detail-action="cancel-investor-pitch">Cancel</button></div><p data-anonymity-status role="status" aria-live="polite"></p><label class="sr-only" for="outreach-draft">`);
 };
 App.prototype.outreachSafety=function(){return this.path==='/investors-jv'?checkAnonymity(this.root.querySelector('#outreach-draft')?.value||''):{safe:true};};
 App.prototype.refreshOutreachSafety=function(){
  if(this.path!=='/investors-jv'||this.detailTab!=='outreach')return;
  const result=this.outreachSafety(),status=this.root.querySelector('[data-anonymity-status]');
  if(status)status.textContent=result.message;
  const copy=this.root.querySelector('[data-detail-action="copy-outreach-draft"]');if(copy)copy.disabled=!result.safe;
  this.pulse?.refreshReadiness();
 };
 const restore=Navigation.prototype.restore;
 Navigation.prototype.restore=function(...args){const result=restore.apply(this,args);this.app?.refreshOutreachSafety?.();return result;};
 const capture=Navigation.prototype.captureField;
 Navigation.prototype.captureField=function(field){const result=capture.call(this,field);if(field.id==='outreach-draft')this.app?.refreshOutreachSafety?.();return result;};
 const action=App.prototype.handleDetailAction;
 App.prototype.handleDetailAction=function(name){
  if(this.path!=='/investors-jv')return action.call(this,name);
  if(name==='cancel-investor-pitch'){this.pendingInvestorPitch=null;const box=this.root.querySelector('[data-pitch-confirmation]');if(box)box.hidden=true;return;}
  if(['copy-outreach-draft','pulse-send'].includes(name)&&!this.outreachSafety().safe){this.refreshOutreachSafety();return;}
  if(!['generate-investor-pitch','restore-investor-pitch','confirm-investor-pitch'].includes(name))return action.call(this,name);
  const editor=this.root.querySelector('#outreach-draft');if(!editor)return;
  const record=this.rows.find(row=>row.id===this.detailRecordId);if(!record)return;
  const nav=this.navigation;if(!nav)return;
  const route=nav.current,previous=nav.drafts.read(route);
  const versions=previous.pitchVersions||[];
  const pending=this.pendingInvestorPitch;
  if(name==='confirm-investor-pitch'&&(!pending||pending.id!==this.detailRecordId||pending.path!==this.path||pending.before!==editor.value)){this.pendingInvestorPitch=null;nav.status('The draft changed. Choose the message option again.');return;}
  const recipients=[...(this.root.querySelectorAll?.('[data-pulse-recipient]:checked')||[])],person=recipients.length===1?recipients[0]:null;
  const recipientOptions={recipient:person?.dataset.name||'',recipientEmail:person?.dataset.pulseRecipient||'',audience:this.root.querySelector('#picker-audience')?.value||'auto'};
  const draft=name==='confirm-investor-pitch'?pending.draft:name==='restore-investor-pitch'?versions.at(-1)?.text:buildAnonymousPitch(record.source||record,this.root.querySelector('#investor-pitch-option')?.value||'intro',undefined,recipientOptions);
  if(draft===undefined){nav.status('No previous draft is stored for this company.');return;}
  if(editor.value===draft)return;
  const box=this.root.querySelector('[data-pitch-confirmation]');
  if(editor.value&&name!=='confirm-investor-pitch'){this.pendingInvestorPitch={id:this.detailRecordId,path:this.path,before:editor.value,draft};if(box)box.hidden=false;return;}
  const offerContext=name==='restore-investor-pitch'?versions.at(-1)?.offerContext:pending?.offerContext;
  const next={...previous,fields:{...previous.fields,'outreach-draft':{value:draft}},offerContext:offerContext||null,pitchVersions:[...versions,{at:new Date().toISOString(),text:editor.value,offerContext:previous.offerContext||null}]};
  if(!nav.drafts.write(route,next)){
   nav.drafts.cache.set(nav.drafts.key(route),previous);
   nav.status('Draft could not be preserved in browser storage. The editor was not changed.');return;
  }
  editor.value=draft;this.pendingInvestorPitch=null;if(box)box.hidden=true;this.refreshOutreachSafety();
 };
}
