import {OpportunityPlatformApp,SidebarController,PipelineView} from './platform-app.js';
import {PulseSendController} from './pulse-send-panel.js';

const TABS=new Set(['overview','project','partnership','financials','diligence','evidence','history','contacts','sources','outreach']);
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);

export function parseRoute(url,workspaces){
 if(!own(workspaces,url.pathname))return null;
 const hash=url.hash.replace(/^#/,'');
 if(!hash||hash==='portfolio')return {path:url.pathname,id:null,tab:'overview'};
 const match=hash.match(/^record\/([^/]+)(?:\/([^/]+))?$/);
 if(!match||!TABS.has(match[2]||'overview'))return {path:url.pathname,id:null,tab:'overview',invalid:true};
 try{return {path:url.pathname,id:decodeURIComponent(match[1]),tab:match[2]||'overview'};}catch{return {path:url.pathname,id:null,tab:'overview',invalid:true};}
}
export const routeUrl=route=>`${route.path}#${route.id?`record/${encodeURIComponent(route.id)}/${route.tab}`:'portfolio'}`;

/** Pending edits are deliberately separate from saved workflow/contact records. */
export class NavigationDrafts {
 constructor(storage){this.storage=storage;this.cache=new Map();this.failures=new Set();}
 get failed(){return this.failures.size>0;}
 set failed(value){if(value)this.failures.add('module-state');else this.failures.delete('module-state');}
 key(route){return `oplatform-navigation-drafts-v1:${route.path}:${encodeURIComponent(route.id||'portfolio')}:${route.tab}`;}
 read(route){const key=this.key(route);if(this.cache.has(key))return this.cache.get(key);let value={};try{value=JSON.parse(this.storage.getItem(key)||'{}');}catch{}if(!value||typeof value!=='object'||Array.isArray(value))value={};this.cache.set(key,value);return value;}
 write(route,value){const key=this.key(route);this.cache.set(key,value);try{this.storage.setItem(key,JSON.stringify(value));this.failures.delete(key);return true;}catch{this.failures.add(key);return false;}}
 field(route,id,value){if(!route?.id||!id||['__proto__','prototype','constructor'].includes(id))return;const entry=this.read(route);this.write(route,{...entry,fields:{...entry.fields,[id]:value}});}
 clear(route,ids){const entry=this.read(route),fields={...entry.fields};for(const id of ids)delete fields[id];this.write(route,{...entry,fields});}
}

/** Single shell, URL owner and navigation lifetime for all portfolio modules. */
export class PlatformNavigation {
 constructor({root,workspaces,loadModule,window:browser=window,storage=localStorage}){
  Object.assign(this,{root,workspaces,loadModule,browser,storage});this.drafts=new NavigationDrafts(storage);this.modules=new Map();this.current=null;this.sequence=0;this.rendering=false;
 }
 backup(){
  const key='oplatform-navigation-backup:before-shared-navigation-v1';
  if(this.storage.getItem(key))return;
  const state={};for(let index=0;index<this.storage.length;index++){const name=this.storage.key(index);if(name&&!name.startsWith('oplatform-navigation-backup:')&&(/^(oplatform|en590)/.test(name)))state[name]=this.storage.getItem(name);}
  this.storage.setItem(key,JSON.stringify({at:new Date().toISOString(),state}));
 }
 async start(){
  this.backup();
  this.browser.history.scrollRestoration='manual';
  const locationChanged=()=>{const route=parseRoute(new URL(this.browser.location.href),this.workspaces);if(route)this.go(route,{history:false});};
  this.browser.addEventListener('popstate',locationChanged);
  this.browser.addEventListener('hashchange',locationChanged);
  this.browser.addEventListener('beforeunload',event=>{this.remember();if(this.drafts.failed){event.preventDefault();event.returnValue='';}});
  this.root.addEventListener('input',event=>this.captureField(event.target));
  this.root.addEventListener('change',event=>this.captureField(event.target));
  this.root.addEventListener('keydown',event=>this.tabKey(event));
  return this.go(parseRoute(new URL(this.browser.location.href),this.workspaces)||{path:'/wind-projects',id:null,tab:'overview'},{history:false});
 }
 captureField(field){
  if(!this.current?.id||!field.id||!field.closest?.('#content')||!['INPUT','TEXTAREA','SELECT'].includes(field.tagName)||['file','password'].includes(field.type))return;
  this.drafts.field(this.current,field.id,{value:field.value,checked:field.checked});
 }
 remember(){
  if(!this.current||!this.app)return;
  const content=this.root.querySelector('#content'),entry=this.drafts.read(this.current),active=content?.contains(this.root.ownerDocument.activeElement)?this.root.ownerDocument.activeElement:null;
  const scrolls=[...(content?.querySelectorAll('.table-wrap,.partner-table-wrap,.pipeline-table-shell,.en590-refinery-table-wrap')||[])].map(node=>({left:node.scrollLeft,top:node.scrollTop}));
  this.drafts.write(this.current,{...entry,top:content?.scrollTop||0,windowTop:this.browser.scrollY||0,scrolls,focus:active?.id||null,selectionStart:active?.selectionStart,selectionEnd:active?.selectionEnd,formOpen:content?.querySelector('[data-contact-form]')?.hidden===false});
  const moduleState={last:{...this.current},page:this.app.pipeline.page,pageSize:this.app.pipeline.pageSize,sidebarTop:this.app.sidebar.list.scrollTop};
  this.modules.set(this.current.path,moduleState);
  try{this.storage.setItem(`oplatform-navigation-state:${this.current.path}`,JSON.stringify(moduleState));this.drafts.failed=false;}catch{this.drafts.failed=true;}
 }
 restore(){
  const content=this.root.querySelector('#content'),entry=this.drafts.read(this.current);
  for(const [id,saved]of Object.entries(entry.fields||{})){
   const field=[...content.querySelectorAll('input[id],textarea[id],select[id]')].find(node=>node.id===id);
   if(!field||!saved||typeof saved.value!=='string')continue;field.value=saved.value;
   if(['checkbox','radio'].includes(field.type))field.checked=saved.checked===true;
  }
  const form=content.querySelector('[data-contact-form]');if(form&&entry.formOpen){form.hidden=false;const toggle=content.querySelector('[data-contact-form-toggle]');if(toggle)toggle.textContent='Cancel';}
  content.scrollTop=entry.top||0;this.browser.scrollTo?.({top:entry.windowTop||0,behavior:'instant'});
  [...content.querySelectorAll('.table-wrap,.partner-table-wrap,.pipeline-table-shell,.en590-refinery-table-wrap')].forEach((node,index)=>{node.scrollLeft=entry.scrolls?.[index]?.left||0;node.scrollTop=entry.scrolls?.[index]?.top||0;});
  const active=entry.focus&&[...content.querySelectorAll('[id]')].find(node=>node.id===entry.focus);
  if(active){active.focus({preventScroll:true});try{active.setSelectionRange(entry.selectionStart,entry.selectionEnd);}catch{}}
 }
 status(message,{retry=false}={}){
  let status=this.root.querySelector('[data-navigation-status]');
  if(!status){status=this.root.ownerDocument.createElement('div');status.dataset.navigationStatus='';status.className='navigation-status';status.setAttribute('role','status');(this.root.querySelector('main')||this.root).prepend(status);}
  status.replaceChildren();status.append(message);status.hidden=false;
  if(retry){const button=this.root.ownerDocument.createElement('button');button.type='button';button.textContent='Retry';button.addEventListener('click',()=>this.go(this.pending,{history:this.pendingHistory}));status.append(' ',button);}
 }
 clearStatus(){const status=this.root.querySelector('[data-navigation-status]');if(status)status.hidden=true;}
 module(path){
  if(path==='/nda-guard'){
   this.remember();if(this.drafts.failed&&!this.browser.confirm('Pending edits could not be saved to browser storage. Leave this app anyway?'))return;
   this.browser.location.assign(path);return;
  }
  if(!own(this.workspaces,path))return;
  if(path===this.current?.path){this.cancelPending();return;}
  return this.go(this.modules.get(path)?.last||{path,id:null,tab:'overview'});
 }
 cancelPending(){this.sequence++;this.pending=null;this.clearStatus();const select=this.root.querySelector('#module-select');if(select&&this.current)select.value=this.current.path;}
 async go(target,{history=true}={}){
  if(!target||!own(this.workspaces,target.path))return false;
  if(this.current&&routeUrl(this.current)===routeUrl(target)&&this.app){this.cancelPending();return true;}
  const ticket=++this.sequence;this.remember();this.pending=target;this.pendingHistory=history;
  if(!this.app||this.app.path!==target.path){
   this.status(`Loading ${this.workspaces[target.path].name}…`);
   let rows;try{rows=await this.loadModule(target.path);}catch(error){if(ticket!==this.sequence)return false;this.status(`Could not load ${this.workspaces[target.path].name}. Your current workspace is unchanged.`,{retry:true});const select=this.root.querySelector('#module-select');if(select&&this.current)select.value=this.current.path;if(!history&&this.current)this.browser.history.replaceState(null,'',routeUrl(this.current));return false;}
   if(ticket!==this.sequence)return false;
   this.remember();this.activate(target.path,rows);
  }
  if(ticket!==this.sequence)return false;
  this.clearStatus();this.pending=null;
  if(target.id&&!this.app.rows.some(row=>row.id===target.id))target={path:target.path,id:null,tab:'overview',invalid:true};
  this.current={path:target.path,id:target.id,tab:target.tab};
  this.rendering=true;
  try{
   this.app.detailRecordId=target.id;this.app.detailTab=target.tab;
   if(target.id)this.app.renderRecordDetail();else{this.app.resetBreadcrumb();this.app.pipeline.render();this.app.renderedDetailKey=null;}
  }finally{this.rendering=false;}
  const next=routeUrl(this.current);
  if(this.browser.location.pathname+this.browser.location.hash!==next)this.browser.history[history&&!target.invalid?'pushState':'replaceState'](null,'',next);
  this.restore();this.syncViewButtons();this.modules.set(target.path,{...this.modules.get(target.path),last:{...this.current}});
  if(target.invalid)this.status('That record or tab is unavailable. Showing the portfolio instead.');
  return true;
 }
 activate(path,rows){
  const body=this.root.ownerDocument.body;
  for(const route of Object.keys(this.workspaces))body.classList.remove(route.slice(1));
  body.classList.remove('partners-mode');body.classList.add('portfolio-view',path.slice(1));
  if(path==='/listed-projects')body.classList.add('wind-projects');
  if(!this.app){
   this.root.replaceChildren();
   this.app=new OpportunityPlatformApp({root:this.root,workspaces:this.workspaces,rows,path,managedNavigation:true});
   this.app.navigation=this;
  }else{
   const app=this.app;app.sidebar.destroy();app.pulse?.detach?.();
   Object.assign(app,{path,rows,workspace:this.workspaces[path],detailRecordId:null,detailTab:'overview',detailWorkflowKey:`oplatform:${path}:detail-workflow`,sendHistory:null,sendHistoryLoading:null,renderedDetailKey:null});
   const brand=this.root.querySelector('.brand');brand.href=path;brand.innerHTML=`<span class="brand-symbol">${app.escape(app.workspace.symbol)}</span><span>${app.escape(app.workspace.name.toUpperCase())}<small>${app.escape(app.workspace.description)}</small></span>`;
   app.sidebar=new SidebarController({root:this.root.querySelector('.sidebar-library'),path,workspace:app.workspace,routes:Object.entries(this.workspaces),rows,onChange:()=>this.portfolio({resetPage:true}),onRecord:id=>this.record(id),onStar:()=>this.refreshStar(),onNavigate:route=>this.module(route)});
   app.pipeline=new PipelineView({root:this.root.querySelector('#content'),path,workspace:app.workspace,rows,sidebar:app.sidebar});
  }
  const app=this.app;app.sidebar.onNavigate=route=>this.module(route);app.sidebar.onStar=()=>this.refreshStar();app.sidebar.onChange=()=>this.portfolio({resetPage:true});
  let saved=this.modules.get(path);if(!saved){try{saved=JSON.parse(this.storage.getItem(`oplatform-navigation-state:${path}`)||'null');}catch{}}
  if(saved){app.pipeline.page=Number.isInteger(saved.page)&&saved.page>0?saved.page:1;app.pipeline.pageSize=[50,100,200].includes(saved.pageSize)?saved.pageSize:50;app.sidebar.list.scrollTop=Number(saved.sidebarTop)||0;}
  this.root.querySelector('.platform-shell').classList.toggle('wind-reference-shell',['/wind-projects','/listed-projects'].includes(path));
  const view=this.root.querySelector('.view-switch'),refineries=view.querySelector('[data-view="refineries"]');
  if(path==='/diesel-en590'&&!refineries)view.insertAdjacentHTML('beforeend','<button type="button" class="view-button" data-view="refineries" aria-pressed="false">▤ Refineries</button>');else if(path!=='/diesel-en590')refineries?.remove();
  app.pulse=PulseSendController.forPath(path);app.pulse?.attach(app);app.loadSendHistory().catch(()=>{});
 }
 syncViewButtons(){this.root.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===this.app.pipeline.mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});}
 portfolio({resetPage=false,mode}={}){
  this.remember();this.cancelPending();
  if(resetPage)this.app.pipeline.page=1;
  if(mode){this.app.pipeline.mode=mode;this.app.sidebar.setViewMode(mode);}
  // View changes must render even when the existing route is already portfolio.
  if(!this.current?.id){this.app.pipeline.render();this.syncViewButtons();if(!resetPage)this.restore();return;}
  return this.go({path:this.app.path,id:null,tab:'overview'});
 }
 record(id,tab='overview'){return this.go({path:this.app.path,id,tab:TABS.has(tab)?tab:'overview'});}
 refreshStar(){
  if(!this.current?.id){this.app.pipeline.render();return;}
  const button=this.root.querySelector('[data-detail-action="star"]');if(button)button.textContent=this.app.sidebar.starred.has(this.current.id)?'★ Prioritised':'☆ Prioritise';
 }
 tabKey(event){
  if(!event.target.matches?.('[data-detail-tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const tabs=[...this.root.querySelectorAll('[data-detail-tab]')],index=tabs.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  event.preventDefault();this.record(this.current.id,tabs[next].dataset.detailTab);tabs[next].focus({preventScroll:true});
 }
}

// The existing renderers remain authoritative for content and CSS classes.
OpportunityPlatformApp.prototype.updateDetailContent=function(markup){
 const content=this.root.querySelector('#content'),key=`${this.path}:${this.detailRecordId}`,existing=content.querySelector('.record-detail-view');
 if(this.navigation&&existing&&this.renderedDetailKey===key){
  const template=this.root.ownerDocument.createElement('template');template.innerHTML=markup;
  const panel=template.content.querySelector('[role="tabpanel"]');existing.querySelector('[role="tabpanel"]').replaceChildren(...panel.childNodes);
  existing.querySelectorAll('[data-detail-tab]').forEach(button=>{const active=button.dataset.detailTab===this.detailTab;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
 }else{content.innerHTML=markup;this.renderedDetailKey=key;}
 content.querySelectorAll('[data-detail-tab]').forEach(button=>{button.tabIndex=button.dataset.detailTab===this.detailTab?0:-1;});
};
const renderDetail=OpportunityPlatformApp.prototype.renderRecordDetail;
OpportunityPlatformApp.prototype.renderRecordDetail=function(){
 if(this.navigation&&!this.navigation.rendering)return this.navigation.record(this.detailRecordId,this.detailTab);
 return renderDetail.call(this);
};
const openRecord=OpportunityPlatformApp.prototype.openRecord,showPortfolio=OpportunityPlatformApp.prototype.showPortfolio;
OpportunityPlatformApp.prototype.openRecord=function(id){return this.navigation?this.navigation.record(id):openRecord.call(this,id);};
OpportunityPlatformApp.prototype.showPortfolio=function(){return this.navigation?this.navigation.portfolio():showPortfolio.call(this);};

const saveFields={
 'save-outreach-draft':['outreach-draft'],
 'save-outreach-workflow':['outreach-stage','outreach-followup','outreach-email-status','outreach-notes'],
 'save-research-notes':['research-notes'],'save-diligence':['diligence-notes'],
 'save-contact':['contact-name','contact-title','contact-email','contact-phone','contact-linkedin','contact-role','contact-source'],
 'save-evidence':['evidence-title','evidence-type','evidence-date','evidence-url','evidence-notes','evidence-status']
};
const detailAction=OpportunityPlatformApp.prototype.handleDetailAction;
OpportunityPlatformApp.prototype.handleDetailAction=function(action){
 const navigation=this.navigation;if(!navigation)return detailAction.call(this,action);
 if(action==='star'){this.sidebar.toggle(this.detailRecordId);return;}
 if(action==='opportunity'){
  const id=this.detailRecordId;this.pipeline.opportunities[id]=this.pipeline.opportunityState({id})==='no-current'?'unconfirmed':'no-current';localStorage.setItem(this.pipeline.opportunityKey,JSON.stringify(this.pipeline.opportunities));
  const button=this.root.querySelector('[data-detail-action="opportunity"]');if(button)button.textContent=this.pipeline.opportunityState({id})==='no-current'?'⊘ Availability marked unavailable':'⊘ Mark no current opportunity';return;
 }
 if(action==='outreach'||action==='checklist')return navigation.record(this.detailRecordId,action==='outreach'?'outreach':'diligence');
 if(action==='save-contact'&&!this.root.querySelector('#contact-name')?.value.trim())return;
 if(action==='save-evidence'&&!this.root.querySelector('#evidence-title')?.value.trim())return;
 const route={...navigation.current};navigation.remember();
 // Discard only the pending copy of fields the user explicitly saved.
 // A failed save restores it; source/workflow records are never rewritten here.
 const before=navigation.drafts.read(route);
 if(saveFields[action])navigation.drafts.clear(route,saveFields[action]);
 const beforeTab=this.detailTab;
 navigation.rendering=true;
 try{return detailAction.call(this,action);}catch(error){navigation.drafts.write(route,before);throw error;}finally{
  navigation.rendering=false;
  if(this.detailTab!==beforeTab)navigation.record(this.detailRecordId,this.detailTab);
  else if(this.path===route.path&&this.detailRecordId===route.id)navigation.restore();
 }
};

export function defaultOutreachDraft(path,record){
 const name=record.name||record.company||record.partner||record.buyer||'your organisation';
 const purposes={
  '/hydrogen-offtakers':['Hydrogen offtake discussion','We are assessing potential hydrogen offtake opportunities and would welcome a non-confidential discussion about your current hydrogen use, future requirements, preferred delivery specifications and procurement process.','hydrogen procurement, decarbonisation or offtake discussions'],
  '/e-saf':['Sustainable aviation fuel discussion','We are assessing sustainable aviation fuel opportunities and would welcome a non-confidential discussion about your requirements, project scope, technical specifications and potential collaboration.','sustainable aviation fuel procurement or project partnerships'],
  '/ammonia':['Ammonia commercial discussion','We are assessing ammonia opportunities and would welcome a non-confidential discussion about your supply or offtake requirements, specifications, delivery basis and potential collaboration.','ammonia procurement, sales or partnerships'],
  '/gases':['Industrial gases commercial discussion','We are assessing industrial gas opportunities and would welcome a non-confidential discussion about the relevant products, requirements, technical specifications and potential collaboration.','industrial gas procurement, sales or partnerships'],
  '/investors-jv':['Wind investment and partnership discussion','We are exploring wind-project investment and collaboration opportunities and would welcome a non-confidential discussion about your current investment mandate, preferred geographies, project stages and partnership criteria.','renewable-energy investment or strategic partnerships']
 };
 const purpose=purposes[path];return purpose?`Subject: ${name} — ${purpose[0]}\n\nDear Team,\n\n${purpose[1]}\n\nPlease direct me to the appropriate person responsible for ${purpose[2]}.\n\nKind regards,`:null;
}
const outreachPanel=OpportunityPlatformApp.prototype.renderOutreachPanel;
OpportunityPlatformApp.prototype.renderOutreachPanel=function(record){
 const markup=outreachPanel.call(this,record),draft=defaultOutreachDraft(this.path,record);
 // Saved drafts and pending edits belong to the user and are never replaced by a template migration.
 if(!draft||this.windWorkflow(this.detailRecordId).outreachDraft)return markup;
 return markup.replace(/(<textarea id="outreach-draft"[^>]*>)[\s\S]*?(<\/textarea>)/,(_,open,close)=>open+this.escape(draft)+close);
};
