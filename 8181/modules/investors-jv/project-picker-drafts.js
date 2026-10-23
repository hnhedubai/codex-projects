import {defaultSectors} from './sectors.js';
import {checkAnonymity} from './outreach-policy.js';
import {MW_BANDS,TECHNOLOGIES,STAGES,REGION_BANDS,pickerGreeting,recipientCta} from './project-picker-rules.js';
import {OUTREACH_DRAFT_V2} from './outreach-settings.js';
import {buildDraftV2} from './outreach-draft-v2.js';

const norm=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const south=['albania','kosovo','north macedonia','croatia','serbia','bulgaria','greece','italy','spain','portugal','bosnia','bosnia and herzegovina','montenegro','slovenia','romania','turkey','southern europe','southeastern europe','south-eastern europe','western balkans','balkans'];
const europe=['germany','poland','denmark','ireland','france','netherlands','belgium','sweden','finland','norway','united kingdom','uk','austria','switzerland','czechia','czech republic','baltics'];
export function fitLabel(partner,project,sectors=defaultSectors({source:partner})){
 const technology=project.technology==='Onshore wind'?'Wind':project.technology==='Solar PV'?'Solar PV':'';
 const tech=!!technology&&sectors.includes(technology),country=norm(partner.country),tokens=country.split(/\s*[/;,]\s*/);
 const regions=new Set(tokens.flatMap(token=>south.includes(token)?['Southern Europe']:europe.includes(token)?['Europe']:[]));
 const broad=/\b(global|worldwide)\b/.test(country)||tokens.includes('europe')&&/Europe$/.test(project.regionBand);
 const region=broad||regions.has(project.regionBand);
 return tech&&region?'Fits stated focus':!tech&&!region?'Check fit: technology and region':!tech?'Check fit: technology':'Check fit: region';
}
export function pickerOptions(partner){
 const status=String(partner.status||partner.statusText||''),type=String(partner.partnerType||''),intent=String(partner.intent||'');
 const buying=/\bbuyer\b|acquisition|asset investor/i.test(type)||/\bbuying\b|invitation to acquire|offers.{0,30}acquisitions/i.test(intent);
 if(/\bopen\b.*(?:JV|joint venture|investment)/i.test(status)||partner.intent==='jv')return ['jv','intro',...(buying?['investment']:[])];
 if(partner.intent==='acquire'||buying)return ['investment','intro'];
 return ['intro','criteria'];
}
export const PICKER_LABELS=Object.freeze({jv:'Co-development / JV',intro:'Brief introduction',investment:'Investment / acquisition',criteria:'Criteria check'});
const allowed=(value,list,field)=>list.includes(value)?value:`[Missing: ${field}]`;
export function publicProject(project){
 return {technology:allowed(project.technology,TECHNOLOGIES,'technology'),mwBand:allowed(project.mwBand,MW_BANDS,'MW band'),stage:allowed(project.stage,STAGES,'stage'),regionBand:allowed(project.regionBand,REGION_BANDS,'region band'),strength:['Grid application submitted','Permit granted'].includes(project.strength)?project.strength:''};
}
export function missingFields(projects){return [...new Set(projects.flatMap(project=>Object.values(publicProject(project)).flatMap(value=>value.match(/^\[Missing: (.+)\]$/)?.[1]||[])))];}
export const wordCount=text=>String(text).trim().split(/\s+/).filter(Boolean).length;
const counts=['zero','one','two','three','four','five','six'];
/** Merge only identical public profiles, including evidence strength. Internal offer IDs stay separate. */
export function projectSummaryLines(items){
 const groups=new Map();for(const item of items){const key=JSON.stringify(item);const group=groups.get(key);if(group)group.count++;else groups.set(key,{item,count:1});}
 return [...groups.values()].map(({item,count})=>`${items.length>1?'- ':''}${item.technology}, ${item.mwBand}${count>1?' each':''}, ${item.stage}, ${item.regionBand}${count>1?` (${counts[count]||'multiple'} projects)`:''}.${item.strength?` ${item.strength}.`:''}`).join('\n');
}
/** Banded allowlist only. Raw company text is used for option selection, never interpolation. */
export function buildPickerDraft(partner,projects,options={}){
 if(!OUTREACH_DRAFT_V2)return buildLegacyPickerDraft(partner,projects,options);
 const {variant='intro',recipient='',recipientEmail='',jobTitle='',title='',audience='auto',sectors=defaultSectors({source:partner}),anonymity,subjectVariant}=options;
 if(!Object.hasOwn(PICKER_LABELS,variant))throw Error('Unknown draft option.');
 const value=buildDraftV2(projects,{variant,person:{name:recipient,email:recipientEmail,jobTitle,title,shared:audience==='shared'},sectors,anonymity,subjectVariant});
 const words=wordCount(value.draft),safety=checkAnonymity(value.draft);
 return {...value,variant,label:PICKER_LABELS[variant],words,safe:safety.safe&&words<150&&!value.missing.length,message:value.missing.length?'Required project fields are missing.':words>=150?'Draft is too long; shorten the selection.':safety.message};
}
export function buildLegacyPickerDraft(partner,projects,{variant='intro',recipient='',recipientEmail='',audience='auto',sectors=defaultSectors({source:partner})}={}){
 if(!Object.hasOwn(PICKER_LABELS,variant))throw Error('Unknown draft option.');
 if(variant!=='criteria'&&!projects.length)throw Error('Select at least one project.');
 const items=projects.map(publicProject),one=items.length===1,first=items[0];
 const unique=field=>[...new Set(items.map(item=>item[field]))].join('/');
 const technologies=unique('technology'),regions=unique('regionBand'),stages=unique('stage');
 const focus=sectors.filter(value=>['Wind','Solar PV','e-SAF','Hybrid','BESS','Hydrogen','Ammonia'].includes(value)).join('/')||'renewable-energy';
 let subject,opening,lines='',question;
 if(variant==='criteria'){
  subject=`Quick check on your ${focus} investment criteria`;
  opening='I am an independent introducer working with project owners on renewable-energy opportunities.';
  question='Are you currently considering third-party projects, and what are your development and investment criteria?';
 }else{
  const multi=`${items.length} ${technologies} opportunities, ${regions}`;
  subject=variant==='jv'?(one?`Partner for a ${first.stage} ${first.technology} project, ${first.regionBand}`:`Partners for ${items.length} ${technologies} projects, ${regions}`):(one?`${first.technology} opportunity, ${first.regionBand}, ${first.mwBand}`:multi);
  const description=one?`a ${first.stage.toLowerCase()} ${first.technology.replace('Onshore','onshore').replace('Solar','solar')} opportunity in ${first.regionBand}`:`${counts[items.length]||'selected'} ${technologies} opportunities in ${regions}, at ${stages.toLowerCase()} stage`;
  opening=`I am an independent introducer working with project owners on ${description}.`;
  lines=projectSummaryLines(items);
  question=variant==='investment'?'Would you consider project-level equity investment or acquisition at this stage?':variant==='jv'?'Would a JV or co-development discussion fit your current development priorities?':'Would these opportunities fit your current development and investment criteria?';
 }
 const cta=recipientCta(recipient,recipientEmail,audience);
 const compose=()=>`Subject: ${subject}\n\n${pickerGreeting(audience==='shared'?'':recipient,recipientEmail)}\n\n${opening}\n\n${lines?lines+'\n\n':''}${question}\n\n${cta}\n\nProject identity, ownership and documents are shared only under an NDA and with the owner's permission.\n\nKind regards,`;
 let draft=compose();
 // Optional strengths yield to the word limit; never cut a required field or blend projects.
 if(variant!=='criteria')for(let index=items.length-1;index>=0&&wordCount(draft)>=150;index--){if(items[index].strength){items[index].strength='';lines=projectSummaryLines(items);draft=compose();}}
 const missing=variant==='criteria'?[]:missingFields(projects),words=wordCount(draft),safety=checkAnonymity(draft,undefined,undefined,false);
 return {variant,label:PICKER_LABELS[variant],draft,words,missing,safe:safety.safe&&words<150,message:words>=150?'Draft is too long; select fewer projects.':safety.message};
}
