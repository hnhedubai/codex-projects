(function () {
  'use strict';
  const C=window.DealGuardCore, store=new C.Store(), gate=new C.Gate();
  const state={file:null,record:null,saved:false,view:'proposed',mode:'comparison',busy:false};
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
  const modal=el('section',undefined,'dg-dialog');modal.id='compare-nda-modal';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','NDA comparison');
  modal.innerHTML='<header class="dg-head"><h2>NDA comparison · Phase 1</h2><button data-draft disabled>Revision request draft</button><button data-close aria-label="Close NDA comparison">Close</button></header><div class="dg-content"><div class="dg-small">Local extraction and subject mapping. Legal findings and expanded review rules belong to Phase 2. Documents are not sent to an AI service.</div><div class="dg-controls"><label>Test NDA <select id="dg-source"><option value="/nda-guard/NDA_1__Viktoriia_V2.docx">Viktoriia</option></select></label><label>Choose another NDA <input id="compare-file" type="file" accept=".docx,.pdf"></label><button id="compare-start" class="dg-primary" disabled>Compare and save</button><button data-retry hidden>Retry local save</button></div><div data-file class="dg-meta"></div><div id="compare-progress" class="dg-status" role="status" aria-live="polite">Choose a document to begin.</div><div class="dg-controls" data-view-controls hidden><label>Document version <select id="dg-version"><option value="proposed">Proposed text (insertions included)</option><option value="original">Original text (before tracked edits)</option><option value="markup">Tracked changes markup</option></select></label><button data-comparison>Section comparison</button><button data-upload>Read uploaded NDA</button><button data-baseline>Read DealGuard baseline</button><button data-download>Download preserved source</button></div><div id="compare-result"></div><details data-history open><summary>Saved comparisons</summary><div id="compare-history"></div><details><summary>Previous app history (metadata only)</summary><div data-legacy></div></details></details></div>';
  document.body.append(modal);
  const q=s=>modal.querySelector(s), progress=q('#compare-progress'), result=q('#compare-result'), source=q('#dg-source'), input=q('#compare-file'), start=q('#compare-start');
  const customOption=el('option','Saved / uploaded document');customOption.value='';source.append(customOption);
  q('.dg-head h2').textContent='NDA comparison';
  q('.dg-content > .dg-small').textContent='Deterministic extraction and mapping remain authoritative. Optional Astra / Terra suggestions require a configured backend and explicit authorization.';
  const aiHost=el('div');result.before(aiHost);
  const ai=window.DealGuardAI?.create({host:aiHost,onSave:async record=>{if(state.record!==record)return false;await saveRecord(gate.generation,record);return state.saved;},onViewSource:(id,view)=>{state.view=view;state.mode='upload';render();document.getElementById('source-'+id)?.scrollIntoView();}});
  const topButton=button('Compare NDA',open);topButton.style.cssText='margin-left:auto;margin-right:18px;padding:8px 12px;border:1px solid #2167c7;background:white;color:#2167c7;border-radius:6px;cursor:pointer';
  document.querySelector('.top').insertBefore(topButton,document.querySelector('.secure'));
  function status(text,kind=''){progress.textContent=text;progress.className='dg-status'+(kind?' dg-'+kind:'');}
  function invalidate(message) {
    ai?.reset();
    const token=gate.next();state.file=null;state.record=null;state.saved=false;state.busy=false;state.mode='comparison';state.view='proposed';
    window.dealguardCriticalRisks=[];document.getElementById('revision-draft-modal')?.remove();
    result.replaceChildren();q('[data-view-controls]').hidden=true;q('[data-draft]').disabled=true;q('[data-retry]').hidden=true;
    start.disabled=true;q('[data-file]').textContent='';q('#dg-version').value='proposed';status(message);return token;
  }
  // Phase 1 cannot authorize signing an uploaded document based on a mapping result.
  let comparing=false;
  const priorCheck=window.check;
  window.check=function(){if(priorCheck)priorCheck();if(comparing){const s=document.getElementById('sign');s.disabled=true;s.title='The uploaded NDA requires manual review. Phase 1 mapping does not approve or sign it.';}};
  document.addEventListener('click',e=>{if(e.target.id==='sign'&&comparing){e.preventDefault();e.stopImmediatePropagation();}},true);
  async function selectFixture(){
    comparing=true;window.check();const token=invalidate('Loading local fixture…');input.value='';
    if(!source.value){status('Choose a DOCX/PDF file or a named test fixture.');return;}
    try{const r=await fetch(source.value);if(!r.ok)throw new Error('The selected local fixture could not be loaded.');const blob=await r.blob();if(!gate.current(token))return;state.file=new File([blob],source.value.split('/').pop(),{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});ready();}
    catch(e){if(gate.current(token))status(e.message,'error');}
  }
  function ready(){q('[data-file]').textContent=state.file.name+' · '+state.file.size.toLocaleString()+' bytes';start.disabled=false;status('Ready. Comparing will preserve the source and completed extraction in this browser.');}
  source.onchange=selectFixture;
  input.onchange=()=>{const file=input.files[0];source.value='';comparing=true;window.check();invalidate(file?'Checking selected file…':'No file selected.');if(file){state.file=file;ready();}};
  async function open(){modal.hidden=false;document.body.classList.add('compare-modal-open');q('[data-close]').focus();await renderHistory();if(!state.file&&!state.record)await selectFixture();}
  q('[data-close]').onclick=()=>{modal.hidden=true;document.body.classList.remove('compare-modal-open');topButton.focus();};
  modal.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('revision-draft-modal'))q('[data-close]').click();if(e.key==='Tab'){const nodes=Array.from(modal.querySelectorAll('button,input,select,textarea,summary,a')).filter(n=>!n.disabled&&n.getClientRects().length);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  function baseline(){return Array.from(document.querySelectorAll('#document .clause')).map((section,i)=>{const copy=section.cloneNode(true);copy.querySelectorAll('button,input,.comment,#annexure-status').forEach(n=>n.remove());const h=copy.querySelector('h2');const heading=h.textContent;h.remove();return {id:section.id,heading,location:'DealGuard v1.3 · clause '+(i+1),text:Array.from(copy.children).filter(n=>!n.textContent.includes('Annexure status:')).map(n=>n.textContent.trim()).filter(Boolean).join('\n\n')};});}
  async function compare(){
    if(!state.file||state.busy)return;
    ai?.reset();
    const file=state.file, token=gate.next();state.record=null;state.saved=false;state.busy=true;result.replaceChildren();q('[data-view-controls]').hidden=true;q('[data-draft]').disabled=true;q('[data-retry]').hidden=true;document.getElementById('revision-draft-modal')?.remove();start.disabled=true;status('Extracting '+file.name+'…');
    try{
      if(file.size>25*1024*1024)throw new Error('Please use a document smaller than 25 MB.');
      const bytes=await file.arrayBuffer();if(!gate.current(token))return;
      const isDocx=/\.docx$/i.test(file.name),isPdf=/\.pdf$/i.test(file.name);
      if(!isDocx&&!isPdf)throw new Error('Only DOCX and PDF files are supported.');
      const extracted=await (isDocx?C.extractDocx(bytes):C.extractPdf(bytes));if(!gate.current(token))return;
      const base=baseline(), [hash,baseHash]=await Promise.all([C.digest(bytes),C.digest(JSON.stringify(base))]);if(!gate.current(token))return;
      const mappings={original:C.mapSections(extracted,base,'original'),proposed:C.mapSections(extracted,base,'proposed')};
      const record={schemaVersion:1,id:crypto.randomUUID(),createdAt:new Date().toISOString(),file:{name:file.name,type:file.type,size:file.size,sha256:hash},sourceBlob:new Blob([bytes],{type:file.type}),baseline:base,baselineHash:baseHash,extracted,mappings,riskAnalysis:C.analyzeRisks(extracted,base,mappings.proposed,'proposed'),view:'proposed',draft:'',phase:1};
      state.record=record;state.view='proposed';state.mode='comparison';state.busy=false;render();
      await saveRecord(token,record,true);
    }catch(e){if(gate.current(token)){state.record=null;state.busy=false;status('Comparison incomplete: '+e.message+' Source and previous history are unchanged.','error');}}
    finally{if(gate.current(token))start.disabled=!state.file;}
  }
  start.onclick=compare;
  async function saveRecord(token,record,initial=false){
    try{await store.put(record);if(!gate.current(token)||state.record!==record)return;state.saved=true;q('[data-retry]').hidden=true;status((initial?'Extraction and mapping complete. ':'')+'Saved locally with source file, evidence, both document versions and baseline. '+(record.extracted.coverage==='partial'?'Extraction has limitations; review the warnings.':'Review the mapped wording; Phase 1 does not assess legal equivalence.'),record.extracted.coverage==='partial'?'warning':'');await renderHistory();}
    catch(e){if(gate.current(token)&&state.record===record){state.saved=false;q('[data-retry]').hidden=false;status('NOT SAVED: '+e.message+' The current result is available in this tab. Previous history is unchanged. Use Retry local save.','error');}}
  }
  q('[data-retry]').onclick=()=>state.record&&saveRecord(gate.generation,state.record);
  q('#dg-version').onchange=()=>{if(!state.record)return;state.view=q('#dg-version').value;state.record.view=state.view;render();saveRecord(gate.generation,state.record);};
  [['[data-comparison]','comparison'],['[data-upload]','upload'],['[data-baseline]','baseline']].forEach(([s,mode])=>q(s).onclick=()=>{state.mode=mode;render();});
  function evidence(block,view,record,anchor=false){
    const wrap=el('div',undefined,'dg-evidence');if(anchor)wrap.id='source-'+block.id;
    const location=el('div',block.location+(block.numbers?.[view==='markup'?'proposed':view]?' · Word label '+block.numbers[view==='markup'?'proposed':view]:''),'dg-small');wrap.append(location);
    const quote=el('blockquote');
    if(view==='markup')block.runs.forEach(run=>{if(!run.revision){quote.append(document.createTextNode(run.text));return;}const n=el(run.revision.type==='inserted'?'mark':'del',run.text);n.title=run.revision.type+' (proposed) · '+(run.revision.author||'unknown author')+' · '+(run.revision.date||'undated');quote.append(n);});
    else quote.textContent=C.viewText(block,view);
    wrap.append(quote);
    if(block.runs.some(r=>r.revision))wrap.append(el('span','Contains tracked proposals; acceptance is not established.','dg-badge'));
    if(!anchor)wrap.append(button('View in source',()=>{state.mode='upload';render();document.getElementById('source-'+block.id)?.scrollIntoView();}));
    return wrap;
  }
  function render(){
    const r=state.record;if(!r)return;result.replaceChildren();q('[data-view-controls]').hidden=false;q('[data-draft]').disabled=false;q('#dg-version').value=state.view;
    ai?.attach(r,state.view);
    q('[data-file]').textContent=r.file.name+' · SHA-256 '+r.file.sha256+' · compared '+new Date(r.createdAt).toLocaleString();
    const map=r.mappings[state.view==='original'?'original':'proposed'], blocks=new Map(r.extracted.blocks.map(b=>[b.id,b]));
    const risks=C.riskForView(r,state.view);
    result.append(el('div','Risk checks · '+(risks.view==='original'?'Original text':'Proposed text')+(state.view==='markup'?' (markup uses proposed text)':''),'dg-small'));
    if(risks){const box=el('div',undefined,'dg-risk-panel '+(risks.blocking?'dg-risk-blocking':'dg-risk-clear'));box.append(el('strong',risks.blocking?'Blocking review required':'No supported conflict detected'));box.append(el('div',risks.blocking?'Explicit conflicts or unverifiable sections require review before approval.':'The five-year rules were checked against readable, reliably mapped evidence; this is not legal clearance.','dg-small'));risks.risks.forEach(x=>{const item=el('details',undefined,'dg-risk-item');item.open=x.severity==='critical'||x.severity==='blocking-review';item.append(el('summary',(x.severity==='critical'?'Critical · ':x.severity==='blocking-review'?'Review required · ':'Checked · ')+x.title+' · '+x.confidence));item.append(el('p',x.consequence));if(x.observedDurationMonths)item.append(el('div','Observed duration: '+x.observedDurationMonths+' months','dg-small'));if(x.uploaded?.length){const qd=el('blockquote');qd.textContent=x.uploaded[0].quote;item.append(el('div','Uploaded evidence · '+x.uploaded[0].location,'dg-small'),qd);}box.append(item);});result.append(box);}
    const info=el('div',undefined,'dg-status');info.append(el('strong','Source evidence and mapping only. '),document.createTextNode('Heading aliases and limited wording candidates are used; this is not AI semantic analysis or legal approval.'));
    if(r.extracted.revisionElements.length)info.append(el('div',r.extracted.revisionElements.length+' tracked revision elements detected. Proposed text includes insertions and excludes deletions. Original text reverses those text edits; neither view proves agreement.'));
    if(state.view==='markup')info.append(el('div','Markup highlights inserted text in green and deleted text with strikethrough. Section mapping follows the proposed version.'));
    result.append(info);
    if(r.extracted.warnings.length){const list=el('ul');r.extracted.warnings.forEach(w=>list.append(el('li',w)));const box=el('div',undefined,'dg-status dg-warning');box.append(el('strong','Extraction limitations'),list);result.append(box);}
    if(state.mode==='upload'){
      const reader=el('div',undefined,'dg-reader');reader.append(el('h3','Uploaded source · '+r.file.name));
      r.extracted.blocks.forEach(b=>{if(state.view==='markup'||C.viewText(b,state.view).trim())reader.append(evidence(b,state.view,r,true));});result.append(reader);return;
    }
    if(state.mode==='baseline'){
      result.append(el('div','Baseline captured at comparison time · SHA-256 '+r.baselineHash,'dg-small'));
      r.baseline.forEach(b=>{const row=el('section',undefined,'dg-row');row.append(el('h3',b.heading),el('div',b.location,'dg-small'),el('blockquote',b.text));result.append(row);});return;
    }
    result.append(el('p',map.rows.filter(row=>row.matches.length).length+' of '+map.rows.length+' baseline subjects have candidate mappings. '+map.unmapped.length+' uploaded sections are shown separately.'));
    map.rows.forEach(row=>{
      const base=r.baseline.find(b=>b.id===row.baselineId), section=el('section',undefined,'dg-row');section.dataset.topic=row.topic;section.append(el('h3',base.heading),el('div',row.status,'dg-small'));
      const grid=el('div',undefined,'dg-grid'), left=el('div',undefined,'dg-column'),right=el('div',undefined,'dg-column');left.append(el('strong','DealGuard baseline'),el('div',base.location,'dg-small'),el('blockquote',base.text));
      right.append(el('strong','Uploaded NDA · '+(state.view==='original'?'original text':'proposed text')));
      if(!row.matches.length)right.append(el('p','No reliable subject mapping found. This is not a finding that protection is absent. Inspect the full source and unmatched sections.','dg-empty'));
      row.matches.forEach(m=>{const d=el('details');d.open=row.topic==='circumvention';d.append(el('summary',m.heading+' · '+m.confidence),el('p',m.reason,'dg-small'));m.blocks.forEach(id=>d.append(evidence(blocks.get(id),state.view,r)));right.append(d);});
      grid.append(left,right);section.append(grid);result.append(section);
    });
    const other=el('details');other.open=true;other.append(el('summary','Other uploaded sections · '+map.unmapped.length));
    map.unmapped.forEach(s=>{const d=el('details');d.append(el('summary',s.heading));s.blocks.forEach(id=>d.append(evidence(blocks.get(id),state.view,r)));other.append(d);});result.append(other);
    const ancillary=r.extracted.blocks.filter(b=>b.part!=='word/document.xml'&&b.part!=='PDF');
    if(ancillary.length){const d=el('details');d.append(el('summary','Headers, footers, notes and comments · '+ancillary.length+' blocks'));ancillary.forEach(b=>d.append(evidence(b,state.view,r)));result.append(d);}
  }
  q('[data-download]').onclick=()=>{if(!state.record)return;const url=URL.createObjectURL(state.record.sourceBlob);const a=el('a');a.href=url;a.download=state.record.file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  let historyGeneration=0;
  async function renderHistory(){
    const generation=++historyGeneration, target=q('#compare-history');
    try{const records=await store.list();if(generation!==historyGeneration)return;target.replaceChildren();records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));if(!records.length)target.append(el('p','No completed Phase 1 comparisons saved yet.'));
      records.forEach(r=>{const row=el('div',undefined,'dg-history-item');row.append(el('span',r.file.name+' · '+new Date(r.createdAt).toLocaleString()+' · '+r.file.sha256.slice(0,12)),button('Restore',()=>restore(r.id)),button('Delete this comparison',async()=>{if(!confirm('Delete this saved comparison and its preserved source from this browser? Original NDA files and older app history will not be changed.'))return;try{await store.remove(r.id);if(state.record?.id===r.id){state.saved=false;status('Saved copy deleted. The current result remains in this tab.','warning');q('[data-retry]').hidden=false;}await renderHistory();}catch(e){status('Could not delete saved comparison: '+e.message,'error');}}));target.append(row);});
    }catch(e){if(generation===historyGeneration)target.textContent='Local history is unavailable: '+e.message;}
    const legacy=q('[data-legacy]');legacy.replaceChildren();try{const raw=localStorage.getItem('dealguard-nda-comparisons');if(!raw){legacy.textContent='No legacy history at this browser address.';return;}const items=JSON.parse(raw);if(!Array.isArray(items))throw new Error('Unrecognized format');items.forEach(item=>legacy.append(el('p',String(item.fileName||'Unknown file')+' · '+String(item.date||'')+' · '+String(item.view||'')+' · metadata only; original app did not save complete results.')));legacy.append(el('p','Legacy history is preserved unchanged.'));}catch(e){legacy.textContent='Legacy history could not be read; its stored value was preserved unchanged.';}
  }
  async function restore(id){
    const token=invalidate('Restoring saved source and comparison…');comparing=true;window.check();
    try{const r=await store.get(id);if(!gate.current(token))return;if(!r||r.schemaVersion!==1||!r.sourceBlob||!r.mappings)throw new Error('Saved comparison is unavailable or has an unsupported schema.');
      const hash=await C.digest(await r.sourceBlob.arrayBuffer());if(!gate.current(token))return;if(hash!==r.file.sha256)throw new Error('Saved source fingerprint does not match.');
      const currentBaseHash=await C.digest(JSON.stringify(baseline()));if(!gate.current(token))return;
      state.record=r;state.saved=true;state.file=new File([r.sourceBlob],r.file.name,{type:r.file.type});source.value='';input.value='';state.view=r.view||'proposed';state.mode='comparison';start.disabled=false;render();
      status('Restored complete saved comparison. '+(currentBaseHash!==r.baselineHash?'The live baseline has changed; this result uses its saved baseline. Run a new comparison to use the current baseline.':'Source fingerprint verified. Saved baseline and evidence restored.'),currentBaseHash!==r.baselineHash?'warning':'');
    }catch(e){if(gate.current(token))status('Restore failed: '+e.message,'error');}
  }
  window.requestNdaRevision=function(){
    const r=state.record;if(!r){status('Complete a comparison before drafting a source-specific request.','warning');return;}
    document.getElementById('revision-draft-modal')?.remove();
    const box=el('section',undefined,'dg-dialog');box.id='revision-draft-modal';box.style.zIndex='30';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Revision request draft');
    const head=el('header',undefined,'dg-head'), title=el('h2','Revision request draft'), close=button('Close',()=>box.remove());head.append(title,close);
    const body=el('div',undefined,'dg-content');body.append(el('p','Local draft only. No email is sent. Phase 1 supplies source evidence; substantive revision findings are not generated.'),el('div',r.file.name+' · SHA-256 '+r.file.sha256,'dg-small'));
    const text=el('textarea');text.setAttribute('aria-label','NDA revision email draft');text.value=r.draft||'Dear colleague,\n\nThank you for sharing '+r.file.name+'. We are reviewing this draft against our DealGuard baseline.\n\n[Insert reviewed clause references, exact source wording and proposed revisions here.]\n\nPlease provide a marked-up revision for discussion. This request does not constitute approval or agreement to any proposed terms.\n\nKind regards,\nMuhammad Mubashir\nHome & Heaven Real Estate';
    body.append(text,button('Save draft locally',async()=>{if(state.record!==r)return;r.draft=text.value;await saveRecord(gate.generation,r);note.textContent=state.saved?'Draft saved with this comparison.':'Draft is not saved. See the save error in the comparison.';}));const note=el('p','Draft edits are saved only when you click Save draft locally.','dg-small');body.append(note);box.append(head,body);document.body.append(box);text.focus();
    box.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();box.remove();}if(e.key==='Tab'){const focusable=Array.from(box.querySelectorAll('button,textarea'));if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus();}}});
  };
  q('[data-draft]').onclick=window.requestNdaRevision;
})();
