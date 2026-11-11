import {readdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

/** CRM facts sent to Pulse with each email (2026-11-01): the record's company and the recipients' contact
    details, so Pulse fills its CRM and sends the follow-up in the person's working hours. */

const text=(value,max)=>typeof value==='string'&&value.trim()?value.trim().slice(0,max):null;
const lower=value=>String(value||'').trim().toLowerCase();
const ROLE_MAILBOX=/^(info|hello|contact|contacts|office|mail|enquiries|enquiry|inquiries|sales|support|admin|team|general|press|media|hr|careers|invest|investors|ir|bd|business|partnerships|hydrogen|energy|projects)$/i;

/** Every record (an object with an `id`) exported by modules/<key>/data/source.js. */
export class RecordIndex {
 #byId=null;
 constructor(root){this.root=root;}
 async #load(){
  const byId=new Map();
  const modulesDir=path.join(this.root,'modules');
  for(const key of await readdir(modulesDir).catch(()=>[])){
   const file=path.join(modulesDir,key,'data','source.js');
   let exported;
   try{exported=await import(pathToFileURL(file).href);}catch{continue;}
   for(const value of Object.values(exported)){
    if(!Array.isArray(value))continue;
    for(const item of value)if(item&&typeof item==='object'&&typeof item.id==='string'&&!byId.has(item.id))byId.set(item.id,item);
   }
  }
  return byId;
 }
 async get(recordId){this.#byId??=await this.#load();return this.#byId.get(recordId)||null;}
}

const compact=value=>lower(value).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');
/** Does a company name fit an email domain? "DP Energy Australia" ↔ dpenergy.com, "RETEC" ↔ bjretec.com. */
export function nameFitsDomain(name,domain){
 const label=compact(String(domain).split('.')[0]);const words=lower(name).normalize('NFD').replace(/[̀-ͯ]/g,'').split(/[^a-z0-9]+/).filter(word=>word.length>=3);
 const whole=compact(name);
 if(!label||!whole)return false;
 return label.includes(whole)||whole.includes(label)||words.some(word=>label.includes(word))||(words.length>1&&label.startsWith(words.map(word=>word[0]).join('')));
}
/** The company of everyone on this domain in the record: the shortest name that fits the domain. */
function companyForDomain(contacts,domain,companyIn,ownEmails,routeEmails){
 const names=contacts.filter(contact=>[...ownEmails(contact),...routeEmails(contact)].some(email=>email.endsWith(`@${domain}`))).map(companyIn).filter(Boolean);
 return names.filter(name=>nameFitsDomain(name,domain)).sort((a,b)=>a.length-b.length)[0]||null;
}

/** The Pulse `crm` block for one email, or undefined when the record isn't found. */
export function crmHintFor({module,recordId,record,recipients}){
 if(!record)return undefined;
 const contacts=Array.isArray(record.contacts)?record.contacts:[];
 // A company record (H2 Dev, Investors) names its company; a project record (Wind) doesn't: the account is
 // then the company the recipient works for, and the project's country is never used as theirs.
 const companyRecord=Boolean(text(record.company,200));
 // A contact's addresses: `email`, `emails[]`; corporate routes (info@ …) belong to the company, not the person.
 const ownEmails=contact=>[contact.email,...(Array.isArray(contact.emails)?contact.emails.map(item=>item?.email):[])].map(lower).filter(Boolean);
 const routeEmails=contact=>(Array.isArray(contact.corporateRoutes)?contact.corporateRoutes.map(item=>item?.email):[]).map(lower).filter(Boolean);
 const personFor=email=>contacts.find(contact=>ownEmails(contact).includes(email));
 const routeFor=email=>contacts.find(contact=>routeEmails(contact).includes(email));
 // "VP, Head of Business Development, RETEC" → RETEC.
 const companyIn=contact=>text(contact?.company,200)||(String(contact?.title||'').includes(', ')?text(String(contact.title).split(', ').pop(),200):null);
 const emails=recipients.map(person=>lower(person.email));
 const company=companyRecord?text(record.company,200):emails.map(email=>companyForDomain(contacts,email.split('@')[1]||'',companyIn,ownEmails,routeEmails)).find(Boolean)||null;
 if(!company)return undefined;
 const people=recipients.slice(0,20).map(person=>{
  const email=lower(person.email);
  const match=personFor(email)||(routeFor(email)?null:contacts.find(contact=>person.name&&lower(contact.name)===lower(person.name)));
  if(!match&&routeFor(email))return {email,name:null,title:null,linkedin:null};
  const name=text(person.name,160)||text(match?.name,160);
  // A shared mailbox (info@, hydrogen@ …) or a description instead of a name: link it to the company, no person.
  const shared=ROLE_MAILBOX.test(email.split('@')[0])||/shared|enquir|general contact/i.test(`${name||''} ${match?.title||''}`)||/—/.test(name||'')||(name&&lower(name).includes(lower(company)));
  return shared?{email,name:null,title:null,linkedin:null}:{email,name,title:text(match?.title,160),linkedin:text(match?.linkedin,300)};
 });
 return {
  module:text(module,40),
  recordId:text(recordId,120),
  company:{
   name:company,
   website:companyRecord?text(record.domainUrl,300)||text(record.website,300)||text(record.url,300):null,
   country:companyRecord?text(record.country,120):null,
   role:companyRecord?text(record.role,200):null,
   summary:companyRecord?text(record.summary,2000)||text(record.intent,2000):null,
   linkedin:text(record.linkedin,300)||text(record.companyLinkedin,300),
  },
  people,
 };
}
