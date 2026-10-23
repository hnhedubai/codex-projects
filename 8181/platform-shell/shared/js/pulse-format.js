// Pulse email body formatting for 8181, shared by the server and the browser.
// Same rules as the Wind Projects desk (apps/wind-projects/dist/format.mjs), kept as an independent copy.
const SALUTATION_RE=/^(Dear\s+|Hi,?\s*|Hello\s+)/i;
const CLOSING_RE=/^(Best regards|Kind regards|Yours sincerely|Warm regards|Regards|Sincerely)/i;
const NEW_PARAGRAPH_RE=/^(Given |I |We |Your |It |There |Our |This |Might |Would |I should |I would |I believe )/i;
const TERMINAL_PUNCTUATION_RE=/[.?!—]['"”’)]?\s*$/;
const BULLET_RE=/^[-•]\s+/;
export const PARAGRAPH_STYLE='margin:0 0 12px 0;line-height:1.55';
export const placeholderPattern=/\[[^\]\n]{1,80}\]/;
export const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Draft text → blocks: paragraphs (Pulse rules) and bullet lists (lines starting "- "). */
export function draftBlocks(text){
 const blocks=[];let buffer=[],list=null;
 const flush=()=>{if(buffer.length){blocks.push({type:'p',text:buffer.join(' ').replace(/\s+/g,' ').trim()});buffer=[];}};
 const closeList=()=>{if(list){blocks.push(list);list=null;}};
 for(const line of String(text||'').replace(/\r\n/g,'\n').split('\n')){
  const trimmed=line.trim();
  if(!trimmed){flush();closeList();continue;}
  if(BULLET_RE.test(trimmed)){flush();(list??={type:'ul',items:[]}).items.push(trimmed.replace(BULLET_RE,''));continue;}
  closeList();
  if(SALUTATION_RE.test(trimmed)||CLOSING_RE.test(trimmed)){flush();blocks.push({type:'p',text:trimmed});continue;}
  const prior=buffer[buffer.length-1];
  if(buffer.length&&NEW_PARAGRAPH_RE.test(trimmed)&&prior!==undefined&&TERMINAL_PUNCTUATION_RE.test(prior))flush();
  buffer.push(trimmed);
 }
 flush();closeList();
 return blocks;
}

/** Escape, then link only http(s) URLs. */
function inline(text){
 return escapeHtml(text).replace(/\bhttps?:\/\/[^\s<]+/gi,match=>{
  const trail=match.match(/[.,;:!?)\]]+$/)?.[0]||'';const url=trail?match.slice(0,-trail.length):match;
  return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${trail}`;
 });
}

export function formatBody(text){
 const blocks=draftBlocks(text);
 const html=blocks.map(b=>b.type==='ul'?`<ul style="margin:0 0 12px 0;padding-left:22px;line-height:1.55">${b.items.map(i=>`<li>${inline(i)}</li>`).join('')}</ul>`:`<p style="${PARAGRAPH_STYLE}">${inline(b.text)}</p>`).join('');
 const plain=blocks.map(b=>b.type==='ul'?b.items.map(i=>`- ${i}`).join('\n'):b.text).join('\n\n');
 return {html,text:plain};
}

/** "Subject: …" on the first non-empty line, the rest is the body. */
export function parseDraft(text){
 const lines=String(text||'').replace(/\r\n/g,'\n').split('\n');
 const first=lines.findIndex(l=>l.trim());
 const match=first>=0?lines[first].match(/^\s*Subject:\s*(.*)$/i):null;
 if(!match)return {subject:'',body:String(text||'').trim()};
 return {subject:match[1].trim(),body:lines.slice(first+1).join('\n').trim()};
}

/** "Dr. Christoph Kapp" → "Dr. Kapp"; "Jeff Amoah" → "Jeff". */
export function greetingName(name){
 const parts=String(name||'').replace(/\([^)]*\)/g,' ').trim().split(/\s+/).filter(Boolean);
 if(!parts.length)return '';
 const shared=/\b(team|desk|inbox|route|department|group|office|relations|investor access)\b/i.test(parts.join(' '));
 if(shared){
  const label=parts.filter(part=>!/^\b(team|desk|inbox|route|department|group|office|relations|investor|access)\b$/i.test(part));
  return `${label.join(' ')||parts[0]} Investor Team`;
 }
 const title=parts[0].match(/^(Dr|Mr|Mrs|Ms|Prof)\.?$/i);
 if(title&&parts.length>1){const t=title[1];return `${t[0].toUpperCase()}${t.slice(1).toLowerCase()}. ${parts[parts.length-1]}`;}
 return parts[0];
}

/** Replace the first "Dear …," line with the recipient's name; add one if the draft has none. */
export function personalise(body,name){
 const who=greetingName(name);if(!who)return body;
 const re=/^([ \t]*)Dear\b[^\n,]*,/im;
 return re.test(body)?body.replace(re,(_,indent)=>`${indent}Dear ${who},`):`Dear ${who},\n\n${body}`;
}
