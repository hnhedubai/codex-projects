import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source=await readFile(new URL('../../../platform-shell/shared/js/platform-app.js',import.meta.url),'utf8');
function setup(){
 const values=new Map(),listeners={};
 const localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};
 const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'},addEventListener:(type,listener)=>listeners[type]=listener},localStorage,URL,AbortController});
 vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.exports={EmailVerification,OutreachStatusIndicator,WindSendHistory,SidebarController,OpportunityPlatformApp};',context);
 return {...context.exports,localStorage,values,listeners};
}

test('saved email sent and response received statuses do not require a particular relationship stage',()=>{
 const {OutreachStatusIndicator:S}=setup();
 assert.equal(S.resolve({outreachEmailStatus:'Email sent',outreachStage:'Not contacted'}).state,'sent');
 assert.equal(S.resolve({outreachEmailStatus:'Response received',outreachStage:'NDA discussion'}).state,'responded');
 assert.equal(S.resolve({emailStatus:'responded'}).state,'responded');
 assert.equal(S.resolve({emailStatus:'sent'}).state,'sent');
});
test('not sent clears the indicator without deleting history and manual status has precedence',()=>{
 const {OutreachStatusIndicator:S}=setup();
 const history=[{results:[{status:'sent',emails:['team@example.com']}]}];
 assert.equal(S.resolve({outreachEmailStatus:'Not sent',outreachHistory:history}),null);
 assert.equal(history.length,1);
 assert.equal(S.resolve({outreachEmailStatus:'Response received',outreachHistory:history}).state,'responded');
 assert.equal(S.resolve({outreachStage:'Contacted'}),null);
});
test('imported successful sends work without Contacted stage or an email array',()=>{
 const {OutreachStatusIndicator:S}=setup();
 assert.equal(S.resolve({outreachStage:'Awaiting reply',outreachHistory:[{results:[{status:'sent'}]}]}).state,'sent');
 assert.equal(S.resolve({outreachHistory:[{results:[{status:'blocked'},{status:'sent'}]}]}).state,'sent');
 assert.equal(S.resolve({outreachHistory:[{results:[{status:'sent'},{status:'replied'}]}]}).state,'responded');
});
test('failed or blocked attempts never imply that email was sent',()=>{
 const {OutreachStatusIndicator:S}=setup();
 assert.equal(S.resolve({outreachHistory:[{results:[{status:'blocked'}]}]}).state,'blocked');
 assert.equal(S.resolve({outreachHistory:[{results:[{status:'failed'}]}]}).state,'failed');
 for(const value of [null,{}, {outreachHistory:'bad'}, {outreachHistory:[null,{}]}, {outreachEmailStatus:'unknown'}])assert.equal(S.resolve(value),null);
});
test('sidebar keeps verification ticks, stars and independent status dots',()=>{
 const {SidebarController,localStorage,EmailVerification}=setup();
 for(const email of ['one@example.com','two@example.com'])EmailVerification.results[email]={provider:'Reoon',mode:'power',status:'safe',deliverable:true,isRoleAccount:false,checkedAt:new Date().toISOString()};
 localStorage.setItem('oplatform:/wind-projects:detail-workflow',JSON.stringify({alpha:{outreachEmailStatus:'Email sent'},beta:{outreachEmailStatus:'Response received'}}));
 const sidebar=Object.create(SidebarController.prototype);
 Object.assign(sidebar,{path:'/wind-projects',viewMode:'table',rows:[{id:'alpha',project:'Alpha',contacts:[{email:'one@example.com'},{email:'two@example.com'}]},{id:'beta',project:'Beta',contacts:[]}],starred:new Set(['alpha']),total:{},list:{innerHTML:''}});
 sidebar.filtered=()=>sidebar.rows;sidebar.ordered=rows=>rows;
 sidebar.render();
 assert.match(sidebar.list.innerHTML,/sidebar-outreach email-status-dot sent/);
 assert.match(sidebar.list.innerHTML,/sidebar-outreach email-status-dot responded/);
 assert.match(sidebar.list.innerHTML,/sidebar-verification positive[^>]*>✓✓/);
 assert.match(sidebar.list.innerHTML,/aria-label="Unstar Alpha"/);
 assert.equal(sidebar.total.textContent,2);
});
test('module-specific storage is isolated and corrupt storage is tolerated',()=>{
 const {SidebarController,localStorage}=setup();
 localStorage.setItem('oplatform:/wind-projects:detail-workflow',JSON.stringify({alpha:{outreachEmailStatus:'Email sent'}}));
 localStorage.setItem('oplatform:/investors-jv:detail-workflow',JSON.stringify({alpha:{outreachEmailStatus:'Response received'}}));
 const sidebar=Object.create(SidebarController.prototype);sidebar.path='/investors-jv';
 assert.equal(sidebar.outreachWorkflows().alpha.outreachEmailStatus,'Response received');
 localStorage.setItem('oplatform:/investors-jv:detail-workflow','broken');
 assert.equal(Object.keys(sidebar.outreachWorkflows()).length,0);
});
test('saving refreshes signals immediately and preserves drafts, history, notes and other project state',()=>{
 const {OpportunityPlatformApp,localStorage}=setup();
 const key='oplatform:/wind-projects:detail-workflow';
 const before={alpha:{outreachDraft:'Keep draft',outreachHistory:[{results:[{status:'sent'}]}],diligenceNotes:'Keep notes'},beta:{outreachEmailStatus:'Response received'}};
 localStorage.setItem(key,JSON.stringify(before));
 let refreshes=0;
 const app=Object.create(OpportunityPlatformApp.prototype);app.detailWorkflowKey=key;app.sidebar={refreshOutreachSignals:()=>refreshes++};
 app.saveWindWorkflow('alpha',{outreachEmailStatus:'Email sent'});
 const saved=JSON.parse(localStorage.getItem(key));
 assert.equal(refreshes,1);
 assert.equal(saved.alpha.outreachDraft,before.alpha.outreachDraft);
 assert.deepEqual(saved.alpha.outreachHistory,before.alpha.outreachHistory);
 assert.equal(saved.alpha.diligenceNotes,before.alpha.diligenceNotes);
 assert.deepEqual(saved.beta,before.beta);
});
test('refresh changes only dots without rebuilding the sidebar or losing scroll position',()=>{
 const {SidebarController,localStorage}=setup();
 localStorage.setItem('oplatform:/wind-projects:detail-workflow',JSON.stringify({alpha:{outreachEmailStatus:'Response received'}}));
 let removed=0,inserted='';
 const item={dataset:{dragId:'alpha'},querySelectorAll:()=>[{remove:()=>removed++}],querySelector:()=>({insertAdjacentHTML:(position,html)=>{assert.equal(position,'beforebegin');inserted=html;}})};
 const sidebar=Object.create(SidebarController.prototype);sidebar.path='/wind-projects';sidebar.list={innerHTML:'keep existing rows',scrollTop:180,querySelectorAll:()=>[item]};
 sidebar.refreshOutreachSignals();
 assert.equal(removed,1);assert.match(inserted,/responded/);
 assert.equal(sidebar.list.innerHTML,'keep existing rows');assert.equal(sidebar.list.scrollTop,180);
});
test('cross-tab storage changes refresh the matching module only',()=>{
 const {SidebarController,listeners}=setup();
 for(const method of ['renderShell','bind','populateFilters','restoreState','setViewMode'])SidebarController.prototype[method]=()=>{};
 const sidebar=new SidebarController({root:{},path:'/wind-projects',workspace:{},routes:[],rows:[]});
 let refreshes=0;sidebar.refreshOutreachSignals=()=>refreshes++;
 listeners.storage({key:'oplatform:/investors-jv:detail-workflow'});assert.equal(refreshes,0);
 listeners.storage({key:'oplatform:/wind-projects:detail-workflow'});assert.equal(refreshes,1);
 listeners.storage({key:null});assert.equal(refreshes,2);
});
const desk=(...statuses)=>({lastSentAt:'2026-10-15T16:03:24.432Z',sentCount:1,blockedCount:0,failedCount:0,history:[{at:'2026-10-15T16:03:24.432Z',mode:'separate',subject:'Desk send',recipients:[{email:'team@example.com',field:'to'}],results:statuses.map(status=>({emails:['team@example.com'],status,error:''}))}]});
const deskSidebar=(SidebarController,localStorage,saved,server)=>{
 localStorage.setItem('oplatform:/wind-projects:detail-workflow',JSON.stringify({alpha:saved}));
 const sidebar=Object.create(SidebarController.prototype);
 Object.assign(sidebar,{path:'/wind-projects',viewMode:'table',rows:[{id:'alpha',project:'Alpha',contacts:[]}],starred:new Set(),total:{},list:{innerHTML:''},sendHistory:{alpha:server}});
 sidebar.filtered=()=>sidebar.rows;sidebar.ordered=rows=>rows;sidebar.render();
 return sidebar.list.innerHTML;
};
test('desk send history with a sent result shows the Email sent dot',()=>{
 const {SidebarController,WindSendHistory,localStorage}=setup();
 assert.equal(WindSendHistory.resolve({},desk('sent')).state,'sent');
 assert.match(deskSidebar(SidebarController,localStorage,{},desk('blocked','sent')),/sidebar-outreach email-status-dot sent/);
 assert.ok(!localStorage.getItem('oplatform:/wind-projects:detail-workflow').includes('Desk send'),'desk history is never written to localStorage');
});
test('manual Not sent hides the desk dot and keeps the history',()=>{
 const {SidebarController,WindSendHistory,localStorage}=setup();
 const server=desk('sent');
 assert.equal(WindSendHistory.resolve({outreachEmailStatus:'Not sent'},server),null);
 assert.equal(server.history.length,1);
 assert.doesNotMatch(deskSidebar(SidebarController,localStorage,{outreachEmailStatus:'Not sent'},server),/sidebar-outreach/);
});
test('manual Response received wins over desk history',()=>{
 const {SidebarController,WindSendHistory,localStorage}=setup();
 assert.equal(WindSendHistory.resolve({outreachEmailStatus:'Response received'},desk('sent')).state,'responded');
 assert.match(deskSidebar(SidebarController,localStorage,{outreachEmailStatus:'Response received'},desk('sent')),/email-status-dot responded/);
});
test('desk history with only blocked results shows no dot',()=>{
 const {SidebarController,WindSendHistory,localStorage}=setup();
 assert.equal(WindSendHistory.resolve({},desk('blocked','blocked')),null);
 assert.doesNotMatch(deskSidebar(SidebarController,localStorage,{},desk('blocked')),/sidebar-outreach/);
});
test('Outreach panel lists desk sends in Dubai time without touching localStorage',()=>{
 const {OpportunityPlatformApp,localStorage}=setup();
 const app=Object.create(OpportunityPlatformApp.prototype);
 app.detailWorkflowKey='oplatform:/wind-projects:detail-workflow';app.detailRecordId='alpha';
 app.sendHistory={available:true,syncedAt:'2026-10-22T08:00:00.000Z',projects:{alpha:desk('sent','blocked')}};
 const html=app.renderImportedOutreachHistory()+app.renderSendHistorySync();
 assert.match(html,/15\/10\/2026, 20:03:24 \(Dubai\)/);
 assert.match(html,/Desk send/);assert.match(html,/TO team@example.com/);
 assert.match(html,/Sent: team@example.com/);assert.match(html,/Blocked: team@example.com/);
 assert.match(html,/Last synced: 22\/10\/2026, 12:00:00 \(Dubai\)/);
 app.sendHistory={available:false,syncedAt:null,projects:{}};
 assert.match(app.renderSendHistorySync(),/not available right now/);
 assert.equal(localStorage.getItem(app.detailWorkflowKey),null);
});
