import {listedProjects} from './data/source.js';
import {bankabilityReview,bankabilityValues,bankabilityDocuments,bankabilityDocumentUrl} from './data/bankability.js';
// Module-owned content adapter. All layout, typography, tables and navigation stay shared.
export const listedColumns=['Project','Owner','Country','Technology','Capacity','CAPEX','Bankability','Stage','Annual generation','Review','Offtake Agreement','Bank / Lender','Financing secured','Outstanding requirements','Bankability documents','Loan / Equity (%)','Loan tenor / Repayment'];
export function migrateBankabilityColumns(storage){
 const prefix='oplatform:/listed-projects:',keys=['column-order','visible-columns'];
 const before=keys.map(key=>[prefix+key,storage.getItem(prefix+key)]);
 const order=JSON.parse(before[0][1]||'null'),visible=JSON.parse(before[1][1]||'null');
 const valid=(list,count)=>Array.isArray(list)&&new Set(list).size===list.length&&list.every(index=>Number.isInteger(index)&&index>=0&&index<count);
 if(order!==null&&(![8,10,11,17].includes(order.length)||!valid(order,order.length)))throw Error('Saved column order needs review.');
 if(visible!==null&&!valid(visible,17))throw Error('Saved column visibility needs review.');
 if(order?.length===17)return;
 const previous=order||Array.from({length:11},(_,i)=>i);
 const next=[...previous,...Array.from({length:17},(_,i)=>i).filter(i=>!previous.includes(i))];
 const shown=visible===null?next:[...new Set([...visible,...(previous.length<=10?[10]:[]),11,12,13,14,15,16])];
 const backup='oplatform-listed-bankability-layout-backup-v1';
 if(!storage.getItem(backup))storage.setItem(backup,JSON.stringify(before));
 try{storage.setItem(before[0][0],JSON.stringify(next));storage.setItem(before[1][0],JSON.stringify(shown));}
 catch(error){for(const [key,value]of before){try{value===null?storage.removeItem(key):storage.setItem(key,value);}catch{}}throw error;}
}
function bankabilityLinks(view,record){return bankabilityReview(record).documents.map(key=>{const d=bankabilityDocuments[key];return `<a href="${bankabilityDocumentUrl(key)}" target="_blank" rel="noopener" title="${view.escape(`${d.title}; ${d.date}; pages ${d.pages}`)}">${view.escape(`${d.title} (${d.date})`)}</a>`;}).join('<br>')||'No evidence found';}
export function offtakeStatus(row){return (row.source||row).offtakeAgreement?.status||'Not disclosed';}
export function migrateOfftakeColumn(storage){
 const prefix='oplatform:/listed-projects:',keys=['column-order','visible-columns'];
 const before=keys.map(key=>[prefix+key,storage.getItem(prefix+key)]);
 const order=JSON.parse(before[0][1]||'null'),visible=JSON.parse(before[1][1]||'null');
 const valid=(list,count)=>Array.isArray(list)&&new Set(list).size===list.length&&list.every(index=>Number.isInteger(index)&&index>=0&&index<count);
 if(order!==null&&(!valid(order,order.length)||![8,10,11].includes(order.length)))throw Error('Saved listed-project column order needs review.');
 if(order?.length===11)return; // Includes an intentional later show/hide or reorder decision.
 if(visible!==null&&!valid(visible,11))throw Error('Saved listed-project column visibility needs review.');
 const originalOrder=order||Array.from({length:10},(_,index)=>index);
 const nextOrder=[...originalOrder,...Array.from({length:11},(_,index)=>index).filter(index=>!originalOrder.includes(index))];
 const nextVisible=visible===null?Array.from({length:11},(_,index)=>index):[...new Set([...visible,10])];
 const backupKey='oplatform-listed-offtake-layout-backup-v1';
 if(!storage.getItem(backupKey))storage.setItem(backupKey,JSON.stringify(before));
 try{storage.setItem(before[0][0],JSON.stringify(nextOrder));storage.setItem(before[1][0],JSON.stringify(nextVisible));}
 catch(error){for(const [key,value]of before){try{value===null?storage.removeItem(key):storage.setItem(key,value);}catch{}}throw error;}
}
export function isListedProjectOnHold(record){return !!(record?.source||record)?.onHold;}
// Stable within each country: preserve saved/manual order, but never split a
// country block. Croatia is last; Ceric precedes the disabled Cernik final row.
export function groupListedProjects(list){
 const country=row=>String(row.country||(row.source||row).country||'Not recorded');
 const lastRank=row=>row.id==='cernik-croatia-pv'?2:row.id==='ceric-croatia-pv'?1:0;
 return [...list].sort((a,b)=>{
  const aCountry=country(a),bCountry=country(b);
  return Number(aCountry==='Croatia')-Number(bCountry==='Croatia')||aCountry.localeCompare(bCountry)||lastRank(a)-lastRank(b);
 });
}
export function disableHeldProjectLinks(root,rows){
 for(const row of rows.filter(isListedProjectOnHold))for(const button of root.querySelectorAll('[data-record]')){
  if(button.dataset.record!==row.id)continue;
  button.disabled=true;button.setAttribute('aria-disabled','true');button.title=(row.source||row).holdReason||'On hold';
  if(button.classList.contains('table-open'))button.textContent='On hold';
 }
}
export function installListedRowFocus(pipeline){
 const table=pipeline.root.querySelector?.('table');if(!table)return;
 table.classList.add('listed-focus-table');
 const rows=[...table.querySelectorAll('tbody tr')].filter(row=>row.querySelector('.table-project-name'));
 if(!rows.length)return;
 for(const [index,row]of rows.entries()){
  row.dataset.listedRecord=row.querySelector('[data-star]')?.dataset.star||String(index);
  row.tabIndex=-1;
 }
 const mark=row=>{
  for(const item of rows){item.classList.toggle('listed-row-focused',item===row);item.tabIndex=item===row?0:-1;}
  pipeline.focusedListedRecord=row.dataset.listedRecord;
 };
 const saved=rows.find(row=>row.dataset.listedRecord===pipeline.focusedListedRecord);
 if(saved)mark(saved);else rows[0].tabIndex=0;
 const scroll=row=>{
  const wrap=table.closest('.table-wrap'),left=wrap?.scrollLeft;
  row.scrollIntoView({block:'nearest',inline:'nearest'});
  if(wrap)wrap.scrollLeft=left;
 };
 const open=row=>{
  if(row.querySelector('button.table-open:not(:disabled)'))pipeline.sidebar.onRecord(row.dataset.listedRecord);
 };
 table.addEventListener('focusin',event=>{const row=event.target.closest('tbody tr');if(rows.includes(row))mark(row);});
 table.addEventListener('click',event=>{
  const row=event.target.closest('tbody tr');if(!rows.includes(row))return;
  mark(row);
  if(event.target.closest('[data-record]')){event.preventDefault();event.stopPropagation();row.focus({preventScroll:true});return;}
  if(!event.target.closest('button,a,input,select,textarea,[contenteditable="true"]'))row.focus({preventScroll:true});
 },true);
 table.addEventListener('dblclick',event=>{
  const row=event.target.closest('tbody tr');if(!rows.includes(row)||event.target.closest('[data-star],a,input,select,textarea,[contenteditable="true"]'))return;
  event.preventDefault();event.stopPropagation();mark(row);open(row);
 },true);
 table.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.target.closest('input,select,textarea,[contenteditable="true"]'))return;
  const row=event.target.closest('tbody tr'),index=rows.indexOf(row);if(index<0)return;
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();const next=rows[Math.max(0,Math.min(rows.length-1,index+(event.key==='ArrowDown'?1:-1)))];
   mark(next);next.focus({preventScroll:true});scroll(next);
  }else if(event.key==='Enter'&&(event.target===row||event.target.closest('[data-record]'))){
   event.preventDefault();event.stopPropagation();open(row);
  }
 });
}
export function installListedProjectViews({OpportunityPlatformApp:App,PipelineView:Pipeline,SidebarController:Sidebar,PlatformNavigation:Navigation}){
 if(Sidebar){
  const ordered=Sidebar.prototype.ordered;
  Sidebar.prototype.ordered=function(list){const result=ordered.call(this,list);return this.path==='/listed-projects'?groupListedProjects(result):result;};
  const renderSidebar=Sidebar.prototype.render;Sidebar.prototype.render=function(...args){const result=renderSidebar.apply(this,args);if(this.path==='/listed-projects')disableHeldProjectLinks(this.root,this.rows);return result;};
 }
 if(Navigation){const go=Navigation.prototype.go;Navigation.prototype.go=function(target,...args){
  if(target?.path==='/listed-projects'&&listedProjects.some(record=>record.id===target.id&&record.onHold))return go.call(this,{...target,id:null,tab:'overview'},...args);
  return go.call(this,target,...args);
 };}
 const open=App.prototype.openRecord;
 App.prototype.openRecord=function(id){if(this.path==='/listed-projects'&&listedProjects.some(record=>record.id===id&&record.onHold))return;return open.call(this,id);};
 const values=Pipeline.prototype.values;
 Pipeline.prototype.values=function(row){return this.path==='/listed-projects'?[row.project,row.source?.source?.type==='User-supplied portfolio summary'?row.owner:`${row.owner} (user-reported)`,row.country,row.technology,row.capacity,row.capex,bankabilityReview(row).status,row.stage,row.annualGeneration,isListedProjectOnHold(row)?'On hold':'Open',offtakeStatus(row),...bankabilityValues(row)]:values.call(this,row);};
 const cell=Pipeline.prototype.cell,render=Pipeline.prototype.render;
 Pipeline.prototype.cell=function(row,value,index){
  if(this.path==='/listed-projects'&&index===14)return `<td><span class="table-cell-content" title="${this.escape(bankabilityReview(row).scope)}">${bankabilityLinks(this,row)}</span></td>`;
  if(this.path==='/listed-projects'&&isListedProjectOnHold(row)){
   const html=cell.call(this,row,value,index);
   return html.replace(/(<button\b[^>]*?)\sdata-record="[^"]*"/g,'$1 disabled aria-disabled="true"').replace(/>Open ↗<\/button>/g,'>On hold</button>');
  }
  if(this.path!=='/listed-projects'||this.columns()[index]!=='Offtake Agreement')return cell.call(this,row,value,index);
  const record=row.source||row;
  const evidence=record.offtakeAgreement?.evidence||'No agreement evidence disclosed in the stored project record.';
  return `<td><span class="table-cell-content" title="${this.escape(evidence)}">${this.escape(value)}</span></td>`;
 };
 Pipeline.prototype.render=function(...args){
  if(this.path==='/listed-projects'){
   try{migrateBankabilityColumns(localStorage);}catch{this.root.innerHTML='<p role="alert">Bankability columns could not load safely. Saved layout is retained; check browser storage and reload.</p>';return;}
   if(this.columnOrder?.length!==listedColumns.length)this.columnOrder=null;
  }
  const result=render.apply(this,args);
  if(this.path==='/listed-projects'){disableHeldProjectLinks(this.root,this.rows||[]);installListedRowFocus(this);}
  return result;
 };
 const overview=App.prototype.renderWindOverview;
 App.prototype.renderWindOverview=function(record){
  if(this.path!=='/listed-projects')return overview.call(this,record);
  const card=(heading,body)=>`<section class="wind-detail-panel"><h2>${this.escape(heading)}</h2>${body}</section>`;
  const facts=this.detailGrid([['Project verification',record.projectVerification||'Not recorded'],['Owner',record.owner],['Ownership basis',record.ownerBasis],['Legal SPV',record.legalSpv],['Capacity',record.capacity],['CAPEX',record.capex],['Bankability',bankabilityReview(record).status],['Annual generation',record.annualGeneration],['Development stage',record.stage],['Offtake Agreement',offtakeStatus(record)]]);
  const state=this.windWorkflow(this.detailRecordId),status={queued:'Queued',running:'Running',completed:'Completed',review:'Needs review'}[state.researchStatus]||'Not started';
  return `<div class="wind-overview-layout"><div class="wind-overview-main">${card('Investment snapshot',`<div class="wind-overview-snapshot"><p class="wind-detail-summary">${this.escape(record.summary)}</p>${facts}</div>`)}${card('Deep research · Overview',`<p>${this.escape(status)}. Imported one-pager claims require supporting documents and independent review.</p><button type="button" class="primary" data-detail-action="start-research">Start Overview research →</button>`)}${card('What needs to be established',this.detailList(record.gaps))}</div><aside class="wind-overview-side">${card('Recommended next step',`<p>${this.escape(record.next)}</p><button type="button" class="primary" data-detail-action="outreach">Prepare an enquiry →</button>`)}${card('Research discipline',`<p>Listing selection is not lender approval, completed RTB, a signed PPA or an independently verified offering mandate.</p><p>${this.escape(record.ownerBasis)}</p><p>Source projections are not guaranteed returns.</p><button type="button" class="quiet" data-detail-action="checklist">Review checklist</button>`)}</aside></div>`;
 };
 const panel=App.prototype.renderWindPanel;
 App.prototype.renderWindPanel=function(record,tab){
  if(this.path!=='/listed-projects'||tab!=='project')return panel.call(this,record,tab);
  const card=(heading,body,modifier='')=>`<section class="wind-detail-panel ${modifier}"><h2>${this.escape(heading)}</h2>${heading==='Bankability & financing readiness'?this.detailGrid(reviewedFacts)+`<p>${bankabilityLinks(this,record)}</p><details><summary>Original listing snapshot (before document review)</summary>${body}</details>`:body}</section>`;
  const b=bankabilityReview(record);
  const reviewedFacts=[['Reviewed bankability status',b.status],['Bank / Lender',b.lender],['Financing secured',b.financing],['Evidence scope',b.scope],['Loan / Equity (%)',b.loanEquity],['Loan tenor / Repayment',b.tenor],['Outstanding requirements',b.requirements],['Last reviewed',b.reviewed]];
  return card('Project facts',this.detailGrid([['Project verification',record.projectVerification||'Not recorded'],['Project',record.name],['Owner',record.owner],['Ownership basis',record.ownerBasis],['Legal SPV',record.legalSpv],['Country / location',`${record.country} - ${record.location}`],['Technology',record.technology],['Reported capacity',record.capacity],['Annual generation',record.annualGeneration],['Turbines',record.turbines||'Not applicable - Solar PV'],['Specific yield',record.yield||'Not stated'],['Development status',record.stage],['Permits / land',record.permits],['Grid connection',record.gridConnection],['Commercial operation','COD not supplied'],['Source document date',record.document.date?`${record.document.date} (filename)`:'Undated summary workbook'],['Document as-of period',record.document.asOf||'Not stated'],['Source branding',record.sourceBrand],['Independent verification','Not performed']]),'wind-project-facts')+card('Bankability & financing readiness',this.detailGrid(record.bankabilityFacts))+card('Evidence gaps',this.detailList(record.gaps),'wind-evidence-gaps');
 };
 const financials=App.prototype.renderFinancialsPanel;
 App.prototype.renderFinancialsPanel=function(record,card){
  const markup=financials.call(this,record,card);if(this.path!=='/listed-projects')return markup;
  const gaps=(record.gaps||[]).filter(value=>/reconciliation|NPV|OPEX|capacity conflict|filename date/i.test(value));
  return markup.replace('including wind yield','including solar or wind yield').replace('</div><aside class="wind-financials-side">',`${card('Source clarifications',this.detailList(gaps))}</div><aside class="wind-financials-side">`);
 };
 const outreach=App.prototype.renderOutreachPanel;
 App.prototype.renderOutreachPanel=function(record){
  const markup=outreach.call(this,record);if(this.path!=='/listed-projects'||this.windWorkflow(this.detailRecordId).outreachDraft)return markup;
  const draft=`Subject: ${record.name} - project documentation and partnership scope\n\nDear We Green Energo Team,\n\nWe are reviewing ${record.name}, ${record.capacity}, in ${record.country}, for potential investment or collaboration.\n\nPlease confirm current availability, the legal owning SPV and your authority to represent the project; the proposed transaction structure and equity requirement; outstanding development milestones; and the status of land rights, permits, grid connection and offtake.\n\nWe would welcome a current non-confidential brief and a reconciliation of the one-pager assumptions, followed by the financial model and supporting documentation under appropriate confidentiality arrangements. Please also clarify whether independent technical or lender due diligence has been completed.\n\nKind regards,`;
  return markup.replace(/(<textarea id="outreach-draft"[^>]*>)[\s\S]*?(<\/textarea>)/,(_,open,close)=>open+this.escape(draft)+close);
 };
}
