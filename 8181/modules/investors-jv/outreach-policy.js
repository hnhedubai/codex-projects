import {listedProjects} from '../listed-projects/data/source.js';
import {OUTREACH_PROJECT_PICKER,OUTREACH_DRAFT_V2} from './outreach-settings.js';
import {maskBandedFigures,pickerGreeting,recipientCta} from './project-picker-rules.js';

export const PITCH_OPTIONS=Object.freeze([
 Object.freeze({id:'intro',label:'Brief Introduction'}),
 Object.freeze({id:'investment',label:'Investment / Acquisition'}),
 Object.freeze({id:'jv',label:'JV / Co-development'})
]);
const normal=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const aliases=['We Green Energo','WE ENERGO','Dielli','Sarande','Drin','Sushevo','TLF','Shtip','Cernik','Kosovo','Albania','Albanian','Macedonia','Macedonian','Croatia','Croatian','ENVISION','Nordex'];
export const ANONYMITY_WARNING='Identifying or restricted project details detected. Remove them before copying or sending.';
/** Conservative disclosure gate, not a guarantee against inference or arbitrary manual wording.
 * No draft text is logged. Recipient addresses are routing metadata, not message content.
 */
export function checkAnonymity(text,projects=listedProjects,allowBanded=OUTREACH_PROJECT_PICKER,coarse=OUTREACH_DRAFT_V2){
 const value=String(text||''),normalized=` ${normal(value)} `;
 const tokens=[...aliases,...projects.flatMap(project=>[project.name,project.id,project.owner,project.listingCompany,project.country,project.document?.filename])].filter(Boolean);
 const protectedName=tokens.some(token=>normalized.includes(` ${normal(token)} `));
 // Deliberately conservative, including salutations and signatures entered into the editor.
 const content=allowBanded?(coarse?value.replace(/\b20-minute\b/g,'short'):maskBandedFigures(value)):value;
 const restricted=/\d|https?:|www\.|[\w.+-]+@[\w.-]+|\b[a-z0-9-]+\.(?:com|org|net|eu|al|mk|hr|energy)\b|\.(?:pdf|docx?|xlsx?|pptx?)\b|\b(?:MWp?|MWh|kV|megawatts?|kilovolts?|EUR|USD|million|billion|percent|per cent)\b|[%€$£]/i.test(content);
 const pickerRestricted=allowBanded&&(/\[[^\]\n]+\]|\b(?:GrynH2|Dubai|DIFC)\b/i.test(value));
 const exactCount=coarse&&/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:(?:solar\s+PV|solar|onshore\s+wind|wind|renewable(?:-energy)?)\s+)?(?:projects?|opportunities|wind farms?|solar farms?)\b/i.test(value);
 const safe=!!value.trim()&&!protectedName&&!restricted&&!pickerRestricted&&!exactCount;
 return {safe,message:safe?'Known project-identifier check passed. Review wording and sender signature before sending.':ANONYMITY_WARNING};
}

/** Only controlled phrases enter drafts. Never interpolate source names, numbers or free text. */
export function recipientContext(record={}){
 const intent=String(record.intent||record.partnership||'');
 const focus=[record.subSector,record.partnerType,record.technology,intent].filter(Boolean).join(' ');
 if(/offshore|floating/i.test(focus)&&!/onshore/i.test(focus))return 'Your recorded focus includes offshore wind. Would your current development priorities also extend to onshore opportunities?';
 if(/equity.seek|capital.seek|seek.{0,35}(?:equity|funding|capital)|rais(?:e|ing).{0,25}capital/i.test(intent))return 'We understand that your recorded activity may involve raising capital for your own developments. Do you also review third-party development opportunities?';
 if(/acqui|purchas|buying/i.test(intent))return 'Would your current acquisition criteria allow a review of third-party renewable-energy opportunities? Geographic and stage fit would need to be confirmed.';
 if(/joint venture|co.develop|\bjv\b|partnership/i.test(intent))return 'Would your current partnership remit include third-party project collaboration? Please confirm your preferred geographies, development stages and participation model.';
 return 'Please confirm whether you are currently reviewing third-party renewable-energy investments or development partnerships, and your preferred geographies and project stages.';
}
export function buildAnonymousPitch(record={},variant='intro',projects=listedProjects,{recipient='',recipientEmail='',audience='auto'}={}){
 if(!PITCH_OPTIONS.some(item=>item.id===variant))throw Error('Choose a pitch option.');
 const wind=projects.some(project=>/onshore wind/i.test(project.technology));
 const solar=projects.some(project=>/solar|pv/i.test(project.technology));
 if(!wind&&!solar)throw Error('No supported Listed Projects are available for a pitch.');
 const windFocus=/wind/i.test([record.subSector,record.technology,record.intent].join(' '));
 const technology=wind&&(windFocus||!solar)?'onshore wind':wind?'onshore wind and solar PV':'solar PV';
 const subjects={intro:'Renewable-energy opportunities - confidential introduction',investment:'Renewable-energy investment and acquisition discussion',jv:'Renewable-energy joint venture and co-development discussion'};
 const proposals={
  intro:`We would welcome a preliminary discussion about selected ${technology} opportunities in our Listed Projects portfolio, initially on an anonymous basis.`,
  investment:`We would welcome a discussion about potential equity investment or acquisition involving selected ${technology} opportunities in our Listed Projects portfolio. Transaction availability, scope and authority to offer remain subject to confirmation.`,
  jv:`We would welcome a discussion about potential joint venture, co-development or strategic collaboration involving selected ${technology} opportunities in our Listed Projects portfolio. Responsibilities, funding commitments and any exclusivity would be agreed with the authorised parties.`
 };
 const draft=`Subject: ${subjects[variant]}\n\n${pickerGreeting(audience==='shared'?'':recipient,recipientEmail)}\n\n${proposals[variant]}\n\n${recipientContext(record)}\n\nThe portfolio includes development and pre-construction opportunities. Project readiness, permitting, grid access, offtake and bankability require supporting evidence and independent review; no confirmed mandate or financing approval is represented.\n\n${recipientCta(recipient,recipientEmail,audience)}\n\nProject identities, ownership details and identifying documents will be withheld until appropriate confidentiality arrangements, required owner permissions and an agreed disclosure scope are in place.\n\nKind regards,`;
 if(!checkAnonymity(draft,projects).safe)throw Error('The anonymous pitch could not pass the disclosure check.');
 return draft;
}
