import {createHash} from 'node:crypto';
import {formatBody,personalise,placeholderPattern} from '../../shared/js/pulse-format.js';
import {PULSE_MAX_RECIPIENTS} from '../../shared/js/pulse-modules.js';
import {OUTREACH_PROJECT_PICKER,OUTREACH_DRAFT_V2,OUTREACH_CATCHALL_CONSENT} from '../../../modules/investors-jv/outreach-settings.js';
import {isV2Body,personaliseDraftV2} from '../../../modules/investors-jv/outreach-draft-v2.js';
import {personalisePickerDraft} from '../../../modules/investors-jv/project-picker-rules.js';
import {listedProjects} from '../../../modules/listed-projects/data/source.js';
import {outreachProject} from '../../../modules/investors-jv/outreach-export.js';

export class SendError extends Error {
 constructor(message,status=422){super(message);this.status=status;}
}

const FIELDS=['to','cc','bcc'];
const ORIGINS=['published','added'];
const normalizeEmail=value=>String(value||'').trim().toLowerCase();
const isEmail=value=>typeof value==='string'&&value.length<=254&&/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value);
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';

/** One validated send: a record, a mode, a draft and up to 10 recipients. Builds the Pulse calls. */
export class SendRequest {
 static parse(input,module){
  if(!input||typeof input!=='object')throw new SendError('Invalid send request.',400);
  const recordId=text(input.recordId,200);
  if(!recordId)throw new SendError('Send request needs a record.');
  const mode=input.mode;
  if(!['separate','together'].includes(mode))throw new SendError('Choose one by one or one email (To / CC / BCC).');
  const subject=text(input.subject,1000),body=text(input.body,40000);
  if(!subject||subject.length>300)throw new SendError('The draft needs a subject line (Subject: …) of up to 300 characters.');
  if(!body||body.length>20000)throw new SendError('The draft needs a message body of up to 20,000 characters.');
  if(placeholderPattern.test(subject)||placeholderPattern.test(body))throw new SendError('The draft still has [placeholder] text. Pulse adds your signature.');
  module.assertChecks(input.checks);
  if(!Array.isArray(input.recipients)||!input.recipients.length)throw new SendError('Select at least one recipient.');
  if(input.recipients.length>PULSE_MAX_RECIPIENTS*3)throw new SendError(`Send to up to ${PULSE_MAX_RECIPIENTS} recipients at a time.`);
  const byEmail=new Map();
  for(const item of input.recipients){
   const email=normalizeEmail(item?.email);
   if(!isEmail(email))throw new SendError('A selected recipient has an invalid email address.');
   const field=mode==='separate'?'to':item.field;
   if(!FIELDS.includes(field))throw new SendError('Recipients must be To, CC or BCC.');
   const recipient={email,name:text(item.name,200),field,origin:ORIGINS.includes(item.origin)?item.origin:'added'};
   if(OUTREACH_DRAFT_V2&&module.key==='investors-jv'&&isV2Body(body)){recipient.jobTitle=text(item.jobTitle,200);recipient.shared=item.shared===true;}
   const prior=byEmail.get(email);
   if(!prior||FIELDS.indexOf(field)<FIELDS.indexOf(prior.field))byEmail.set(email,recipient);
  }
  const recipients=[...byEmail.values()];
  if(recipients.length>PULSE_MAX_RECIPIENTS)throw new SendError(`Send to up to ${PULSE_MAX_RECIPIENTS} recipients at a time.`);
  if(mode==='together'&&!recipients.some(item=>item.field==='to'))throw new SendError('One email needs at least one To recipient.');
  let catchAllOverride=[];
  if(input.catchAllOverride!==undefined){
   if(!OUTREACH_CATCHALL_CONSENT)throw new SendError('Catch-all consent sending is disabled in 8181.');
   if(!Array.isArray(input.catchAllOverride))throw new SendError('Catch-all confirmation is invalid.');
   catchAllOverride=[...new Set(input.catchAllOverride.map(normalizeEmail))];
   if(catchAllOverride.some(email=>!isEmail(email)||!recipients.some(person=>person.email===email)))throw new SendError('Catch-all confirmation must contain only selected recipients.');
  }
  let offerProjects=[];
  let disposableOverride=[];
  if(input.disposableOverride!==undefined){
   if(!Array.isArray(input.disposableOverride)||input.disposableOverride.length>100)throw new SendError('Disposable-mailbox confirmation is invalid.',400);
   disposableOverride=[...new Set(input.disposableOverride.map(normalizeEmail))];
   if(disposableOverride.some(email=>!isEmail(email)||!recipients.some(person=>person.email===email)))throw new SendError('Disposable-mailbox confirmation must contain only selected recipients.',400);
  }
  if(input.offer!==undefined){
   if(module.key!=='investors-jv'||!Array.isArray(input.offer?.projectIds)||input.offer.projectIds.length>listedProjects.length)throw new SendError('Invalid project offer tracking.');
   const ids=[...new Set(input.offer.projectIds)];
   offerProjects=ids.map(id=>{const project=listedProjects.find(project=>project.id===id);if(!project)throw new SendError('Unknown offered project. Reload the project list.');return outreachProject(project);});
  }
  return new SendRequest({module:module.key,recordId,recordName:text(input.recordName,300),mode,subject,body,recipients,offerProjects,catchAllOverride,disposableOverride});
 }
 constructor(values){Object.assign(this,values);Object.freeze(this);}
 #key(parts){const ids=(this.offerProjects||[]).map(project=>project.id).sort();const overrides=(this.catchAllOverride||[]).slice().sort();return `oplatform:${this.module}:`+createHash('sha256').update([...parts,...(ids.length?['offer-projects',...ids]:[]),...(overrides.length?['catch-all',...overrides]:[]),...(this.disposableOverride?.length?['disposable',...this.disposableOverride.slice().sort()]:[])].join('|')).digest('hex');}
 /** One call per person (separate, personal greeting) or one call with To/CC/BCC (together). */
 calls(){
  if(this.mode==='separate')return this.recipients.map(item=>{
   const personal=this.module==='investors-jv'&&OUTREACH_DRAFT_V2&&isV2Body(this.body)?personaliseDraftV2(this.body,item):this.module==='investors-jv'&&OUTREACH_PROJECT_PICKER&&/^Hello[^\n]*,/m.test(this.body)?personalisePickerDraft(this.body,item.name,item.email):personalise(this.body,item.name);const {html,text:plain}=formatBody(personal);
   return {emails:[item.email],payload:{to:item.email,subject:this.subject,body_html:html,body_text:plain,idempotency_key:this.#key([this.recordId,'separate',item.email,this.subject,personal]),...(this.disposableOverride?.includes(item.email)?{allowDisposable:[item.email]}:{}),...(this.catchAllOverride?.includes(item.email)?{allowCatchAll:[item.email]}:{})}};
  });
  const tos=this.recipients.filter(item=>item.field==='to').map(item=>item.email);
  const cc=[...tos.slice(1),...this.recipients.filter(item=>item.field==='cc').map(item=>item.email)];
  const bcc=this.recipients.filter(item=>item.field==='bcc').map(item=>item.email);
  const body=this.module==='investors-jv'&&OUTREACH_DRAFT_V2&&isV2Body(this.body)?personaliseDraftV2(this.body,this.recipients.length===1?this.recipients[0]:{shared:true}):this.body;
  const {html,text:plain}=formatBody(body);
  const signature=this.recipients.map(item=>`${item.field}:${item.email}`).sort();
  return [{emails:this.recipients.map(item=>item.email),payload:{to:tos[0],...(cc.length?{cc:cc.join(', ')}:{}),...(bcc.length?{bcc:bcc.join(', ')}:{}),subject:this.subject,body_html:html,body_text:plain,idempotency_key:this.#key([this.recordId,'together',...signature,this.subject,body]),...(this.disposableOverride?.length?{allowDisposable:[...this.disposableOverride]}:{}),...(this.catchAllOverride?.length?{allowCatchAll:[...this.catchAllOverride]}:{})}}];
 }
}
