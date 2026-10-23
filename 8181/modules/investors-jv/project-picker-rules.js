export const MW_BANDS=Object.freeze(['under 20 MW','20-50 MW','50-100 MW','100-200 MW','200-400 MW','400+ MW']);
export const TECHNOLOGIES=Object.freeze(['Onshore wind','Solar PV']);
export const STAGES=Object.freeze(['Development','Pre-construction','Ready-to-build']);
export const REGION_BANDS=Object.freeze(['Southern Europe','Europe','Eastern Africa','West Africa','South America','South-East Asia']);
/** Mask only explicitly permitted bands, project counts and the call duration.
 * Unrelated digits, exact capacities, grid voltages and commercial figures remain blocked.
 */
export function maskBandedFigures(value){
 return value.replace(/\b(?:under 20 MW|20-50 MW|50-100 MW|100-200 MW|200-400 MW|400\+ MW)\b/g,'capacity band')
  .replace(/\b20-minute\b/g,'short')
  .replace(/\b[1-6](?= (?:onshore wind|solar PV)(?:\/(?:onshore wind|solar PV))* (?:opportunities|projects)\b)/gi,'selected');
}
export function pickerGreeting(name='',email=''){
 const value=String(name).trim().replace(/\([^)]*\)/g,'').trim();
 if(!value||/\b(team|desk|department|office|inbox|route|relations|shared|company|corporate)\b|@|https?:/i.test(value)||/^(?:info|contact|office|enquiries|inquiries|ir|investorrelations|investor\.relations|support|team|sales)(?:[._-][^@]+)?@/i.test(email))return 'Hello,';
 const parts=value.split(/\s+/),title=parts[0]?.match(/^(Dr|Prof|Mr|Ms|Mrs)\.?$/i);
 if(title&&parts.length>1)return `Hello ${title[1]} ${parts.at(-1)},`;
 return `Hello ${parts[0]},`;
}
export function sharedRecipient(name='',email=''){return pickerGreeting(name,email)==='Hello,'&&!!(name||email)&&(!name||/\b(team|desk|department|office|inbox|route|relations|shared|company|corporate)\b/i.test(name)||/^(?:info|contact|office|enquiries|inquiries|ir|investorrelations|investor\.relations|support|team|sales)(?:[._-][^@]+)?@/i.test(email));}
export const DIRECT_CTA='Would you be open to a brief introductory call to assess the potential fit?';
export const SHARED_CTA='Could you direct this enquiry to the person responsible for project investment or development partnerships?';
export function recipientCta(name='',email='',audience='auto'){return (audience==='shared'||audience==='auto'&&sharedRecipient(name,email))?SHARED_CTA:DIRECT_CTA;}
export function personalisePickerDraft(body,name,email){
 const cta=recipientCta(name,email);
 return body.replace(/^Hello[^\n]*,/m,pickerGreeting(name,email)).replace(DIRECT_CTA,cta).replace(SHARED_CTA,cta);
}
