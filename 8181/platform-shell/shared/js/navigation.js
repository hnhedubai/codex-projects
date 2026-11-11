import {OpportunityPlatformApp,SidebarController,PipelineView} from './platform-app.js';
import {PulseSendController} from './pulse-send-panel.js';
import {parseDraft} from './pulse-format.js';
import {h2OutreachDraft} from '../../../modules/h2-projects/data/outreach-drafts.js';

const TABS=new Set(['overview','project','partnership','financials','diligence','evidence','history','contacts','sources','outreach']);
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);

export function parseRoute(url,workspaces){
 if(!own(workspaces,url.pathname))return null;
 const hash=url.hash.replace(/^#/,'');
 if(!hash||hash==='portfolio')return {path:url.pathname,id:null,tab:'overview'};
 if((url.pathname==='/investors-jv'||url.pathname==='/h2-projects')&&hash==='contact-room')return {path:url.pathname,id:null,tab:'contact-room'};
 const match=hash.match(/^record\/([^/]+)(?:\/([^/]+))?$/);
 if(!match||!TABS.has(match[2]||'overview'))return {path:url.pathname,id:null,tab:'overview',invalid:true};
 try{return {path:url.pathname,id:decodeURIComponent(match[1]),tab:match[2]||'overview'};}catch{return {path:url.pathname,id:null,tab:'overview',invalid:true};}
}
export const routeUrl=route=>`${route.path}#${route.id?`record/${encodeURIComponent(route.id)}/${route.tab}`:(route.path==='/investors-jv'||route.path==='/h2-projects')&&route.tab==='contact-room'?'contact-room':'portfolio'}`;

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
  try{
   const key='oplatform-navigation-backup:before-shared-navigation-v1';
   if(this.storage.getItem(key))return;
   const state={};for(let index=0;index<this.storage.length;index++){const name=this.storage.key(index);if(name&&!name.startsWith('oplatform-navigation-backup:')&&(/^(oplatform|en590)/.test(name)))state[name]=this.storage.getItem(name);}
   this.storage.setItem(key,JSON.stringify({at:new Date().toISOString(),state}));
  }catch{this.storageUnavailable=true;}
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
  if(this.app?.path==='/h2-dev'&&['outreach-subject','outreach-message','outreach-subject-options'].includes(field.id)){
   if(field.id==='outreach-subject-options'){
    const subject=this.root.querySelector('#outreach-subject');if(field.value&&subject)subject.value=field.value;
    const update=this.root.querySelector('[data-detail-action="update-subject"]');if(update)update.disabled=!field.value;
   }
   const canonical=this.app.syncOutreachDraft();if(canonical)return this.captureField(canonical);return;
  }
  if(!this.current?.id||!field.id||!field.closest?.('#content')||!['INPUT','TEXTAREA','SELECT'].includes(field.tagName)||['file','password'].includes(field.type))return;
  this.drafts.field(this.current,field.id,{value:field.value,checked:field.checked});
 }
 remember(){
  if(!this.current||!this.app)return;
  const content=this.root.querySelector('#content'),entry=this.drafts.read(this.current),active=content?.contains(this.root.ownerDocument.activeElement)?this.root.ownerDocument.activeElement:null;
  const scrolls=[...(content?.querySelectorAll('.table-wrap,.partner-table-wrap,.pipeline-table-shell,.en590-refinery-table-wrap,.cr-table-wrap')||[])].map(node=>({left:node.scrollLeft,top:node.scrollTop}));
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
  this.app?.syncOutreachEditor?.();
  const form=content.querySelector('[data-contact-form]');if(form&&entry.formOpen){form.hidden=false;const toggle=content.querySelector('[data-contact-form-toggle]');if(toggle)toggle.textContent='Cancel';}
  content.scrollTop=entry.top||0;this.browser.scrollTo?.({top:entry.windowTop||0,behavior:'instant'});
  [...content.querySelectorAll('.table-wrap,.partner-table-wrap,.pipeline-table-shell,.en590-refinery-table-wrap,.cr-table-wrap')].forEach((node,index)=>{node.scrollLeft=entry.scrolls?.[index]?.left||0;node.scrollTop=entry.scrolls?.[index]?.top||0;});
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
  this.contactRoom?.stop();
  this.clearStatus();this.pending=null;
  if(target.id&&!this.app.rows.some(row=>row.id===target.id))target={path:target.path,id:null,tab:'overview',invalid:true};
  this.current={path:target.path,id:target.id,tab:target.tab};
  this.rendering=true;
  try{
   this.app.detailRecordId=target.id;this.app.detailTab=target.tab;
   if(target.id)this.app.renderRecordDetail();else{this.app.resetBreadcrumb();if((target.path==='/investors-jv'||target.path==='/h2-projects')&&target.tab==='contact-room')this.contactRoom?.render(this.app);else this.app.pipeline.render();this.app.renderedDetailKey=null;}
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
  this.root.querySelector('.platform-shell').classList.toggle('wind-reference-shell',['/wind-projects','/listed-projects','/h2-dev','/h2-projects'].includes(path));
  const view=this.root.querySelector('.view-switch'),refineries=view.querySelector('[data-view="refineries"]');
  if(path==='/diesel-en590'&&!refineries)view.insertAdjacentHTML('beforeend','<button type="button" class="view-button" data-view="refineries" aria-pressed="false">▤ Refineries</button>');else if(path!=='/diesel-en590')refineries?.remove();
  app.pulse=PulseSendController.forPath(path);app.pulse?.attach(app);app.loadSendHistory().catch(()=>{});
 }
 syncViewButtons(){this.root.querySelectorAll('[data-view]').forEach(button=>{const active=this.current?.tab!=='contact-room'&&button.dataset.view===this.app.pipeline.mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});const room=this.root.querySelector('[data-contact-room-open]');if(room){if(this.current?.tab==='contact-room')room.setAttribute('aria-current','page');else room.removeAttribute('aria-current');}}
 portfolio({resetPage=false,mode}={}){
  this.remember();this.cancelPending();
  if(resetPage)this.app.pipeline.page=1;
  if(mode){this.app.pipeline.mode=mode;this.app.sidebar.setViewMode(mode);}
  // View changes must render even when the existing route is already portfolio.
  if(!this.current?.id&&this.current?.tab!=='contact-room'){this.app.pipeline.render();this.syncViewButtons();if(!resetPage)this.restore();return;}
  return this.go({path:this.app.path,id:null,tab:'overview'});
 }
 record(id,tab='overview'){return this.go({path:this.app.path,id,tab:TABS.has(tab)?tab:'overview'});}
 refreshStar(){
  if(this.current?.tab==='contact-room'){this.contactRoom?.draw();return;}
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
 if(path==='/h2-projects')return h2OutreachDraft(record);
 const name=record.name||record.company||record.partner||record.buyer||'your organisation';
 // Approved anonymous 8 MW H2 Dev pitch; saved per-record drafts remain authoritative.
 if(path==='/h2-dev'){
  if(/tyczka hydrogen/i.test(name))return "Subject: Tyczka Hydrogen — 8 MW Polish green hydrogen opportunity\n\nDear [Name],\n\nI facilitate investment partnerships for renewable-energy projects. I am writing because Tyczka Hydrogen is clearly expanding its own green hydrogen production, with the recent Hünfeld acquisition and the Schweinfurt hub, and I believe this project could fit that strategy well.\n\nIt is an 8 MW PEM green hydrogen project in Poland, with the groundwork largely completed:\n\n- three favourable environmental screening opinions\n- positive preliminary feedback from the grid operator\n- an identified industrial site\n- non-binding offtake agreements in place\n\nThe remaining steps are the land acquisition, the formal grid connection conditions and further permitting, and the right partner could help bring these across the line.\n\nWould this fit Tyczka Hydrogen’s current priorities? I would welcome a 15-minute online meeting, and I can share further details after your initial interest.\n\nBest regards,\nMubashir";
  return "Subject: Investment / JV opportunity | 8 MW green hydrogen | Poland\n\nDear [Name],\n\nI facilitate investment and joint-venture partnerships for renewable-energy projects. I am currently seeking a strategic investment or development partner for a planned 8 MW PEM green hydrogen project in Poland.\n\nThe project has three favourable environmental screening opinions, positive preliminary grid feedback and an identified industrial site. Further permitting, formal grid connection conditions and land acquisition remain outstanding.\n\nNon-binding offtake agreements are secured.\n\nWould this opportunity fit [Company]’s current investment priorities? I would welcome a 15-minute online meeting, with further details shared confidentially following initial interest.\n\nBest regards,\nMubashir".replaceAll('[Company]',name);
 }
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
 let markup=outreachPanel.call(this,record);const draft=defaultOutreachDraft(this.path,record),saved=this.windWorkflow(this.detailRecordId).outreachDraft;
 // Saved drafts and pending edits belong to the user and are never replaced by a template migration.
 if(draft&&!saved)markup=markup.replace(/(<textarea id="outreach-draft"[^>]*>)[\s\S]*?(<\/textarea>)/,(_,open,close)=>open+this.escape(draft)+close);
 return this.path==='/h2-dev'?this.renderOutreachSubjectEditor(markup,saved||draft||''):markup;
};

/** Keep the existing full-draft storage/send format behind separate H2 editor fields. */
export function composeOutreachDraft(subject,body){return `Subject: ${String(subject||'')}\n\n${String(body||'')}`;}
export function outreachSubjectOptions(saved,current){
 return [...new Set([...(Array.isArray(saved)?saved:[]),current].filter(value=>typeof value==='string'&&value.trim()).map(value=>value.trim()))];
}
export function saveSubjectOption(subjects,selected,value,update=false){
 const subject=String(value||'').trim();
 if(!subject||subject.length>300||/[\r\n]/.test(subject))throw Error('Enter a subject of 1–300 characters on one line.');
 const next=[...subjects],index=next.indexOf(selected);
 if(update&&index<0)throw Error('Choose a saved subject to update, or save this as a new subject.');
 if(update)next[index]=subject;else next.push(subject);
 const unique=[...new Set(next)];
 if(unique.length>50)throw Error('You can save up to 50 subjects per company.');
 return {subject,subjects:unique};
}
OpportunityPlatformApp.prototype.renderOutreachSubjectEditor=function(markup,draft){
 if(this.path!=='/h2-dev')return markup;
 const {subject,body}=parseDraft(draft),state=this.windWorkflow(this.detailRecordId);
 const subjects=outreachSubjectOptions(state.outreachSubjects,subject);
 const controls=`<div class="outreach-subject-editor"><label for="outreach-subject">Subject</label><input id="outreach-subject" type="text" maxlength="300" value="${this.escape(subject)}" placeholder="Enter your email subject" autocomplete="off"><div class="outreach-subject-library"><label for="outreach-subject-options">Saved subjects<select id="outreach-subject-options"><option value="">Select a saved subject</option>${subjects.map(value=>`<option value="${this.escape(value)}"${value===subject?' selected':''}>${this.escape(value)}</option>`).join('')}</select></label><div class="outreach-subject-actions"><button type="button" class="quiet" data-detail-action="save-subject-new">Save as new subject</button><button type="button" class="quiet" data-detail-action="update-subject"${subjects.includes(subject)?'':' disabled'}>Update selected</button></div></div><p class="muted outreach-subject-help">Keep multiple subjects for this company. Switching subjects keeps your message unchanged.</p><p data-outreach-subject-status role="status" aria-live="polite"></p></div><label for="outreach-message">Message</label><textarea id="outreach-message" rows="16">${this.escape(body)}</textarea><textarea id="outreach-draft" hidden aria-hidden="true">${this.escape(draft)}</textarea>`;
 return markup.replace('Start with a “Subject: …” line.','Choose or edit a subject below.').replace(/<label class="sr-only" for="outreach-draft">[\s\S]*?<\/label>/,'').replace(/<textarea id="outreach-draft"[^>]*>[\s\S]*?<\/textarea>/,()=>controls);
};
OpportunityPlatformApp.prototype.syncOutreachEditor=function(){
 if(this.path!=='/h2-dev')return;
 const canonical=this.root.querySelector('#outreach-draft'),subject=this.root.querySelector('#outreach-subject'),message=this.root.querySelector('#outreach-message');
 if(!canonical||!subject||!message)return;
 const draft=parseDraft(canonical.value);subject.value=draft.subject;message.value=draft.body;
 const select=this.root.querySelector('#outreach-subject-options');if(select)select.value=[...select.options].some(option=>option.value===draft.subject)?draft.subject:'';
 const update=this.root.querySelector('[data-detail-action="update-subject"]');if(update)update.disabled=!select?.value;
};
OpportunityPlatformApp.prototype.syncOutreachDraft=function(){
 if(this.path!=='/h2-dev')return null;
 const canonical=this.root.querySelector('#outreach-draft'),subject=this.root.querySelector('#outreach-subject'),message=this.root.querySelector('#outreach-message');
 if(!canonical||!subject||!message)return null;
 canonical.value=composeOutreachDraft(subject.value,message.value);
 this.pulse?.draftChanged();
 return canonical;
};
OpportunityPlatformApp.prototype.saveOutreachSubject=function(update){
 const subject=this.root.querySelector('#outreach-subject'),select=this.root.querySelector('#outreach-subject-options'),status=this.root.querySelector('[data-outreach-subject-status]');
 if(!subject||!select)return;
 try{
  const result=saveSubjectOption([...select.options].map(option=>option.value).filter(Boolean),select.value,subject.value,update);
  this.saveWindWorkflow(this.detailRecordId,{outreachSubjects:result.subjects});
  subject.value=result.subject;
  select.innerHTML='<option value="">Select a saved subject</option>'+result.subjects.map(value=>`<option value="${this.escape(value)}">${this.escape(value)}</option>`).join('');select.value=result.subject;
  const button=this.root.querySelector('[data-detail-action="update-subject"]');if(button)button.disabled=false;
  const canonical=this.syncOutreachDraft();if(canonical)this.navigation?.captureField(canonical);
  if(status)status.textContent=update?'Selected subject updated.':'Subject saved. Choose it from Saved subjects anytime.';
 }catch(error){if(status)status.textContent=`Subject was not saved: ${error.message}`;}
};
const subjectDetailAction=OpportunityPlatformApp.prototype.handleDetailAction;
OpportunityPlatformApp.prototype.handleDetailAction=function(action){
 if(this.path==='/h2-dev'&&['save-subject-new','update-subject'].includes(action))return this.saveOutreachSubject(action==='update-subject');
 return subjectDetailAction.call(this,action);
};
