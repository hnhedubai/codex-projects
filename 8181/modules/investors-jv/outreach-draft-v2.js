import {MW_BANDS,TECHNOLOGIES,STAGES,REGION_BANDS} from './project-picker-rules.js';
import {OUTREACH_SUBJECT_ANONYMITY} from './outreach-settings.js';

export const CONFIDENTIALITY="Project identity, ownership and documents are shared only under an NDA and with the owner's permission.";
export const EASY_REPLY='A one-line reply, interested or not, is enough.';
const LEVELS=['balanced','strict'];
const genericName=/\b(team|desk|office|department|inbox|route|relations|shared|company|corporate)\b|@|https?:/i;
const sharedEmail=/^(?:info|contact|office|enquiries|inquiries|ir|investorrelations|investor\.relations|support|team|sales|admin|hello|enquiry|press|media|communications|reception)(?:[._-][^@]+)?@/i;
const hash=value=>{let result=2166136261;for(const char of String(value).toLowerCase())result=Math.imul(result^char.charCodeAt(0),16777619);return result>>>0;};
export function seniority(person={}){
 const name=String(person.name||'').trim();
 if(person.shared===true||!name||!/[\p{L}]/u.test(name)||/^(?:unknown|n\/?a|not (?:found|recorded|available)|unnamed contact|Dr\.?|Prof\.?)$/i.test(name)||genericName.test(name)||sharedEmail.test(person.email||''))return 'shared';
 const job=String(person.jobTitle||'');
 if(/\b(?:chief|CEO|COO|CFO|CIO|CTO|chair|chairman|chairwoman|managing director|founder|owner|general partner|board member)\b/i.test(job))return 'c-level';
 if(/\b(?:vice[ -]?president|vp)\b/i.test(job))return 'director';
 if(/\bpresident\b/i.test(job))return 'c-level';
 if(/\b(?:director|head of|general manager|partner)\b/i.test(job))return 'director';
 return 'other';
}
export function greetingV2(person={}){
 const level=seniority(person),choice=hash(person.email||person.name)%2;
 if(level==='shared')return choice?'Hello team,':'Hello,';
 const stored=String(person.name).trim(),parts=stored.split(/\s+/),prefix=/^(?:Dr|Prof|Mr|Ms|Mrs)\.?$/i.test(parts[0])?parts.shift():'';
 const full=parts.join(' '),first=String(person.firstName||parts[0]||''),surname=String(person.surname||parts.at(-1)||'');
 const title=String(person.title||prefix||'').trim();
 if(level==='c-level')return choice&&/^(?:Dr|Prof)\.?$/i.test(title)?`Dear ${title} ${surname},`:`Dear ${full},`;
 return `${level==='director'?(choice?'Hello':'Dear'):(choice?'Hi':'Hello')} ${first},`;
}
export function ctaV2(person={},technology='renewable'){
 const level=seniority(person),tech=['solar','wind'].includes(technology)?technology:'renewable';
 if(level==='c-level')return 'Would a 20-minute call next week be possible? If helpful, I can send a one-page anonymous summary beforehand.';
 if(level==='shared')return `Could you please forward this to the person responsible for ${tech} acquisitions?`;
 return `Could we arrange a 20-minute call in the next two weeks? If you are not the right person, I would be grateful if you could pass this to the colleague who covers ${tech} acquisitions.`;
}
export function coarseSelection(projects=[],sectors=[]){
 const missing=[...new Set(projects.flatMap(project=>[['technology',TECHNOLOGIES],['mwBand',MW_BANDS],['stage',STAGES],['regionBand',REGION_BANDS]].filter(([field,values])=>!values.includes(project[field])).map(([field])=>field)))];
 const technologies=[...new Set(projects.map(project=>project.technology).filter(value=>TECHNOLOGIES.includes(value)))].sort();
 const solar=projects.length?technologies.includes('Solar PV'):sectors.includes('Solar PV'),wind=projects.length?technologies.includes('Onshore wind'):sectors.includes('Wind');
 const technology=solar&&wind?'renewable':solar?'solar':wind?'wind':'renewable';
 const label=technology==='solar'?'Solar':technology==='wind'?'Wind':solar&&wind?'Wind and solar':'Renewable';
 const tier=items=>{const tiers=new Set(items.map(item=>MW_BANDS.indexOf(item.mwBand)>=3?'large-scale':'mid-size'));return tiers.size===1?[...tiers][0]:'mixed-scale';};
 const stage=items=>{const stages=new Set(items.map(item=>item.stage));return stages.size!==1?'mixed development stages':stages.has('Ready-to-build')?'ready-to-build':stages.has('Pre-construction')?'advanced development':'development';};
 const regions=new Set(projects.map(item=>item.regionBand));
 return {technology,label,missing,technologies,one:projects.length===1,tier:tier(projects),stage:stage(projects),region:regions.size===1&&regions.has('Southern Europe')?'Southern Europe':'',tierFor:tier,stageFor:stage};
}
export function subjectVariantsV2(projects=[],{sectors=[],anonymity=OUTREACH_SUBJECT_ANONYMITY}={}){
 if(!LEVELS.includes(anonymity))throw Error('Unknown outreach anonymity level.');
 const context=coarseSelection(projects,sectors),{label,one}=context;
 if(!projects.length)return [`Quick check on your ${context.technology} investment criteria`,`${label} investment — open to a discussion?`];
 const noun=`${label} ${one?'project':'projects'}`;
 if(anonymity==='strict')return [`${noun} — investment opportunity`,`${noun} — fit with your current priorities?`];
 const tier=context.tier==='mixed-scale'?'Mixed-scale':context.tier==='large-scale'?'Large-scale':'Mid-size';
 const compactStage=context.stage==='mixed development stages'?'mixed stages':context.stage;
 const fact=`${tier} ${label.toLowerCase()} ${one?'project':'projects'} · ${compactStage}${context.region?' · '+context.region:''}`;
 const question=`${tier} ${label.toLowerCase()} ${one?'project':'projects'} · ${compactStage}${context.region?' · '+context.region:''} — a fit?`;
 return [fact,question];
}
export function buildDraftV2(projects=[],{variant='intro',person={},sectors=[],anonymity=OUTREACH_SUBJECT_ANONYMITY,subjectVariant=0}={}){
 if(!LEVELS.includes(anonymity))throw Error('Unknown outreach anonymity level.');
 const context=coarseSelection(projects,sectors),subjects=subjectVariantsV2(projects,{sectors,anonymity}),subject=subjects[subjectVariant===1?1:0];
 const offer=context.technology==='solar'?'solar PV':context.technology==='wind'?'onshore wind':'renewable-energy';
 const opening=`I am an independent introducer working with project owners on ${projects.length?(context.one?'a '+offer+' opportunity':'selected '+offer+' opportunities'):offer+' opportunities'}.`;
 // Group descriptions by technology, not identity or exact number. Mixed attributes
 // describe the selection, never an invented capacity or stage for a specific project.
 const lines=context.technologies.map(tech=>{const items=projects.filter(item=>item.technology===tech);const label=tech==='Solar PV'?'Solar PV':'Onshore wind';return `- ${label} ${context.one?'project':'projects'}${anonymity==='strict'?'.':`: ${context.tierFor(items)}; ${context.stageFor(items)}${context.region?'; '+context.region:''}.`}`;}).join('\n');
 const fit=variant==='jv'?`I wanted to ask whether ${context.one?'this fits':'any of them fit'} your current co-development priorities.`:variant==='investment'?`I wanted to ask whether ${context.one?'this fits':'any of them fit'} your current project investment criteria.`:`I wanted to ask whether ${projects.length?(context.one?'this fits':'any of them fit'):'third-party projects fit'} your current development and investment criteria.`;
 const draft=`Subject: ${subject}\n\n${greetingV2(person)}\n\n${opening}\n\n${lines?lines+'\n\n':''}${context.missing.length?'[Missing: '+context.missing.join(', ')+']\n\n':''}${fit}\n\n${CONFIDENTIALITY}\n\n${ctaV2(person,context.technology)}\n${EASY_REPLY}\n\nKind regards,`;
 return {draft,subjects,subject,missing:context.missing,technology:context.technology,anonymity,version:2};
}
export function isV2Body(body){return String(body).includes(CONFIDENTIALITY)&&String(body).includes(EASY_REPLY)&&/^I am an independent introducer working with project owners on /m.test(body);}
export function personaliseDraftV2(body,person={}){
 if(!isV2Body(body))return body;
 const wind=/^- Onshore wind |\bonshore wind opportunit/m.test(body),solar=/^- Solar PV |\bsolar PV opportunit/m.test(body),technology=wind&&solar?'renewable':solar?'solar':wind?'wind':'renewable';
 const start=body.indexOf(CONFIDENTIALITY)+CONFIDENTIALITY.length,end=body.indexOf(EASY_REPLY,start);
 if(end<start)return body;
 return (body.slice(0,start)+'\n\n'+ctaV2(person,technology)+'\n'+body.slice(end)).replace(/^(?:Hello[^\n]*|Hi[^\n]*|Dear[^\n]*),/m,greetingV2(person));
}
