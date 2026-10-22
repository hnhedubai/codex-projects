/* DealGuard Phase 1. Deterministic extraction and subject mapping, not legal analysis. */
(function (root) {
  'use strict';
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const children = (n, name) => Array.from(n ? n.children : []).filter(x => x.namespaceURI === W && (!name || x.localName === name));
  const child = (n, name) => children(n, name)[0];
  const all = (n, name) => Array.from(n ? n.getElementsByTagNameNS(W, name) : []);
  const attr = (n, name) => n ? n.getAttributeNS(W, name) || '' : '';
  const val = n => attr(n, 'val');
  function xml(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid document XML. No comparison was saved.');
    return doc;
  }
  const cleanHeading = s => s.trim().replace(/^(?:section\s+)?(?:\d+(?:\.\d+)*[.)]?|[IVX]+[.)])\s+/i, '').trim().toLowerCase().replace(/[–—-]/g, ' ').replace(/\s+/g, ' ');
  // Explicit heading aliases; matches do not establish equivalence of obligations.
  const subjects = [
    ['definitions', /^(?:definitions?|definition of confidential information|confidential information)$/],
    ['obligations', /^(?:non disclosure obligations|obligations of (?:the )?receiving party|confidentiality obligations|representations and warranties|return or destruction of confidential information)$/],
    ['circumvention', /^(?:non circumvention|noncircumvention)$/],
    ['exclusions', /^(?:exclusions?(?: (?:of|from) confidential information)?|exceptions|exceptions to confidentiality|required disclosure)$/],
    ['term', /^(?:term(?: and termination)?|duration|termination|survival)$/],
    ['remedies', /^(?:remedies|limitations? of liability|liability)$/],
    ['notices', /^(?:notices|communications)$/],
    ['law', /^(?:governing law(?:,? jurisdiction and venue)?|governing law and dispute resolution|dispute resolution|jurisdiction)$/],
    ['general', /^(?:general(?: (?:terms|provisions))?|miscellaneous|entire agreement|severability|counterparts|assignment|waivers?|electronic signatures|no other obligation|no representations or warranties by discloser|no transfer (?:of|or) rights,? title or interest)$/],
    ['annexures', /^(?:annexures?(?: and commission schedules?)?|commission schedules?)$/]
  ];
  const headingTopics = text => subjects.filter(([, re]) => re.test(cleanHeading(text))).map(([id]) => id);
  function looksHeading(b, text) {
    const t = text.trim();
    if (!t || t.length > 140 || b.table) return false;
    const titleLike=/^[A-Z]/.test(t.replace(/^\d+[.)]\s*/,'')) && !/[.,;:]$/.test(t) && t.length<110;
    return headingTopics(t).length > 0 || /^(?:annexure|schedule|recitals|signatures|usage of ai[ -]tools)(?:\s|$)/i.test(t) ||
      (/heading|^AOHead/i.test(b.style || '') && titleLike) ||
      (b.outline !== null && b.outline < 9 && titleLike) ||
      (/^\d+(?:\.\d+)*[.)]\s+/.test(t) && t.length < 100 && !/[;:]$/.test(t));
  }
  function readRuns(node) {
    const runs = [];
    function walk(n, revision) {
      if (n.nodeType !== 1) return;
      const k = n.localName;
      if (['pPr','rPr','tblPr','trPr','tcPr','sectPr'].includes(k) || /PrChange$/.test(k)) return;
      let rev = revision;
      if (['ins','del','moveFrom','moveTo'].includes(k)) rev = {
        type: k === 'ins' || k === 'moveTo' ? 'inserted' : 'deleted',
        id: attr(n, 'id'), author: attr(n, 'author'), date: attr(n, 'date'), kind: k
      };
      if (k === 't' || k === 'delText') { runs.push({text:n.textContent, revision:rev || null}); return; }
      if (k === 'tab') { runs.push({text:'\t', revision:rev || null}); return; }
      if (k === 'br' || k === 'cr') { runs.push({text:'\n', revision:rev || null}); return; }
      Array.from(n.children).forEach(c => walk(c, rev));
    }
    let inherited=null;
    for(let parent=node.parentElement;parent;parent=parent.parentElement){
      if(['ins','del','moveFrom','moveTo'].includes(parent.localName)){
        inherited={type:['ins','moveTo'].includes(parent.localName)?'inserted':'deleted',id:attr(parent,'id'),author:attr(parent,'author'),date:attr(parent,'date'),kind:parent.localName};break;
      }
    }
    walk(node, inherited);
    return runs;
  }
  const viewText = (b, view) => b.runs.filter(r => !r.revision || r.revision.type !== (view === 'original' ? 'inserted' : 'deleted')).map(r => r.text).join('');
  function numberingResolver(numberDoc, stylesDoc) {
    const styles = new Map(all(stylesDoc, 'style').map(s => [attr(s, 'styleId'), s]));
    const nums = new Map(all(numberDoc, 'num').map(n => [attr(n,'numId'), n]));
    const abstracts = new Map(all(numberDoc, 'abstractNum').map(n => [attr(n,'abstractNumId'), n]));
    const counters = {original:{}, proposed:{}};
    function prop(p, name) {
      let pr = child(p,'pPr'), found = child(pr,name), style = val(child(pr,'pStyle')), seen = new Set();
      while (!found && style && !seen.has(style)) {
        seen.add(style); const s = styles.get(style);
        found = child(child(s,'pPr'),name); style = val(child(s,'basedOn'));
      }
      return found;
    }
    function format(n, type) {
      if (type === 'bullet') return '•';
      if (type === 'lowerLetter' || type === 'upperLetter') {
        let s=''; for (let k=n;k>0;k=Math.floor((k-1)/26)) s=String.fromCharCode(97+(k-1)%26)+s;
        return type === 'upperLetter' ? s.toUpperCase() : s;
      }
      if (type === 'lowerRoman' || type === 'upperRoman') {
        let s='', k=n; [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']].forEach(([v,t])=>{while(k>=v){s+=t;k-=v;}});
        return type === 'lowerRoman' ? s.toLowerCase() : s;
      }
      return String(n);
    }
    return {prop, number(p, view) {
      const np=prop(p,'numPr'), id=val(child(np,'numId')), level=Number(val(child(np,'ilvl')) || 0);
      if (!id || id === '0') return '';
      const num=nums.get(id), abs=abstracts.get(val(child(num,'abstractNumId')));
      const definition=l => {
        const override=children(num,'lvlOverride').find(x=>Number(attr(x,'ilvl'))===l);
        const def=child(override,'lvl') || children(abs,'lvl').find(x=>Number(attr(x,'ilvl'))===l);
        return {def,start:Number(val(child(override,'startOverride')) || val(child(def,'start')) || 1)};
      };
      const {def,start}=definition(level); if(!def) return '';
      const c=counters[view][id] || (counters[view][id]=[]);
      c[level]=c[level] === undefined ? start : c[level]+1;
      for(let l=level+1;l<c.length;l++) {
        const restart=val(child(definition(l).def,'lvlRestart'));
        if(restart !== '0') c[l]=undefined;
      }
      const text=val(child(def,'lvlText')) || '%'+(level+1)+'.';
      return text.replace(/%(\d+)/g, (_,i)=>{const l=Number(i)-1, d=definition(l);return format(c[l]===undefined?d.start:c[l],val(child(d.def,'numFmt')));});
    }};
  }
  function parseDocxParts(parts) {
    if (!parts['word/document.xml']) throw new Error('This file does not contain a Word document body.');
    const main=xml(parts['word/document.xml']);
    const body=all(main,'body')[0]; if(!body) throw new Error('Word document body is missing.');
    const nr=numberingResolver(parts['word/numbering.xml']?xml(parts['word/numbering.xml']):null,parts['word/styles.xml']?xml(parts['word/styles.xml']):null);
    const blocks=[], warnings=[], revisionElements=[];
    let count=0;
    function parsePart(doc, part, mainBody) {
      const container=mainBody || doc.documentElement;
      let pIndex=0, tableIndex=0;
      function walk(n, context) {
        if(n.namespaceURI !== W) return;
        if(n.localName === 'p') {
          pIndex++; const runs=readRuns(n);
          if(!runs.some(r=>r.text.trim())) return;
          const pr=child(n,'pPr'), outline=nr.prop(n,'outlineLvl');
          const b={id:'b'+(++count),part,paragraph:pIndex,location:part+' · paragraph '+pIndex+(context?' · '+context:''),table:!!context,context:context||'',runs,style:val(child(pr,'pStyle')),outline:outline?Number(val(outline)):null,numbers:{}};
          ['original','proposed'].forEach(v=>{b.numbers[v]=viewText(b,v).trim() ? nr.number(n,v) : '';});
          blocks.push(b); return;
        }
        if(n.localName === 'tbl') {
          const ti=++tableIndex;
          children(n,'tr').forEach((row,ri)=>children(row,'tc').forEach((cell,ci)=>children(cell).forEach(c=>walk(c,'table '+ti+', row '+(ri+1)+', cell '+(ci+1)))));
          return;
        }
        if(['pPr','rPr','sectPr'].includes(n.localName) || /PrChange$/.test(n.localName)) return;
        children(n).forEach(c=>walk(c,context));
      }
      walk(container,'');
      ['ins','del','moveFrom','moveTo'].forEach(kind=>all(doc,kind).forEach(n=>revisionElements.push({part,kind,id:attr(n,'id'),author:attr(n,'author'),date:attr(n,'date'),text:readRuns(n).map(r=>r.text).join('')})));
      if(all(doc,'altChunk').length) warnings.push(part+': embedded content was not extracted.');
      if(all(doc,'drawing').length && part==='word/document.xml') warnings.push('Body drawings/images may contain text; no image OCR was performed.');
      if(all(doc,'txbxContent').length) warnings.push('Text boxes require a visual order check.');
    }
    parsePart(main,'word/document.xml',body);
    Object.keys(parts).filter(k=>/^word\/(?:header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/.test(k)).forEach(k=>parsePart(xml(parts[k]),k));
    const mainText=blocks.filter(b=>b.part==='word/document.xml').map(b=>viewText(b,'proposed')).join('\n');
    if(!mainText.trim()) throw new Error('No readable document text. OCR or another source is required; no comparison was saved.');
    if(all(main,'pPrChange').length || all(main,'rPrChange').length || all(main,'tblPrChange').length) warnings.push('Tracked formatting/paragraph-property changes are recorded in the source; views reconstruct text, not historical layout or numbering.');
    return {format:'docx',blocks,revisionElements,warnings,coverage:warnings.some(w=>/not extracted|OCR|visual order/.test(w))?'partial':'text-extracted',parserVersion:1};
  }
  async function extractDocx(bytes) {
    const archive=await root.JSZip.loadAsync(bytes), parts={};
    let total=0;
    for(const name of Object.keys(archive.files).filter(k=>/^word\/(?:document|numbering|styles|header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/.test(k))) {
      const text=await archive.file(name).async('string'); total+=text.length;
      if(total>30000000) throw new Error('Document expands beyond the 30 MB text limit.');
      parts[name]=text;
    }
    return parseDocxParts(parts);
  }
  async function extractPdf(bytes) {
    root.pdfjsLib.GlobalWorkerOptions.workerSrc='/nda-guard/vendor/pdf.worker-3.11.174.min.js';
    const doc=await root.pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0)),isEvalSupported:false}).promise;
    const blocks=[],warnings=['PDF text has no Word tracked-change metadata. Reading order must be checked against the original PDF.'];
    try {
      for(let p=1;p<=doc.numPages;p++) {
        const page=await doc.getPage(p), content=await page.getTextContent(); let line='',lastY=null,index=0;
        function flush(){if(line.trim()) blocks.push({id:'pdf-'+p+'-'+(++index),part:'PDF',paragraph:index,page:p,location:'PDF · page '+p+' · line '+index,runs:[{text:line,revision:null}],numbers:{original:'',proposed:''},style:'',outline:null,table:false});line='';}
        content.items.forEach(item=>{if(!('str' in item))return;const y=item.transform[5];if(lastY!==null&&Math.abs(y-lastY)>3)flush();line+=(line&&!/\s$/.test(line)?' ':'')+item.str;lastY=y;if(item.hasEOL)flush();}); flush();
        if(!blocks.some(b=>b.page===p)) warnings.push('Page '+p+' has no readable text; OCR is required.');
      }
    } finally { await doc.destroy(); }
    if(!blocks.length) throw new Error('No readable PDF text. OCR is required; no comparison was saved.');
    return {format:'pdf',blocks,revisionElements:[],warnings,coverage:'partial',parserVersion:1};
  }
  function sections(extracted, view) {
    const result=[]; let current=null, annexure=false;
    for(const b of extracted.blocks.filter(b=>b.part==='word/document.xml'||b.part==='PDF')) {
      const text=viewText(b,view); if(!text.trim()) continue;
      if(looksHeading(b,text)) {
        if(/^(?:annexure|schedule)(?:\s|$)/i.test(text.trim())) annexure=true;
        current={id:view+'-'+b.id,heading:text.trim(),number:b.numbers[view]||'',headingBlock:b.id,topics:headingTopics(text),annexure,blocks:[],tracked:false}; result.push(current);
      }
      if(!current){current={id:view+'-preamble',heading:'Parties and preamble',number:'',topics:[],blocks:[],annexure:false,tracked:false};result.push(current);}
      current.blocks.push(b.id);
      if(b.runs.some(r=>r.revision))current.tracked=true;
    }
    return result;
  }
  const baselineTopics=['definitions','obligations','circumvention','exclusions','term','remedies','notices','law','general','annexures'];
  function mapSections(extracted, baseline, view) {
    const secs=sections(extracted,view), byId=new Map(extracted.blocks.map(b=>[b.id,b]));
    const rows=baseline.map((base,i)=>{
      const topic=baselineTopics[i], matches=[];
      secs.forEach(s=>{
        if(s.annexure && topic!=='annexures') return;
        if(s.topics.includes(topic) || (topic==='annexures'&&s.annexure)) matches.push({sectionId:s.id,heading:s.heading,blocks:s.blocks,confidence:'heading match',reason:'Recognized subject heading; wording equivalence has not been assessed.',tracked:s.tracked});
        // Exclusions are commonly embedded in confidentiality obligations, not a standalone section.
        else if(topic==='exclusions' && s.topics.some(t=>['obligations','definitions'].includes(t))) {
          const ids=s.blocks.filter(id=>/does not apply|shall not apply|public domain|publicly available|already.{0,25}known|independently developed/i.test(viewText(byId.get(id),view)));
          if(ids.length) matches.push({sectionId:s.id,heading:s.heading,blocks:ids,confidence:'candidate — review',reason:'Relevant wording found within another subject; review the full section.',tracked:s.tracked});
        }
      });
      return {baselineId:base.id,topic,matches,status:matches.length?'mapped — review wording':'unmapped — manual review',conclusion:'No legal equivalence or missing-protection conclusion is made in Phase 1.'};
    });
    const used=new Set(rows.flatMap(r=>r.matches.map(m=>m.sectionId)));
    return {view,rows,sections:secs,unmapped:secs.filter(s=>!used.has(s.id)),coverage:extracted.coverage};
  }
  const numberWords={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,twenty:20,twentyfour:24};
  function durationMatches(text){
    const out=[], re=/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|twenty[- ]?four)\s*(?:\(\s*\d+\s*\))?\s*(year|years|month|months)\b/gi;
    for(const m of String(text||'').matchAll(re)){const n=/^\d+$/.test(m[1])?Number(m[1]):numberWords[m[1].toLowerCase().replace(/\s/g,'')];if(Number.isFinite(n))out.push({value:n*(m[2].toLowerCase().startsWith('year')?12:1),text:m[0],index:m.index});}
    return out;
  }
  function riskQuote(extracted,ids,pattern,view='proposed'){
    for(const id of ids){const b=extracted.blocks.find(x=>x.id===id),text=b&&viewText(b,view==='original'?'original':'proposed');if(b&&text&&(!pattern||pattern.test(text)))return {quote:text.slice(0,1200),location:b.location,blockId:b.id};}
    return null;
  }
  function analyzeRisks(extracted,baseline,mapping,view='proposed'){
    const risks=[], rows=new Map(mapping.rows.map(r=>[r.topic,r]));
    const baseByTopic=new Map(baseline.map((b,i)=>[['definitions','obligations','circumvention','exclusions','term','remedies','notices','law','general','annexures'][i],b]));
    const rowText=topic=>{const row=rows.get(topic);return row?row.matches.flatMap(m=>m.blocks).map(id=>{const b=extracted.blocks.find(x=>x.id===id);return b?viewText(b,view==='original'?'original':'proposed'):''}).join('\n'):'';};
    const add=(r)=>risks.push({id:r.id,severity:r.severity||'critical',status:r.status||'critical',confidence:r.confidence||'high',...r});
    function durationRule(topic,id,label){
      const row=rows.get(topic), text=rowText(topic), matches=durationMatches(text), base=baseByTopic.get(topic);
      if(!row||!row.matches.length){add({id, status:'manual-review',severity:'blocking-review',confidence:'not-assessable',title:label+' cannot be verified',rule:'mapping-or-extraction-failure',consequence:'The relevant uploaded section was not reliably mapped; absence of protection must not be assumed.',baseline:{blockId:base?.id||'',quote:base?.text||'',location:base?.location||''},uploaded:[]});return;}
      const relevant=matches.filter(x=>x.value>0), least=relevant.length?Math.min(...relevant.map(x=>x.value)):null, quote=riskQuote(extracted,row.matches.flatMap(m=>m.blocks),/(year|month)/i,view);
      if(least===null){add({id,status:'manual-review',severity:'blocking-review',confidence:'medium',title:label+' duration is not explicit',rule:'duration-not-explicit',consequence:'The duration or its starting event requires human review.',baseline:{blockId:base.id,quote:base.text,location:base.location},uploaded:quote?[quote]:[]});return;}
      if(least<60)add({id,severity:'critical',confidence:'high',title:label+' is shorter than five years',rule:'duration-below-baseline',consequence:'The uploaded wording may allow protection to expire before the DealGuard five-year requirement.',baseline:{blockId:base.id,quote:base.text,location:base.location},uploaded:quote?[quote]:[],observedDurationMonths:least});
      else add({id,status:'clear-supported',severity:'info',confidence:'high',title:label+' meets the five-year minimum stated by DealGuard',rule:'duration-meets-baseline',consequence:'An explicit duration of at least five years was found in the mapped uploaded section.',baseline:{blockId:base.id,quote:base.text,location:base.location},uploaded:quote?[quote]:[],observedDurationMonths:least});
    }
    durationRule('term','term-duration','Agreement term');
    durationRule('circumvention','circumvention-duration','Non-circumvention protection');
    const crow=rows.get('circumvention'),ctext=rowText('circumvention'),bypass=/(prior|existing)\s+(relationship|client|contact)|independent(?:ly)?\s+(identified|approach|pursue|opportunit)|unsolicited\s+(contact|approach)|after\s+(the\s+)?(?:term|agreement|termination|expiry)|once\s+the\s+relationship\s+term\s+ends|free\s+to\s+(?:approach|deal|contact)/i;
    if(crow?.matches.length&&bypass.test(ctext)){const quote=riskQuote(extracted,crow.matches.flatMap(m=>m.blocks),bypass,view);add({id:'circumvention-bypass-exception',severity:'critical',confidence:'medium',title:'Potential non-circumvention bypass route detected',rule:'bypass-exception-or-post-term-release',consequence:'The uploaded wording appears to contain an exception or post-term permission that could permit direct or indirect dealings with an introduced client. Legal review is required.',baseline:{blockId:baseByTopic.get('circumvention')?.id||'',quote:baseByTopic.get('circumvention')?.text||'',location:baseByTopic.get('circumvention')?.location||''},uploaded:quote?[quote]:[]});}
    if(extracted.coverage==='partial')add({id:'extraction-coverage',status:'manual-review',severity:'blocking-review',confidence:'not-assessable',title:'Risk analysis is incomplete because extraction coverage is partial',rule:'partial-extraction',consequence:'Do not treat the comparison as clearance until unreadable pages, images, or ordering warnings are reviewed.',baseline:{},uploaded:[]});
    return {schemaVersion:1,view,requiredDurationMonths:60,risks,blocking:risks.some(r=>r.severity==='critical'||r.severity==='blocking-review'),complete:extracted.coverage!=='partial'&&risks.every(r=>r.status!=='manual-review')};
  }
  function riskForView(record,view='proposed'){
    const version=view==='original'?'original':'proposed';
    return analyzeRisks(record.extracted,record.baseline,record.mappings[version],version);
  }
  async function digest(value) {
    const bytes=typeof value==='string'?new TextEncoder().encode(value):value;
    if(!root.crypto || !root.crypto.subtle) throw new Error('Open the app on localhost to enable source fingerprinting.');
    return Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  class Gate { constructor(){this.generation=0;} next(){return ++this.generation;} current(token){return token===this.generation;} }
  class Store {
    constructor(name='dealguard-comparisons-v1'){this.name=name;this.promise=null;}
    open(){
      if(!this.promise)this.promise=new Promise((resolve,reject)=>{
        const req=indexedDB.open(this.name,1);
        req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('comparisons'))db.createObjectStore('comparisons',{keyPath:'id'});};
        req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result);};
        req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('Local database is blocked by another tab.'));
      }).catch(e=>{this.promise=null;throw e;});
      return this.promise;
    }
    async run(mode,action){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction('comparisons',mode);let req;try{req=action(tx.objectStore('comparisons'));}catch(e){reject(e);return;}tx.oncomplete=()=>resolve(req.result);tx.onabort=()=>reject(tx.error||new Error('Local save aborted.'));tx.onerror=()=>reject(tx.error||new Error('Local storage failed.'));});}
    put(record){return this.run('readwrite',s=>s.put(record));}
    get(id){return this.run('readonly',s=>s.get(id));}
    list(){return this.run('readonly',s=>s.getAll());}
    remove(id){return this.run('readwrite',s=>s.delete(id));}
  }
  root.DealGuardCore={parseDocxParts,extractDocx,extractPdf,viewText,sections,mapSections,analyzeRisks,riskForView,digest,Gate,Store,headingTopics};
})(globalThis);
