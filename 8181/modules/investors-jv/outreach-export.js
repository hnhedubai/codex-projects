import {defaultSectors,normalizeSectors} from './sectors.js';

const text=value=>typeof value==='string'?value:'';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const privateText=/[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/|www\.|(?:\+\d[\d ()-]{7,}\d)/i;
const normalize=value=>text(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function contactCard(contact={},primaryText=''){
 const rawName=text(contact.fullName||contact.name),honorific=rawName.match(/^(Dr|Prof|Mr|Ms)\.?\s+/i);
 const title=honorific?{dr:'Dr',prof:'Prof',mr:'Mr',ms:'Ms'}[honorific[1].toLowerCase()]:/^(Dr|Prof|Mr|Ms)\.?$/i.test(text(contact.title))?text(contact.title).replace('.',''):'';
 const fullName=honorific?rawName.slice(honorific[0].length):rawName;
 const jobTitle=text(contact.jobTitle||contact.designation||(!/^(Dr|Prof|Mr|Ms)\.?$/i.test(text(contact.title))?contact.title:'')||contact.role);
 const named=normalize(fullName),basis=` ${normalize(primaryText)} `;
 const historical=/\bformer\b|historical|replaced|not a current/i.test([contact.roleStatus,contact.status,jobTitle].filter(Boolean).join(' '));
 const isPrimary=typeof contact.isPrimary==='boolean'?contact.isPrimary:!historical&&!!named&&basis.includes(` ${named} `);
 return {fullName,title,jobTitle,isPrimary};
}
export function readBrowserOutreachState(storage){
 const read=(key,fallback)=>{const raw=storage.getItem(key);return raw===null?fallback:JSON.parse(raw);};
 const favourites=read('oplatform:/investors-jv:starred',[]),workflow=read('oplatform:/investors-jv:detail-workflow',{});
 if(!Array.isArray(favourites)||favourites.some(id=>typeof id!=='string')||!object(workflow))throw Error('Saved investor state cannot be read safely. Export stopped.');
 const companies={};
 for(const [id,entry]of Object.entries(workflow)){
  if(!object(entry))throw Error('Saved company state cannot be read safely. Export stopped.');
  const state={};
  if(Object.hasOwn(entry,'sectors')){if(!Array.isArray(entry.sectors)||entry.sectors.some(value=>typeof value!=='string'))throw Error('Invalid saved sectors.');state.sectors=normalizeSectors(entry.sectors);}
  if(Object.hasOwn(entry,'contactsAdded')){if(!Array.isArray(entry.contactsAdded)||entry.contactsAdded.some(contact=>!object(contact)))throw Error('Invalid added contacts.');state.contacts=entry.contactsAdded.map(contact=>contactCard(contact));}
  if(Object.keys(state).length)companies[id]=state;
 }
 return {favourites,companies};
}
export function mwBand(value){
 if(typeof value!=='number'||!Number.isFinite(value)||value<=0)return '';
 return value<20?'under 20 MW':value<50?'20-50 MW':value<100?'50-100 MW':value<200?'100-200 MW':value<400?'200-400 MW':'400+ MW';
}
export function projectStage(value){
 const stage=text(value);
 if(/before.*RTB|pre.construction|final (?:stage|steps)/i.test(stage))return 'Pre-construction';
 if(/ready.to.build|ready for construction|^RTB\b/i.test(stage))return 'Ready-to-build';
 if(/develop/i.test(stage))return 'Development';return '';
}
function broadRegion(country){
 const regions={'Kosovo':'Southern Europe','Albania':'Southern Europe','North Macedonia':'Southern Europe','Croatia':'Southern Europe'};
 return regions[text(country)]||'';
}
function investorType(partner){
 const basis=text(partner.partnerType);
 const type=/\bfund\b/i.test(basis)?'fund':/\bdeveloper\b/i.test(basis)?'developer':/\bstrategic\b|\butility\b|\bIPP\b/i.test(basis)?'strategic':/\bJV\b|joint venture/i.test(basis)?'jv':'unknown';
 return {investorType:type,investorTypeBasis:type==='unknown'?'':`Derived from partnerType: ${basis}.`};
}
function intent(status){
 const label=text(status);
 if(/\bacquir(?:e|ing|es)|\bacquisition\b|\bbuying\b/i.test(label))return {intent:'acquire',intentBasis:`Derived from status: ${label}.`};
 if(/\bJV\b|joint venture/i.test(label))return {intent:'jv',intentBasis:`Derived from status: ${label}.`};
 return {intent:'unknown',intentBasis:''};
}
function verifiedStrength(project){
 const evidence=Array.isArray(project.evidence)?project.evidence:[];
 if(evidence.some(item=>item?.verified===true&&item.type==='grid-application'&&item.status==='submitted'))return 'Grid application submitted';
 if(evidence.some(item=>item?.verified===true&&item.type==='permit'&&item.status==='granted'))return 'Permit granted';
 return '';
}
export function validateBrowserState(state,partners){
 if(!object(state)||Object.keys(state).some(key=>!['favourites','companies'].includes(key))||!Array.isArray(state.favourites)||!object(state.companies))throw Error('Invalid export state.');
 if(state.favourites.some(id=>typeof id!=='string'))throw Error('Invalid favourites.');
 const known=new Set(partners.map(partner=>partner.id));
 for(const [id,company]of Object.entries(state.companies)){
  if(!known.has(id))continue;
  if(!object(company)||Object.keys(company).some(key=>!['sectors','contacts'].includes(key)))throw Error('Unsupported export state field.');
  if(company.sectors!==undefined&&(!Array.isArray(company.sectors)||company.sectors.some(sector=>typeof sector!=='string'||!normalizeSectors([sector]).length)))throw Error('Invalid sectors.');
  if(company.contacts!==undefined){
   if(!Array.isArray(company.contacts)||company.contacts.length>1000)throw Error('Invalid contact list.');
   for(const card of company.contacts)if(!object(card)||Object.keys(card).some(key=>!['fullName','title','jobTitle','isPrimary'].includes(key))||['fullName','title','jobTitle'].some(key=>typeof card[key]!=='string'||card[key].length>10000)||typeof card.isPrimary!=='boolean')throw Error('Invalid contact card.');
  }
 }
}
/** Explicit allowlists only: notes, routes, documents and credentials can never be serialized. */
export function outreachProject(project){return {id:text(project.id),internalName:text(project.name),technology:text(project.technology),mwBand:mwBand(project.capacityValue),stage:projectStage(project.stage),regionBand:broadRegion(project.country),strength:verifiedStrength(project),disclosureNote:text(project.disclosureNote||project.disclosureRestriction)};}
export function buildOutreachExport({partners,contacts,projects,state={favourites:[],companies:{}},now=new Date()}){
 validateBrowserState(state,partners);
 const favourites=new Set(state.favourites);
 const investors=partners.map(partner=>{
  const local=state.companies[partner.id]||{},statusText=text(partner.status);
  const cards=[...(contacts[partner.id]||[]).map(contact=>contactCard(contact,partner.contact)),...(local.contacts||[]).map(contact=>contactCard(contact,partner.contact))];
  const seen=new Set(),deduplicated=[];
  for(const card of cards){const key=JSON.stringify([card.fullName,card.title,card.jobTitle]);if(seen.has(key)){const existing=deduplicated.find(item=>JSON.stringify([item.fullName,item.title,item.jobTitle])===key);existing.isPrimary||=card.isPrimary;continue;}seen.add(key);deduplicated.push(card);}
  deduplicated.sort((a,b)=>Number(b.isPrimary)-Number(a.isPrimary));
  return {id:text(partner.id),company:text(partner.company),country:text(partner.country),regions:text(partner.country).split(/\s*[/;,]\s*/).filter(Boolean),signal:statusText.split(/\s+[—–:]\s*|:\s*/)[0],statusText,whatTheyDo:text(partner.description||partner.summary||partner.industry),technologyFocus:Object.hasOwn(local,'sectors')?normalizeSectors(local.sectors):defaultSectors(partner),ticketOrMwCriteria:text(partner.scale),...investorType(partner),...intent(statusText),isFavourite:favourites.has(partner.id),contacts:deduplicated};
 });
 const result={exportedAt:now.toISOString(),investors,projects:projects.map(outreachProject)};
 const checks=checkOutreachExport(result,{partners,projects});
 if(checks.errors.length)throw Error(`Export stopped: ${checks.errors.join(' ')}`);
 return result;
}
export function checkOutreachExport(data,{partners,projects}){
 const errors=[],strings=[];
 const visit=value=>{if(typeof value==='string')strings.push(value);else if(Array.isArray(value))value.forEach(visit);else if(object(value))Object.values(value).forEach(visit);};visit(data);
 if(data.investors.length!==partners.length||data.projects.length!==projects.length)errors.push('Dataset counts do not match.');
 if(strings.some(value=>value.includes('…')||/\.\.\.\s*$/.test(value)))errors.push('A stored value contains an ellipsis; the source must be reviewed rather than truncated.');
 if(strings.some(value=>privateText.test(value)))errors.push('A permitted text field contains contact-routing information; review the source.');
 if(data.investors.some(item=>!item.id||!item.company))errors.push('A company or id is missing.');
 const forbidden=projects.flatMap(project=>[project.name,project.owner,project.country]).filter(Boolean).map(normalize);
 const banded=data.projects.map(({id,internalName,...anonymous})=>anonymous);
 for(const project of banded){
  for(const value of Object.values(project)){
   const normalized=` ${normalize(value)} `;
   if(forbidden.some(token=>normalized.includes(` ${token} `)))errors.push('A banded project field contains a protected identifier.');
  }
  if(!['','under 20 MW','20-50 MW','50-100 MW','100-200 MW','200-400 MW','400+ MW'].includes(project.mwBand))errors.push('Invalid capacity band.');
  if(!['','Development','Pre-construction','Ready-to-build'].includes(project.stage))errors.push('Invalid project stage.');
  if(Object.entries(project).some(([key,value])=>key!=='mwBand'&&/\d|https?:|www\./i.test(value)))errors.push('A banded project field contains a number or link.');
 }
 return {errors:[...new Set(errors)],counts:{investors:data.investors.length,projects:data.projects.length,country:data.investors.filter(item=>item.country).length,whatTheyDo:data.investors.filter(item=>item.whatTheyDo).length,ticketOrMwCriteria:data.investors.filter(item=>item.ticketOrMwCriteria).length,withContacts:data.investors.filter(item=>item.contacts.length).length},identityFieldsPresent:data.projects.some(item=>item.id||item.internalName)};
}
