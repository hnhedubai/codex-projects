import {OUTREACH_PROJECT_PICKER,OUTREACH_DRAFT_V2,OUTREACH_SUBJECT_ANONYMITY} from './outreach-settings.js';
import {subjectVariantsV2} from './outreach-draft-v2.js';
import {checkAnonymity} from './outreach-policy.js';
import {PITCH_OPTIONS} from './outreach-policy.js';
import {listedProjects} from '../listed-projects/data/source.js';
import {outreachProject} from './outreach-export.js';
import {defaultSectors,normalizeSectors} from './sectors.js';
import {buildPickerDraft,pickerOptions,fitLabel,missingFields,PICKER_LABELS} from './project-picker-drafts.js';

export const pickerProjects=listedProjects.map(outreachProject);
/** Additive adapter: the disabled branch leaves every baseline prototype untouched. */
export function installProjectPicker({OpportunityPlatformApp:App,PlatformNavigation:Navigation,enabled=OUTREACH_PROJECT_PICKER,projects=pickerProjects}){
 if(!enabled)return;
 const scope=app=>app.path==='/investors-jv'&&app.detailTab==='outreach';
 const source=app=>{const row=app.rows.find(row=>row.id===app.detailRecordId);return row?.source||row||{};};
 const sectors=app=>{const saved=app.windWorkflow(app.detailRecordId);return Object.hasOwn(saved,'sectors')?normalizeSectors(saved.sectors):defaultSectors({source:source(app)});};
 const selected=app=>new Set([...app.root.querySelectorAll('[data-outreach-project]:checked')].map(input=>input.dataset.outreachProject));
 const recipient=app=>{const inputs=[...app.root.querySelectorAll('[data-pulse-recipient]:checked')];if(inputs.length!==1)return {recipient:'',recipientEmail:'',audience:app.root.querySelector('#picker-audience')?.value||'auto'};const input=inputs[0],route=input.closest('tr')?.textContent||'',shared=/Published corporate rout|shared mailbox|generic company route/i.test(route);return {recipient:shared?'Company team':input.dataset.name||'',recipientEmail:input.dataset.pulseRecipient,...(OUTREACH_DRAFT_V2?{jobTitle:input.dataset.jobTitle||''}:{}),audience:app.root.querySelector('#picker-audience')?.value||'auto'};};
 const fingerprint=app=>JSON.stringify([app.path,app.detailRecordId,[...selected(app)].sort(),recipient(app),sectors(app),...(OUTREACH_DRAFT_V2?[app.pickerSubjectVariant||0]:[])]);
 const render=App.prototype.renderOutreachPanel;
 App.prototype.renderOutreachPanel=function(record){
  const markup=render.call(this,record);if(this.path!=='/investors-jv')return markup;
  const focus=sectors(this);
  const picker=`<section class="outreach-project-picker" data-project-picker><h3>Projects to include</h3><p class="muted">Names are internal references only. Drafts use banded fields, never project identities. Fit badges are guidance, not verified mandates.</p><p class="picker-selection-actions"><button type="button" class="quiet" data-picker-action="all">Select all</button> <button type="button" class="quiet" data-picker-action="clear">Clear</button></p><div class="picker-project-list">${projects.map(project=>`<label class="picker-project-row"><input type="checkbox" data-outreach-project="${this.escape(project.id)}" aria-label="Include ${this.escape(project.internalName)}"><span><strong>${this.escape(project.internalName)}</strong><small>${this.escape([project.technology||'Missing: technology',project.mwBand||'Missing: MW band',project.stage||'Missing: stage',project.regionBand||'Missing: region band'].join(' · '))}</small><span class="picker-fit-badge">${this.escape(fitLabel(record,project,focus))}</span></span></label>`).join('')}</div><p class="picker-project-status" data-picker-status role="status" aria-live="polite">0 of ${projects.length} projects included</p><div class="picker-suggestions" data-picker-suggestions></div></section>`;
  const subjects=OUTREACH_DRAFT_V2?'<section data-picker-subjects aria-label="Anonymous subject choices"></section>':'';
  return markup.replace('<label for="investor-pitch-option">',picker.replace('<div class="picker-suggestions"',subjects+'<div class="picker-suggestions"')+'<label for="picker-audience">Recipient approach</label><select id="picker-audience"><option value="auto">Automatic — use selected recipient</option><option value="direct">Named executive / decision-maker — ask directly</option><option value="shared">Shared mailbox — request the right contact</option></select><p class="muted">Named executives receive a direct invitation. Shared mailboxes receive a routing request. Suggestions update without replacing your current draft.</p><p><button type="button" class="quiet" data-picker-action="link">Link selected projects to current draft</button><br><small>For a manually edited draft: confirm that the selected projects are the ones actually described in your message.</small></p><label for="investor-pitch-option">');
 };
 App.prototype.refreshProjectPicker=function({restore=false}={}){
  if(!scope(this)||!this.root.querySelector('[data-project-picker]'))return;
  if(restore){const saved=this.navigation?.drafts.read(this.navigation.current).projectPicker,ids=new Set(Array.isArray(saved?.selectedIds)?saved.selectedIds:[]);this.root.querySelectorAll('[data-outreach-project]').forEach(input=>{input.checked=ids.has(input.dataset.outreachProject);});const audience=this.root.querySelector('#picker-audience');if(audience)audience.value=['auto','direct','shared'].includes(saved?.audience)?saved.audience:'auto';if(OUTREACH_DRAFT_V2)this.pickerSubjectVariant=saved?.subjectVariant===1?1:0;}
  const ids=selected(this),items=projects.filter(project=>ids.has(project.id)),missing=missingFields(items);
  const status=this.root.querySelector('[data-picker-status]');status.textContent=`${items.length} of ${projects.length} projects included${missing.length?` — Missing: ${missing.join(', ')}`:''}`;
  const variants=pickerOptions(source(this));
  const available=items.length?variants:OUTREACH_DRAFT_V2?['criteria']:variants.filter(variant=>variant==='criteria');
  const option=this.root.querySelector('#investor-pitch-option');
  if(option){const current=option.value,options=items.length?variants:available.length?available:PITCH_OPTIONS.map(option=>option.id);option.innerHTML=options.map(variant=>`<option value="${variant}">${this.escape(PICKER_LABELS[variant])}</option>`).join('');option.value=options.includes(current)?current:options[0];}
  this.pickerDrafts=new Map(available.map(variant=>[variant,buildPickerDraft(source(this),items,{variant,...recipient(this),sectors:sectors(this),...(OUTREACH_DRAFT_V2?{subjectVariant:this.pickerSubjectVariant||0}:{} )})]));
  if(OUTREACH_DRAFT_V2){this.pickerSubjects=subjectVariantsV2(items,{sectors:sectors(this)});const choices=this.root.querySelector('[data-picker-subjects]');if(choices)choices.innerHTML=`<h4>Subject choices · ${this.escape(OUTREACH_SUBJECT_ANONYMITY)}</h4>${this.pickerSubjects.map((subject,index)=>`<p>${this.escape(subject)} <button type="button" class="quiet" data-picker-action="subject" data-picker-subject="${index}" ${checkAnonymity(subject).safe?'':'disabled'}>Use this subject</button></p>`).join('')}`;}
  this.root.querySelector('[data-picker-suggestions]').innerHTML=available.length?[...this.pickerDrafts.values()].map(result=>`<article class="picker-draft-option"><h4>${this.escape(result.label)}</h4><pre>${this.escape(result.draft)}</pre><p><button type="button" class="quiet" data-picker-action="use" data-picker-variant="${result.variant}" ${!result.safe&&(OUTREACH_DRAFT_V2||!result.missing.length)?'disabled':''}>Use this draft</button></p><small>${result.words} words · ${this.escape(result.message)}</small></article>`).join(''):'<p class="muted">Select a project to see suggested drafts. Your existing Email draft is unchanged.</p>';
  if(this.pendingInvestorPitch?.pickerFingerprint&&this.pendingInvestorPitch.pickerFingerprint!==fingerprint(this))this.handleDetailAction('cancel-investor-pitch');
 };
 const restore=Navigation.prototype.restore;
 Navigation.prototype.restore=function(...args){const result=restore.apply(this,args);this.app?.refreshProjectPicker?.({restore:true});return result;};
 const bind=App.prototype.bind;
 App.prototype.bind=function(...args){
  const result=bind.apply(this,args),doc=this.root.ownerDocument;
  if(!doc.getElementById('outreach-project-picker-style')){const link=doc.createElement('link');link.id='outreach-project-picker-style';link.rel='stylesheet';link.href='/modules/investors-jv/project-picker.css';doc.head.append(link);}
  this.root.addEventListener('change',event=>{
   if(!scope(this))return;
   if(event.target.id==='investor-pitch-option'){this.handleDetailAction('generate-investor-pitch');return;}
   if(event.target.id==='picker-audience'||event.target.matches('[data-outreach-project]'))this.saveProjectPickerSelection();
   if(event.target.id==='picker-audience'||event.target.matches('[data-outreach-project],[data-pulse-recipient]'))this.refreshProjectPicker();
  });
  this.root.addEventListener('click',event=>{
   if(!scope(this))return;const button=event.target.closest('[data-picker-action]');if(!button)return;
   if(OUTREACH_DRAFT_V2&&button.dataset.pickerAction==='subject'){
    const index=Number(button.dataset.pickerSubject),subject=this.pickerSubjects?.[index],editor=this.root.querySelector('#outreach-draft'),nav=this.navigation;
    if(!subject||!editor||!nav)return;
    const nextDraft=/^Subject:[^\n]*/.test(editor.value)?editor.value.replace(/^Subject:[^\n]*/,`Subject: ${subject}`):`Subject: ${subject}\n\n${editor.value}`;
    if(!checkAnonymity(nextDraft).safe){nav.status('The current body contains restricted details. Use an updated suggested draft, or remove them before applying a subject.');return;}
    const before=nav.drafts.read(nav.current),offerContext=before.offerContext?.draft===editor.value?{...before.offerContext,draft:nextDraft}:before.offerContext;
    const next={...before,fields:{...before.fields,'outreach-draft':{value:nextDraft}},offerContext,pitchVersions:[...(before.pitchVersions||[]),{at:new Date().toISOString(),text:editor.value,offerContext:before.offerContext||null}],projectPicker:{...before.projectPicker,subjectVariant:index}};
    if(!nav.drafts.write(nav.current,next)){nav.drafts.cache.set(nav.drafts.key(nav.current),before);nav.status('Subject could not be saved. The draft was not changed.');return;}
    editor.value=nextDraft;this.pickerSubjectVariant=index;this.refreshProjectPicker();this.refreshOutreachSafety();return;
   }
   if(['all','clear'].includes(button.dataset.pickerAction)){this.root.querySelectorAll('[data-outreach-project]').forEach(input=>{input.checked=button.dataset.pickerAction==='all';});this.saveProjectPickerSelection();this.refreshProjectPicker();return;}
   if(button.dataset.pickerAction==='link'){
    const nav=this.navigation,draft=this.root.querySelector('#outreach-draft')?.value,projectIds=[...selected(this)];
    if(!nav||!draft||!projectIds.length){nav?.status('Select the projects actually described in the current draft first.');return;}
    const before=nav.drafts.read(nav.current);
    if(!nav.drafts.write(nav.current,{...before,offerContext:{projectIds,draft}})){nav.drafts.cache.set(nav.drafts.key(nav.current),before);nav.status('Project links could not be saved.');return;}
    nav.status('Selected projects linked to the current draft for offer tracking.');return;
   }
   if(button.dataset.pickerAction==='use'){
    const draft=this.pickerDrafts?.get(button.dataset.pickerVariant);if(!draft)return;
    const option=this.root.querySelector('#investor-pitch-option');if(option)option.value=draft.variant;
    const editor=this.root.querySelector('#outreach-draft');if(!editor||editor.value===draft.draft)return;
    this.pendingInvestorPitch={id:this.detailRecordId,path:this.path,before:editor.value,draft:draft.draft,pickerFingerprint:fingerprint(this),offerContext:{projectIds:[...selected(this)],draft:draft.draft}};
    this.handleDetailAction('confirm-investor-pitch');
   }
  });
  return result;
 };
 App.prototype.saveProjectPickerSelection=function(){
  const nav=this.navigation;if(!nav)return;
  const before=nav.drafts.read(nav.current),next={...before,projectPicker:{selectedIds:[...selected(this)],audience:this.root.querySelector('#picker-audience')?.value||'auto',...(OUTREACH_DRAFT_V2?{subjectVariant:this.pickerSubjectVariant||0}:{})}};
  if(!nav.drafts.write(nav.current,next)){nav.drafts.cache.set(nav.drafts.key(nav.current),before);nav.status('Project selection could not be saved. Existing drafts and previous versions were retained.');}
 };
 App.prototype.projectOfferContext=function(){
  if(!scope(this))return null;
  const context=this.navigation?.drafts.read(this.navigation.current).offerContext;
  if(!context){if(selected(this).size)throw Error('Link the selected projects to the current draft before sending, or use one of the suggested project drafts.');return null;}
  if(context.draft!==this.root.querySelector('#outreach-draft')?.value)throw Error('The draft was edited after its projects were linked. Select the projects actually described, then click “Link selected projects to current draft” before sending.');
  return {projectIds:[...context.projectIds]};
 };
 const action=App.prototype.handleDetailAction;
 App.prototype.handleDetailAction=function(name){
  if(scope(this)&&name==='generate-investor-pitch'){
   const variant=this.root.querySelector('#investor-pitch-option')?.value||'intro';
   const draft=this.pickerDrafts?.get(variant);
   if(selected(this).size&&!draft){this.navigation?.status('This message option is not supported by the recorded intent. Choose one of the suggested drafts.');return;}
   if(draft){
    const editor=this.root.querySelector('#outreach-draft');if(!editor||editor.value===draft.draft)return;
    this.pendingInvestorPitch={id:this.detailRecordId,path:this.path,before:editor.value,draft:draft.draft,pickerFingerprint:fingerprint(this),offerContext:{projectIds:[...selected(this)],draft:draft.draft}};
    return this.handleDetailAction('confirm-investor-pitch');
   }
  }
  if(scope(this)&&name==='confirm-investor-pitch'&&this.pendingInvestorPitch?.pickerFingerprint&&this.pendingInvestorPitch.pickerFingerprint!==fingerprint(this)){this.handleDetailAction('cancel-investor-pitch');this.navigation?.status('Selection changed. Review the suggested draft again.');return;}
  const result=action.call(this,name);
  if(scope(this)&&['generate-investor-pitch','restore-investor-pitch'].includes(name)&&this.pendingInvestorPitch)return this.handleDetailAction('confirm-investor-pitch');
  return result;
 };
}
