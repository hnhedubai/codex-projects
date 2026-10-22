import {createHash} from 'node:crypto';
import {formatBody,personalise,placeholderPattern} from '../../shared/js/pulse-format.js';
import {PULSE_MAX_RECIPIENTS} from '../../shared/js/pulse-modules.js';

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
   const prior=byEmail.get(email);
   if(!prior||FIELDS.indexOf(field)<FIELDS.indexOf(prior.field))byEmail.set(email,recipient);
  }
  const recipients=[...byEmail.values()];
  if(recipients.length>PULSE_MAX_RECIPIENTS)throw new SendError(`Send to up to ${PULSE_MAX_RECIPIENTS} recipients at a time.`);
  if(mode==='together'&&!recipients.some(item=>item.field==='to'))throw new SendError('One email needs at least one To recipient.');
  return new SendRequest({module:module.key,recordId,recordName:text(input.recordName,300),mode,subject,body,recipients});
 }
 constructor(values){Object.assign(this,values);Object.freeze(this);}
 #key(parts){return `oplatform:${this.module}:`+createHash('sha256').update(parts.join('|')).digest('hex');}
 /** One call per person (separate, personal greeting) or one call with To/CC/BCC (together). */
 calls(){
  if(this.mode==='separate')return this.recipients.map(item=>{
   const personal=personalise(this.body,item.name);const {html,text:plain}=formatBody(personal);
   return {emails:[item.email],payload:{to:item.email,subject:this.subject,body_html:html,body_text:plain,idempotency_key:this.#key([this.recordId,'separate',item.email,this.subject,personal])}};
  });
  const tos=this.recipients.filter(item=>item.field==='to').map(item=>item.email);
  const cc=[...tos.slice(1),...this.recipients.filter(item=>item.field==='cc').map(item=>item.email)];
  const bcc=this.recipients.filter(item=>item.field==='bcc').map(item=>item.email);
  const {html,text:plain}=formatBody(this.body);
  const signature=this.recipients.map(item=>`${item.field}:${item.email}`).sort();
  return [{emails:this.recipients.map(item=>item.email),payload:{to:tos[0],...(cc.length?{cc:cc.join(', ')}:{}),...(bcc.length?{bcc:bcc.join(', ')}:{}),subject:this.subject,body_html:html,body_text:plain,idempotency_key:this.#key([this.recordId,'together',...signature,this.subject,this.body])}}];
 }
}
