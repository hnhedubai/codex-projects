import {buildContactRows,filterContactRows,escapeHtml as h,CONTACT_COLUMNS,CONTACT_LAYOUT_KEY,normalizeContactLayout,moveContactColumn,renderContactCell} from './contact-room-model.js';
import {h2ProjectRecords} from '../h2-projects/data/source.js';

const PATH='/investors-jv',KEY='investor-contact-room:preferences:v1',PATHS=new Set([PATH,'/h2-projects']),KEY_PREFIX='contact-room:preferences:v1:';
const scopedKey=(base,path)=>path===PATH?base:`${base}:${path}`;
export class ContactControlRoom {
 constructor({navigation,verification,browser=window,doc=document}){
  Object.assign(this,{navigation,verification,browser,doc});this.path='';this.filters={};this.companies=[];this.drawn='';
  try{this.layout=normalizeContactLayout(JSON.parse(navigation.storage.getItem(CONTACT_LAYOUT_KEY)||'{}'));}catch{this.layout=normalizeContactLayout();this.preferenceError=true;}
  this.refreshOnFocus=()=>{if(this.active&&!doc.hidden)this.refresh();};
  browser.addEventListener('focus',this.refreshOnFocus);doc.addEventListener('visibilitychange',this.refreshOnFocus);
  browser.addEventListener('storage',event=>{if(this.active&&(event.key===`oplatform:${this.path}:detail-workflow`||event.key===null))this.draw();});
  doc.addEventListener('reoon-results-updated',()=>{if(this.active)this.draw();});
  navigation.root.addEventListener('click',event=>{
   const button=event.target.closest('[data-contact-room-open]');if(!button)return;
   event.preventDefault();navigation.go({path:button.dataset.contactRoomPath,id:null,tab:'contact-room'});
  });
 }
 stop(){this.active=false;this.generation=(this.generation||0)+1;clearInterval(this.timer);this.controller?.abort();this.controller=null;this.layoutAbort?.abort();this.resizeObserver?.disconnect();this.resizing=false;this.dragColumn=null;this.liveIndicator?.remove();this.liveIndicator=null;}
 render(app){
  this.stop();this.active=true;this.app=app;this.path=app.path;this.drawn='';
  try{this.filters=JSON.parse(this.navigation.storage.getItem(scopedKey(KEY,this.path))||'{}')||{};}catch{this.preferenceError=true;}
  try{this.layout=normalizeContactLayout(JSON.parse(this.navigation.storage.getItem(scopedKey(CONTACT_LAYOUT_KEY,this.path))||'{}'));}catch{this.layout=normalizeContactLayout();this.preferenceError=true;}
  const content=app.root.querySelector('#content');
  content.innerHTML=`<section class="contact-room" aria-label="Contact Control Room"><div class="cr-live" data-cr-live role="status">Loading saved records…</div><div class="cr-metrics" data-cr-metrics></div><div class="cr-toolbar"><input type="search" data-cr-filter="search" aria-label="Search all companies and contacts" placeholder="Search company, person, role or email…"><select data-cr-filter="verification" aria-label="Verification filter"><option value="">All verification states</option><option value="verified">Reoon green tick</option><option value="review">Needs review / consent</option><option value="unchecked">Unchecked emails</option><option value="missing">No email yet</option></select><select data-cr-filter="route" aria-label="Email route type"><option value="">All connection routes</option><option value="personal">Non-shared business emails</option><option value="shared">Shared mailboxes</option></select><select data-cr-filter="country" aria-label="Origin country"><option value="">All origin countries</option></select><select data-cr-filter="sector" aria-label="Sector"><option value="">All sectors</option></select><label><input type="checkbox" data-cr-filter="priority"> Priority only</label><label><input type="checkbox" data-cr-filter="linkedin"> Has LinkedIn</label><button type="button" class="quiet" data-cr-refresh>Refresh</button><button type="button" class="quiet" data-cr-clear>Clear filters</button></div><div data-cr-warning class="cr-status" role="status"></div><div class="cr-table-wrap" tabindex="0" aria-label="Contact directory, scroll for more columns"><table><colgroup>${[210,285,170,185,270,130,105,150].map(width=>`<col style="width:${width}px">`).join('')}</colgroup><thead><tr>${['Company','Intent value / evidence','Contact person','Designation','Email / connection route','Reoon verified','LinkedIn','Connect / follow-up'].map(name=>`<th scope="col">${name}</th>`).join('')}</tr></thead><tbody data-cr-rows></tbody></table></div><footer><span data-cr-count></span><span>Live refresh every 5 seconds while this page is visible. Your portfolio filters and column layout are unchanged.</span></footer></section>`;
  this.element=content.querySelector('.contact-room');
  const refreshButton=this.element.querySelector('[data-cr-refresh]'),clearButton=this.element.querySelector('[data-cr-clear]');
  const filterActions=this.doc.createElement('div');filterActions.className='cr-filter-actions';filterActions.append(refreshButton,clearButton);
  const metricValues=this.doc.createElement('div');metricValues.className='cr-metric-values';metricValues.dataset.crMetricValues='';
  this.element.querySelector('[data-cr-metrics]').append(metricValues,filterActions);
  this.installLayout();
  this.liveIndicator=this.element.querySelector('[data-cr-live]');
  const breadcrumb=app.root.querySelector('#breadcrumb');if(breadcrumb){breadcrumb.textContent='Contact Control Room';breadcrumb.append(this.liveIndicator);}
  for(const field of this.element.querySelectorAll('[data-cr-filter]')){const value=this.filters[field.dataset.crFilter];if(field.type==='checkbox')field.checked=value===true;else if(!['country','sector'].includes(field.dataset.crFilter))field.value=value||'';}
  this.element.addEventListener('input',event=>{if(event.target.dataset.crFilter==='search')this.changeFilter(event.target);});
  this.element.addEventListener('change',event=>{if(event.target.dataset.crFilter)this.changeFilter(event.target);});
  this.element.addEventListener('click',async event=>{
   const copy=event.target.closest('[data-cr-copy]');
   if(copy){try{await this.browser.navigator.clipboard.writeText(copy.dataset.crCopy);copy.textContent='Copied';}catch{this.warning('Copy unavailable. Select the email text to copy it.');}return;}
   if(event.target.closest('[data-cr-refresh]'))this.refresh();
   if(event.target.closest('[data-cr-clear]')){this.filters={};this.saveFilters();for(const field of this.element.querySelectorAll('[data-cr-filter]')){if(field.type==='checkbox')field.checked=false;else field.value='';}this.draw();}
  });
  const sourceRows=this.path==='/h2-projects'&&h2ProjectRecords.length?h2ProjectRecords:app.rows;
  this.companies=sourceRows.map(row=>({...row.source,id:row.id,company:row.partner||row.name||row.source?.company,originCountry:row.country||row.source?.country,country:row.country||row.source?.country,intent:row.intent||row.signal||row.source?.signal,intentStrength:row.intentStrength||row.priorityCategory||row.source?.priorityCategory,evidenceDate:row.evidenceDate||row.latestEvidence||row.source?.history?.at?.(-1)?.[0]||'',contacts:row.contacts||row.source?.contacts||[],sources:row.sources||row.source?.sources||[]}));
  this.draw();this.refresh();this.verifyAllContactEmails();
  this.timer=setInterval(()=>{if(!this.doc.hidden)this.refresh();},5000);
  if(this.preferenceError)this.warning('Saved control-room filters could not be read. Other workspace settings have not been changed.');
 }
 installLayout(){
  const table=this.element.querySelector('table'),wrap=this.element.querySelector('.cr-table-wrap');
  table.querySelector('thead tr').innerHTML=CONTACT_COLUMNS.map(column=>`<th scope="col" tabindex="0" draggable="true" data-cr-column="${column.id}" title="Drag to reorder. Alt + Left/Right moves this column."><span class="cr-column-label">${h(column.label)}</span><span class="cr-resize" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Resize ${h(column.label)} column" aria-valuemin="90" aria-valuemax="1200" data-cr-resize="${column.id}"></span></th>`).join('');
  table.querySelectorAll('col').forEach((col,index)=>{col.dataset.crColumn=CONTACT_COLUMNS[index].id;});
  const rail=this.doc.createElement('div');rail.className='cr-horizontal-scroll';rail.tabIndex=0;rail.setAttribute('role','region');rail.setAttribute('aria-label','Horizontal table scrollbar');
  const track=this.doc.createElement('div');track.className='cr-horizontal-track';rail.append(track);wrap.after(rail);this.scrollbar=rail;
  rail.addEventListener('scroll',()=>{if(wrap.scrollLeft!==rail.scrollLeft)wrap.scrollLeft=rail.scrollLeft;});
  wrap.addEventListener('scroll',()=>{if(rail.scrollLeft!==wrap.scrollLeft)rail.scrollLeft=wrap.scrollLeft;});
  rail.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();rail.scrollLeft=event.key==='Home'?0:event.key==='End'?rail.scrollWidth:rail.scrollLeft+(event.key==='ArrowLeft'?-100:100);}});
  if(typeof ResizeObserver!=='undefined'){this.resizeObserver=new ResizeObserver(()=>this.syncScrollbar());this.resizeObserver.observe(wrap);}
  table.querySelector('thead').addEventListener('pointerdown',event=>{
   const handle=event.target.closest('[data-cr-resize]');if(!handle||event.button!==0)return;
   event.preventDefault();event.stopPropagation();
   const id=handle.dataset.crResize,start=event.clientX,width=this.layout.widths[id],header=handle.closest('th');
   this.resizing=true;header.draggable=false;this.element.classList.add('cr-resizing');this.layoutAbort?.abort();this.layoutAbort=new AbortController();
   const options={signal:this.layoutAbort.signal};
   this.doc.addEventListener('pointermove',move=>{this.layout.widths[id]=Math.min(1200,Math.max(90,width+move.clientX-start));this.applyWidths();},options);
   const finish=()=>{this.layoutAbort.abort();this.resizing=false;header.draggable=true;this.element.classList.remove('cr-resizing');this.saveLayout();this.draw();};
   this.doc.addEventListener('pointerup',finish,{...options,once:true});this.doc.addEventListener('pointercancel',finish,{...options,once:true});
  });
  table.querySelector('thead').addEventListener('dblclick',event=>{const handle=event.target.closest('[data-cr-resize]');if(!handle)return;const id=handle.dataset.crResize;this.layout.widths[id]=CONTACT_COLUMNS.find(column=>column.id===id).width;this.applyWidths();this.saveLayout();});
  table.querySelector('thead').addEventListener('keydown',event=>{
   const handle=event.target.closest('[data-cr-resize]');
   if(handle&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const id=handle.dataset.crResize;this.layout.widths[id]=Math.min(1200,Math.max(90,this.layout.widths[id]+(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?40:10)));this.applyWidths();this.saveLayout();return;}
   const header=event.target.closest('th[data-cr-column]');if(!header||!event.altKey||!['ArrowLeft','ArrowRight'].includes(event.key))return;
   event.preventDefault();const id=header.dataset.crColumn,index=this.layout.order.indexOf(id),target=this.layout.order[index+(event.key==='ArrowLeft'?-1:1)];
   if(target){this.layout=moveContactColumn(this.layout,id,target,event.key==='ArrowRight');this.applyLayout();this.saveLayout();header.focus();}
  });
  table.querySelector('thead').addEventListener('dragstart',event=>{const header=event.target.closest('th[data-cr-column]');if(!header||this.resizing||event.target.closest('[data-cr-resize]')){event.preventDefault();return;}this.dragColumn=header.dataset.crColumn;event.dataTransfer.setData('text/plain',this.dragColumn);event.dataTransfer.effectAllowed='move';header.classList.add('cr-dragging');});
  table.querySelector('thead').addEventListener('dragover',event=>{if(this.dragColumn&&event.target.closest('th[data-cr-column]')){event.preventDefault();event.dataTransfer.dropEffect='move';}});
  table.querySelector('thead').addEventListener('drop',event=>{const header=event.target.closest('th[data-cr-column]');if(!header||!this.dragColumn)return;event.preventDefault();this.layout=moveContactColumn(this.layout,this.dragColumn,header.dataset.crColumn,event.clientX>header.getBoundingClientRect().left+header.getBoundingClientRect().width/2);this.dragColumn=null;table.querySelectorAll('.cr-dragging').forEach(node=>node.classList.remove('cr-dragging'));this.applyLayout();this.saveLayout();this.draw();});
  table.querySelector('thead').addEventListener('dragend',()=>{this.dragColumn=null;table.querySelectorAll('.cr-dragging').forEach(node=>node.classList.remove('cr-dragging'));this.draw();});
  this.applyLayout();
 }
  saveLayout(){try{const value=JSON.stringify(this.layout);if(this.path===PATH)this.navigation.storage.setItem(CONTACT_LAYOUT_KEY,value);else this.navigation.storage.setItem(`${CONTACT_LAYOUT_KEY}:${this.path}`,value);}catch{this.warning('Column layout could not be saved. Browser storage may be full.');}}
 applyLayout(){
  const table=this.element.querySelector('table'),order=this.layout.order;
  for(const container of [table.querySelector('colgroup'),...table.querySelectorAll('tr')]){
   const cells=new Map([...container.children].map(node=>[node.dataset.crColumn,node]));
   for(const id of order){const node=cells.get(id);if(node)container.append(node);}
  }
  this.applyWidths();
 }
 applyWidths(){
  const table=this.element.querySelector('table'),widths=this.layout.widths;
  for(const col of table.querySelectorAll('col'))col.style.width=`${widths[col.dataset.crColumn]}px`;
  const total=this.layout.order.reduce((sum,id)=>sum+widths[id],0);table.style.width=`${total}px`;table.style.minWidth=`${total}px`;
  for(const handle of table.querySelectorAll('[data-cr-resize]'))handle.setAttribute('aria-valuenow',String(Math.round(widths[handle.dataset.crResize])));
  this.syncScrollbar();
 }
 syncScrollbar(){if(!this.scrollbar||!this.active)return;const wrap=this.element.querySelector('.cr-table-wrap');this.scrollbar.firstElementChild.style.width=`${Math.max(this.scrollbar.clientWidth,wrap.scrollWidth+this.scrollbar.clientWidth-wrap.clientWidth)}px`;if(this.scrollbar.scrollLeft!==wrap.scrollLeft)this.scrollbar.scrollLeft=wrap.scrollLeft;}
 warning(message){if(this.active)this.element.querySelector('[data-cr-warning]').textContent=message;}
 changeFilter(field){this.filters[field.dataset.crFilter]=field.type==='checkbox'?field.checked:field.value;this.saveFilters();this.draw();}
 saveFilters(){try{this.navigation.storage.setItem(scopedKey(KEY,this.path),JSON.stringify(this.filters));}catch{this.warning('Filters could not be saved. Browser storage may be full; company data is unchanged.');}}
 workflows(){try{const value=JSON.parse(this.navigation.storage.getItem(`oplatform:${this.path}:detail-workflow`)||'{}');if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{this.warning('Saved local contact additions could not be read. Nothing has been overwritten.');return {};}}
 async refresh(){
  if(!this.active||this.controller)return;
  if(this.path==='/h2-projects'){
   this.verification.results=this.verification.results||{};
   this.syncCompanyRows();this.draw();
   if(this.liveIndicator){this.liveIndicator.textContent='● Local H2 project records';this.liveIndicator.classList.remove('cr-stale');}
   return;
  }
  const generation=this.generation,controller=new AbortController();this.controller=controller;
  const timeout=setTimeout(()=>controller.abort(),14000);
  try{
   const response=await fetch('/api/investors-jv/contact-directory',{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Directory unavailable');const data=await response.json();
   if(!Array.isArray(data.companies))throw Error('Invalid directory');
   if(!this.active||generation!==this.generation)return;
   this.companies=data.companies;this.verification.results=data.results||{};
   this.syncCompanyRows();this.draw();
   const live=this.liveIndicator;live.classList.toggle('cr-stale',!!data.stale);
   live.textContent=`${data.stale?'Saved snapshot':'● Live'} · synced ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;
   this.warning(data.error||'');
  }catch{
   if(this.active&&generation===this.generation){const live=this.liveIndicator;live.textContent='Refresh unavailable · showing saved records';live.classList.add('cr-stale');this.warning('Connection interrupted. Existing rows remain visible; refresh will retry automatically.');}
  }finally{clearTimeout(timeout);if(this.controller===controller)this.controller=null;}
 }
 async verifyAllContactEmails(){
  if(!this.active||this.verifyingAll)return;
  this.verifyingAll=true;
  try{
   const workflows=this.workflows();
   const emails=[...new Set(this.companies.flatMap(company=>[
    ...(company.contacts||[]),...(Array.isArray(workflows[company.id]?.contactsAdded)?workflows[company.id].contactsAdded:[])
   ].flatMap(contact=>[
    contact.email,...(contact.emails||[]).map(item=>typeof item==='string'?item:item.email),...(contact.corporateRoutes||[]).map(item=>item.email)
   ]).map(email=>this.verification.normalize(email)).filter(Boolean)))];
   const pending=emails.filter(email=>!this.verification.result(email)||this.verification.stale(this.verification.result(email)));
   if(!pending.length){if(this.liveIndicator)this.liveIndicator.textContent='● Reoon current · all email routes checked';return;}
   let connection=this.verification.connection;
   if(!connection){try{connection=await this.verification.request('/api/reoon/status',{},10000);this.verification.setConnection(connection);}catch(error){this.warning(`Automatic Reoon verification stopped: ${error.message}`);return;}}
   if(!connection?.connected){this.warning(`Automatic Reoon verification stopped: ${connection?.error||'Reoon is not connected.'}`);return;}
   for(let index=0;index<pending.length;index+=5){
    if(!this.active)return;
    const batch=pending.slice(index,index+5);
    if(this.liveIndicator)this.liveIndicator.textContent=`● Reoon verifying ${Math.min(index+batch.length,pending.length)} of ${pending.length} email routes…`;
    try{
     const data=await this.verification.request('/api/reoon/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emails:batch,refresh:true,context:{module:this.path,recordId:'contact-control-room',name:'Automatic contact verification',provenance:'contact-control-room-default'}})});
     for(const result of data.results||[])this.verification.results[this.verification.normalize(result.email)]=result;
     document.dispatchEvent(new Event('reoon-results-updated'));
    }catch(error){this.warning(`Reoon verification stopped after ${index} of ${pending.length} email routes: ${error.message}`);return;}
   }
   if(this.liveIndicator)this.liveIndicator.textContent=`● Reoon checked ${pending.length} email routes`;
  }finally{this.verifyingAll=false;}
 }
 syncCompanyRows(){
  const existing=new Map(this.app.rows.map(row=>[row.id,row]));
  const rows=this.companies.map(company=>{const previous=existing.get(company.id)||{};return {...previous,id:company.id,partner:company.company,country:company.country,intent:company.intent,scale:company.scale,status:company.status,latestEvidence:company.latestEvidence,intentStrength:company.intentStrength,evidenceDate:company.evidenceDate||company.latestEvidence,contacts:company.contacts,source:{...previous.source,...company,name:company.company,developer:company.partnerType,capacity:company.scale,technology:company.subSector,signal:company.status,partnership:company.intent,contacts:company.contacts,gaps:company.notes?[company.notes]:[],sources:(company.sources||[]).map(item=>typeof item==='string'?{url:item,title:'Research source',date:'Publication date: see source'}:item)}};});
  this.app.rows=rows;this.app.pipeline.rows=rows;this.app.sidebar.rows=rows;
  const total=this.navigation.root.querySelector('#total');if(total)total.textContent=String(rows.length);
 }
 draw(){
  if(!this.active||this.resizing||this.dragColumn)return;
  const rows=buildContactRows(this.companies,this.workflows(),this.verification.results),filtered=filterContactRows(rows,this.filters);
  const options=(field,values,label)=>{
   const select=this.element.querySelector(`[data-cr-filter="${field}"]`),next=`<option value="">${label}</option>`+[...new Set([...values,this.filters[field]].filter(Boolean))].sort().map(value=>`<option value="${h(value)}">${h(value)}</option>`).join('');
   if(select.innerHTML!==next){select.innerHTML=next;select.value=this.filters[field]||'';}
  };
  options('country',rows.map(row=>row.country),'All origin countries');options('sector',rows.flatMap(row=>row.sectors),'All sectors');
  const uniqueEmails=items=>new Set(items.map(row=>row.email).filter(Boolean)).size;
  this.element.querySelector('[data-cr-metric-values]').innerHTML=`<span class="cr-metric"><strong>${this.companies.length}</strong>companies</span><span class="cr-metric"><strong>${new Set(rows.filter(row=>row.hasContact).map(row=>`${row.companyId}|${row.name}`)).size}</strong>contact entries</span><span class="cr-metric"><strong>${uniqueEmails(rows.filter(row=>row.verification.verified))}</strong>green-tick emails</span><span class="cr-metric"><strong>${new Set(rows.filter(row=>row.priority).map(row=>row.companyId)).size}</strong>priority companies</span><span class="cr-metric"><strong>${new Set(rows.filter(row=>row.linkedin).map(row=>row.linkedin)).size}</strong>LinkedIn profiles</span>`;
  const html=filtered.map(row=>`<tr${row.priority?' class="cr-priority"':''}>${CONTACT_COLUMNS.map(column=>renderContactCell(row,column.id,this.path)).join('')}</tr>`).join('')||'<tr><td colspan="8" class="cr-empty">No contacts match these filters. Clear filters to see all companies.</td></tr>';
  // No periodic replacement of search fields, table scroll or unchanged links.
  if(html!==this.drawn){this.element.querySelector('[data-cr-rows]').innerHTML=html;this.drawn=html;this.applyLayout();}
  this.element.querySelector('[data-cr-count]').textContent=`${filtered.length} connection rows · ${new Set(filtered.map(row=>row.companyId)).size} companies shown · ${uniqueEmails(filtered)} unique emails`;
 }
}

export function installContactControlRoom({navigation,SidebarController,EmailVerification}){
 const renderShell=SidebarController.prototype.renderShell;
 SidebarController.prototype.renderShell=function(...args){
  const result=renderShell.apply(this,args);
  if(PATHS.has(this.path))this.root.querySelector('#portfolio-button')?.insertAdjacentHTML('afterend',`<button type="button" class="contact-room-nav" data-contact-room-open data-contact-room-path="${this.path}">◎ &nbsp; Contact Control Room</button>`);
  return result;
 };
 const link=document.createElement('link');link.rel='stylesheet';link.href='/modules/investors-jv/contact-room.css';document.head.append(link);
 navigation.contactRoom=new ContactControlRoom({navigation,verification:EmailVerification});
}
