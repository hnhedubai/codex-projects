import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {ModuleLoader} from './module-loader.js';
import {PulseSendController} from './pulse-send-panel.js';

// All navigation tests use local in-memory fixtures; no browser records or provider calls.
globalThis.document??={addEventListener(){}};
const {PlatformNavigation,NavigationDrafts,parseRoute,routeUrl,defaultOutreachDraft}=await import('./navigation.js');
const {OpportunityPlatformApp}=await import('./platform-app.js');
const workspaces={'/wind-projects':{name:'Wind'},'/hydrogen-offtakers':{name:'Hydrogen'},'/investors-jv':{name:'Investors'}};
function storage(){const values=new Map();return {get length(){return values.size;},key:index=>[...values.keys()][index],getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value))};}
function harness(){
 const values=storage(),events={},location={href:'http://localhost:8181/wind-projects#portfolio',pathname:'/wind-projects',hash:'#portfolio'},writes=[];
 const setUrl=url=>{const next=new URL(url,'http://localhost:8181');Object.assign(location,{href:next.href,pathname:next.pathname,hash:next.hash});};
 const browser={location,history:{pushState:(a,b,url)=>{writes.push(['push',url]);setUrl(url);},replaceState:(a,b,url)=>{writes.push(['replace',url]);setUrl(url);}},addEventListener:(name,fn)=>events[name]=fn,scrollTo(){}};
 const nav=new PlatformNavigation({root:{querySelector:()=>null},workspaces,storage:values,window:browser,loadModule:async()=>[{id:'alpha'}]});
 const renders=[],activations=[],statuses=[];
 nav.remember=()=>{};nav.restore=()=>{};nav.clearStatus=()=>{};nav.status=message=>statuses.push(message);nav.syncViewButtons=()=>{};
 nav.activate=(path,rows)=>{activations.push(path);nav.app={path,rows,resetBreadcrumb(){},pipeline:{render:()=>renders.push('portfolio')},renderRecordDetail:()=>renders.push(nav.app.detailRecordId+'/'+nav.app.detailTab)};};
 return {nav,values,writes,browser,events,renders,activations,statuses};
}
test('routes roundtrip IDs safely; unknown modules and malformed hashes cannot become navigation targets',()=>{
 const route={path:'/wind-projects',id:'record/with spaces',tab:'outreach'};
 assert.deepEqual(parseRoute(new URL(routeUrl(route),'http://localhost:8181'),workspaces),route);
 assert.equal(parseRoute(new URL('http://localhost:8181/not-a-module'),workspaces),null);
 assert.equal(parseRoute(new URL('http://localhost:8181/wind-projects#record/%XX/project'),workspaces).invalid,true);
 assert.equal(parseRoute(new URL('http://localhost:8181/wind-projects#record/alpha/other'),workspaces).invalid,true);
});
test('drafts survive store reconstruction and remain isolated by module, record and tab',()=>{
 const values=storage(),route={path:'/wind-projects',id:'alpha',tab:'outreach'},drafts=new NavigationDrafts(values);
 drafts.field(route,'outreach-draft',{value:'Unsaved enquiry'});
 const restored=new NavigationDrafts(values);
 assert.equal(restored.read(route).fields['outreach-draft'].value,'Unsaved enquiry');
 for(const other of [{...route,path:'/hydrogen-offtakers'},{...route,id:'beta'},{...route,tab:'contacts'}])assert.equal(restored.read(other).fields,undefined);
 drafts.field(route,'outreach-notes',{value:'Pending notes'});drafts.clear(route,['outreach-draft']);
 assert.deepEqual(drafts.read(route).fields,{'outreach-notes':{value:'Pending notes'}});
});
test('storage failure retains pending edits in memory and exposes failure instead of throwing them away',()=>{
 const drafts=new NavigationDrafts({getItem:()=>null,setItem:()=>{throw Error('Quota exceeded');}}),route={path:'/wind-projects',id:'alpha',tab:'contacts'};
 drafts.field(route,'contact-name',{value:'Unsaved Person'});assert.equal(drafts.failed,true);assert.equal(drafts.read(route).fields['contact-name'].value,'Unsaved Person');
});
test('pre-navigation backup is additive and is never overwritten',()=>{
 const {nav,values}=harness();values.setItem('oplatform:/wind-projects:detail-workflow','original');nav.backup();
 const key='oplatform-navigation-backup:before-shared-navigation-v1',backup=values.getItem(key);assert.equal(JSON.parse(backup).state['oplatform:/wind-projects:detail-workflow'],'original');
 values.setItem('oplatform:/wind-projects:detail-workflow','later');nav.backup();assert.equal(values.getItem(key),backup);
});
test('detail and portfolio transitions synchronize app state and URL without document navigation',async()=>{
 const {nav,writes,renders,activations}=harness();await nav.go({path:'/wind-projects',id:'alpha',tab:'outreach'});
 await nav.go({path:'/wind-projects',id:'alpha',tab:'contacts'});await nav.go({path:'/wind-projects',id:null,tab:'overview'});
 assert.equal(activations.length,1);assert.equal(nav.app.detailRecordId,null);assert.deepEqual(renders,['alpha/outreach','alpha/contacts','portfolio']);assert.equal(writes.at(-1)[1],'/wind-projects#portfolio');
});
test('Back/Forward handling renders the specified route without adding another history entry',async()=>{
 const {nav,writes}=harness();await nav.go({path:'/wind-projects',id:'alpha',tab:'contacts'});
 await nav.go({path:'/wind-projects',id:'alpha',tab:'project'},{history:false});assert.equal(nav.app.detailTab,'project');assert.equal(writes.at(-1)[0],'replace');
});
test('rapid module changes ignore stale responses even when the older request completes last',async()=>{
 const {nav,activations}=harness();await nav.go({path:'/wind-projects',id:null,tab:'overview'});
 let finish;nav.loadModule=path=>path==='/hydrogen-offtakers'?new Promise(resolve=>finish=resolve):Promise.resolve([{id:'investor'}]);
 const pending=nav.go({path:'/hydrogen-offtakers',id:null,tab:'overview'});await nav.go({path:'/investors-jv',id:null,tab:'overview'});
 finish([{id:'hydrogen'}]);await pending;assert.equal(nav.app.path,'/investors-jv');assert.deepEqual(activations,['/wind-projects','/investors-jv']);
});
test('failed loading keeps the current workspace and allows a later retry',async()=>{
 const {nav,statuses}=harness();await nav.go({path:'/wind-projects',id:'alpha',tab:'contacts'});nav.loadModule=async()=>{throw Error('Offline');};
 assert.equal(await nav.go({path:'/hydrogen-offtakers',id:null,tab:'overview'}),false);assert.equal(nav.app.path,'/wind-projects');assert.equal(nav.app.detailTab,'contacts');assert.match(statuses.at(-1),/unchanged/);
 nav.loadModule=async()=>[];await nav.go({path:'/hydrogen-offtakers',id:null,tab:'overview'});assert.equal(nav.app.path,'/hydrogen-offtakers');
});
test('missing records resolve to a consistent portfolio URL',async()=>{
 const {nav,writes,browser}=harness();browser.location.hash='#record/missing/contacts';await nav.go({path:'/wind-projects',id:'missing',tab:'contacts'});assert.equal(nav.app.detailRecordId,null);assert.deepEqual(writes.at(-1),['replace','/wind-projects#portfolio']);
});
test('module loader shares successful in-flight requests and retries failures without caching empty records',async()=>{
 let reads=0,fail=true;
 const loader=new ModuleLoader({records:async()=>({windRows:[{id:'a'}]}),snapshotUrl:()=>'/contacts',hydrate:rows=>rows,fetchImpl:async()=>{reads++;if(fail)throw Error('Offline');return {ok:true,json:async()=>({})};}});
 await assert.rejects(loader.load('/wind-projects'));fail=false;const first=loader.load('/wind-projects');assert.equal(first,loader.load('/wind-projects'));assert.equal((await first).length,1);await loader.load('/wind-projects');assert.equal(reads,2);
});
test('module templates match the intended commercial purpose and never rewrite a saved draft',()=>{
 assert.match(defaultOutreachDraft('/hydrogen-offtakers',{}),/hydrogen offtake/i);assert.doesNotMatch(defaultOutreachDraft('/hydrogen-offtakers',{}),/wind-energy developer|equity investment/i);
 for(const path of ['/e-saf','/gases','/ammonia','/investors-jv'])assert.ok(defaultOutreachDraft(path,{}));assert.equal(defaultOutreachDraft('/wind-projects',{}),null);
 const app=Object.create(OpportunityPlatformApp.prototype);Object.assign(app,{path:'/hydrogen-offtakers',detailRecordId:'alpha',windWorkflow:()=>({outreachDraft:'User-written enquiry'}),renderSendHistorySync:()=>'',renderImportedOutreachHistory:()=>''});
 assert.match(app.renderOutreachPanel({name:'Alpha'}),/User-written enquiry/);
});
test('historical officers are not selectable for outreach; a separately recorded current office route stays available',()=>{
 const pulse=PulseSendController.forPath('/investors-jv',{});pulse.app={detailRecordId:'alpha',windWorkflow:()=>({}),contactEmailRoutes:contact=>[{email:contact.email,type:'Corporate route'}]};
 const rows=pulse.recipients({contacts:[{name:'Former CEO',email:'old@example.com',roleStatus:'Historical — replaced July 2026'},{name:'Company Office',email:'office@example.com'}]});assert.equal(rows[0].blocked,true);assert.equal(rows[1].blocked,false);
});
test('a late Pulse response cannot overwrite another module even with a matching record ID',async()=>{
 let finish;const pulse=PulseSendController.forPath('/investors-jv',{history:()=>new Promise(resolve=>finish=resolve),status:async()=>({enabled:true})});
 const app={pulse,detailRecordId:'same-id',root:{addEventListener(){}},sendHistory:{original:true}};pulse.attach(app);const pending=pulse.refresh();app.pulse={newModule:true};finish({available:true,projects:{}});await pending;assert.deepEqual(app.sendHistory,{original:true});
});
test('prioritising does not call the portfolio-navigation callback',async()=>{
 const source=await readFile(new URL('./platform-app.js',import.meta.url),'utf8'),values=storage(),context=vm.createContext({document:{addEventListener(){}},window:{},localStorage:values});vm.runInContext(source.replace(/export class /g,'class ')+';globalThis.Sidebar=SidebarController;',context);
 const sidebar=Object.create(context.Sidebar.prototype);let changed=0,starred=0;Object.assign(sidebar,{path:'/wind-projects',starred:new Set(),saveState(){},render(){},changed(){changed++;},onStar(){starred++;}});sidebar.toggle('alpha');assert.equal(changed,0);assert.equal(starred,1);
});
test('same-record tab rendering replaces only the panel and keeps heading and tab nodes mounted',()=>{
 const button={dataset:{detailTab:'contacts'},classList:{toggle(){}},setAttribute(){},tabIndex:-1},panel={replaceChildren(...nodes){this.children=nodes;}},existing={querySelector:()=>panel,querySelectorAll:()=>[button]};let contentWrites=0;
 const content={querySelector:()=>existing,querySelectorAll:()=>[button],set innerHTML(value){contentWrites++;}};
 const app=Object.create(OpportunityPlatformApp.prototype);Object.assign(app,{path:'/wind-projects',detailRecordId:'alpha',detailTab:'contacts',renderedDetailKey:'/wind-projects:alpha',navigation:{},root:{querySelector:()=>content,ownerDocument:{createElement:()=>({content:{querySelector:()=>({childNodes:['new-panel']})}})}}});
 app.updateDetailContent('<section>new markup</section>');assert.equal(contentWrites,0);assert.deepEqual(panel.children,['new-panel']);assert.equal(button.tabIndex,0);
});
test('Table/Kanban from detail uses portfolio transition and keeps the selected mode',async()=>{
 const {nav,browser,writes}=harness();await nav.go({path:'/wind-projects',id:'alpha',tab:'outreach'});
 nav.app.sidebar={setViewMode:mode=>nav.app.pipeline.mode=mode};nav.app.pipeline.mode='table';nav.root={querySelector:()=>({value:''})};
 await nav.portfolio({mode:'kanban'});assert.equal(nav.app.pipeline.mode,'kanban');assert.equal(nav.app.detailRecordId,null);assert.equal(browser.location.hash,'#portfolio');assert.equal(writes.at(-1)[1],'/wind-projects#portfolio');
});
