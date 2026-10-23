/* Optional advisory UI. No API credentials or provider requests in the browser. */
(function(){
  'use strict';
  const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const button=(text,fn)=>{const n=el('button',text);n.type='button';n.onclick=fn;return n;};
  window.DealGuardAI={create({host,onSave,onViewSource}){
    let record=null,view='proposed',generation=0,controller=null,session=null,busy=false;
    const root=el('details');root.className='dg-ai';root.hidden=true;root.append(el('summary','Optional Astra / Terra review'));
    const info=el('p','AI suggestions are advisory. They cannot change source evidence, deterministic mappings, document wording, or approval status. Exact quotation checks do not verify the model’s interpretation.');root.append(info);
    const settings=el('div');settings.className='dg-controls';
    const checks={};for(const name of ['astra','terra']){const label=el('label'),input=el('input');input.type='checkbox';input.checked=true;checks[name]=input;label.append(input,document.createTextNode(' '+name[0].toUpperCase()+name.slice(1)));settings.append(label);}
    const availability=el('span','AI is off until you authorize a review.');availability.className='dg-small';settings.append(button('Check backend',()=>checkBackend()),availability);root.append(settings);
    const consentLabel=el('label'),consent=el('input');consent.type='checkbox';consentLabel.append(consent,document.createTextNode(' Authorize sending this document’s extracted body text, baseline and mappings to OpenAI for the selected models. I have authority to use AI with this document.'));root.append(consentLabel);
    root.append(el('p','The original file goes only to the local backend for verification. OpenAI receives the verified text packet. Requests use store:false; provider retention rules still apply. Each run may incur API usage.'));
    const actions=el('div');actions.className='dg-controls';const run=button('Run selected models',start),cancel=button('Cancel review',()=>{resetRequest();message.textContent='Review cancelled. Provider processing may already have incurred usage.';});actions.append(run,cancel);root.append(actions);
    const message=el('p','Complete a local comparison first.');message.setAttribute('role','status');message.setAttribute('aria-live','polite');root.append(message);
    const results=el('div');root.append(results);host.append(root);
    function controls(){run.disabled=!record||busy||!consent.checked||!Object.values(checks).some(c=>c.checked)||!session?.enabled;cancel.disabled=!busy;Object.values(checks).forEach(c=>c.disabled=busy);consent.disabled=busy;}
    function resetRequest(){generation++;controller?.abort();controller=null;busy=false;controls();}
    consent.onchange=controls;Object.values(checks).forEach(c=>c.onchange=controls);
    async function checkBackend(){const token=generation;try{const response=await fetch('/api/session',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error();const data=await response.json();if(token!==generation)return;session=data;availability.textContent=data.reason+' Astra: '+(data.models.astra||'not configured')+' · Terra: '+(data.models.terra||'not configured');controls();}catch{if(token===generation){session=null;availability.textContent='Secure backend unavailable. Open DealGuard through npm start; local comparison still works.';controls();}}}
    function verifiedRun(data,r,v){
      if(data.authority!=='advisory-only'||data.sourceHash!==r.file.sha256||data.baselineHash!==r.baselineHash||data.view!==v||!Array.isArray(data.results))throw new Error('AI result does not match the current source and version.');
      const blocks=new Map(r.extracted.blocks.map(b=>[b.id,b])),bases=new Map(r.baseline.map(b=>[b.id,b]));
      for(const result of data.results){
        if(result.packetHash!==data.packetHash||result.sourceHash!==r.file.sha256||result.baselineHash!==r.baselineHash||result.view!==v)throw new Error('AI result fingerprint mismatch.');
        if(result.findings&&!result.findings.every(f=>bases.has(f.baselineId)&&Array.isArray(f.citations)&&f.citations.length>0&&f.citations.every(c=>{
          const b=c.source==='baseline'?bases.get(c.blockId):c.source==='uploaded'?blocks.get(c.blockId):null;
          const text=b?(c.source==='baseline'?b.text:DealGuardCore.viewText(b,v)):'';
          return typeof c.quote==='string'&&c.quote.trim().length>=12&&text.includes(c.quote);
        })))throw new Error('AI citations do not match local deterministic evidence. No results were saved.');
      }
      return data;
    }
    async function start(){
      if(run.disabled)return;const current=record,currentView=view,token=++generation;controller=new AbortController();const signal=controller.signal;busy=true;controls();message.textContent='Verifying source locally, then requesting independent model reviews…';
      try{
        // Refresh session for this explicit run; a backend restart cannot reuse an old CSRF token.
        const sr=await fetch('/api/session',{signal,credentials:'same-origin',cache:'no-store'});if(!sr.ok)throw new Error('Backend session unavailable.');session=await sr.json();if(!session.enabled)throw new Error(session.reason);
        const bytes=new Uint8Array(await current.sourceBlob.arrayBuffer());if(bytes.length>session.maxSourceBytes)throw new Error('AI review supports sources up to 4 MB. The local comparison is unchanged.');
        let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
        const mappingHash=await DealGuardCore.digest(JSON.stringify(current.mappings[currentView]));
        if(token!==generation)return;
        const response=await fetch('/api/review',{method:'POST',signal,credentials:'same-origin',headers:{'Content-Type':'application/json','X-DG-CSRF':session.csrf},body:JSON.stringify({sourceBase64:btoa(binary),sourceHash:current.file.sha256,baselineHash:current.baselineHash,mappingHash,format:current.extracted.format,view:currentView,models:Object.keys(checks).filter(k=>checks[k].checked),consent:true})});
        const data=await response.json();if(!response.ok)throw new Error(data.error||'Review failed.');if(token!==generation||record!==current||view!==currentView)return;
        verifiedRun(data,current,currentView);current.aiReviews=current.aiReviews||[];current.aiReviews.push(data);
        renderResults();message.textContent='Review returned. Suggestions remain separate from the deterministic comparison. Saving locally…';
        const saved=await onSave(current);if(token===generation)message.textContent=saved?'Advisory results saved locally. Check each model’s status and quotations.':'Results are visible but not saved. Use Retry local save in the comparison.';
      }catch(e){if(token===generation)message.textContent=signal.aborted?'Review cancelled or timed out.':e.message;}
      finally{if(token===generation){busy=false;controller=null;consent.checked=false;controls();}}
    }
    function renderResults(){
      results.replaceChildren();if(!record)return;
      const reviews=(record.aiReviews||[]).filter(r=>r.view===view&&r.sourceHash===record.file.sha256&&r.baselineHash===record.baselineHash);
      if(!reviews.length){results.append(el('p','No AI review for this document version.'));return;}
      for(const review of reviews.slice().reverse()){
        const group=el('details');group.open=review===reviews.at(-1);group.append(el('summary','Review '+new Date(review.createdAt).toLocaleString()+' · '+review.view+' text'));
        group.append(el('p','Same evidence packet: '+review.packetHash));const grid=el('div');grid.className='dg-grid';
        for(const r of review.results){const column=el('section');column.className='dg-column';column.append(el('h3',r.alias.toUpperCase()+' · '+r.status),el('p',r.model+' · '+r.promptVersion+' · '+(r.elapsedMs/1000).toFixed(1)+' seconds'));
          if(r.error)column.append(el('p',r.error));
          if(r.rejected?.length)column.append(el('p',r.rejected.length+' suggestions rejected by evidence/schema checks; excluded from this review.'));
          if(r.findings?.length===0)column.append(el('p','No supported suggestions returned. This does not mean the NDA is approved or risk-free.'));
          for(const f of r.findings||[]){const finding=el('div');finding.className='dg-row';finding.append(el('strong',f.baselineId+' · '+f.kind),el('p',f.explanation),el('p','Suggested action: '+f.suggestedAction));
            for(const c of f.citations){finding.append(el('div',c.source+' · '+c.location),el('blockquote',c.quote));if(c.trackedProposal)finding.append(el('span','Tracked proposal—not an agreed term'));if(c.source==='uploaded')finding.append(button('View deterministic source',()=>onViewSource(c.blockId,view)));}
            finding.append(el('p','Quotation verified; interpretation requires human review.'));column.append(finding);
          }
          grid.append(column);
        }
        group.append(grid);results.append(group);
      }
    }
    return {reset(){resetRequest();record=null;consent.checked=false;root.hidden=true;results.replaceChildren();controls();},attach(r,v){v=v==='original'?'original':'proposed';if(record!==r||view!==v){resetRequest();record=r;view=v;consent.checked=false;message.textContent='Optional review of '+r.file.name+' · '+v+' text. No data is sent until you authorize and run.';checkBackend();}root.hidden=false;renderResults();controls();}};
  }};
})();
