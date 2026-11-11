import test from 'node:test';
import assert from 'node:assert/strict';
import {partnerRecords,partnerContacts} from '../data/source.js';
import {defaultSectors,installInvestorSectors} from '../sectors.js';

globalThis.document??={addEventListener(){}};
globalThis.localStorage??={getItem(){return null;}};
const {SidebarController,PipelineView,OpportunityPlatformApp,WorkspaceImportGuard}=await import('../../../platform-shell/shared/js/platform-app.js');
installInvestorSectors({OpportunityPlatformApp,PipelineView,SidebarController});
const rows=partnerRecords.map(source=>({id:source.id,partner:source.company,country:source.country,contacts:partnerContacts[source.id]||[],source}));
function harness(){
 const sidebar=Object.assign(Object.create(SidebarController.prototype),{path:'/investors-jv',rows,search:{value:''},signalFilter:{value:''},countryMode:'include',countryValues:[],viewMode:'table'});
 const pipeline=Object.assign(Object.create(PipelineView.prototype),{path:'/investors-jv',rows,sidebar,priorityFilter:''});
 sidebar.priorityMatches=row=>pipeline.priorityMatches(row);
 return {sidebar,pipeline};
}

test('new research classifications contribute 24 Strong and one Low company to both lists',()=>{
 const {sidebar,pipeline}=harness();
 const added=rows.filter(row=>row.source.classificationResearch);
 assert.equal(added.length,25);
 pipeline.priorityFilter='Strong';assert.equal(added.filter(row=>pipeline.priorityMatches(row)).length,24);
 assert.equal(sidebar.filtered().filter(row=>added.includes(row)).length,24);
 pipeline.priorityFilter='Low';assert.deepEqual(sidebar.filtered().filter(row=>added.includes(row)).map(row=>row.id),['goldenpeaks-capital']);
 pipeline.priorityFilter='';assert.equal(sidebar.filtered().length,rows.length);
});

test('every priority roundtrips to All without retaining the preceding subset',()=>{
 const {sidebar,pipeline}=harness();
 for(const priority of ['Strong','High','Low','Ultra High','Moderate','Very Low','Strong','']){
  pipeline.priorityFilter=priority;
  const expected=rows.filter(row=>!priority||pipeline.priorityCategory(row)===priority).map(row=>row.id);
  assert.deepEqual(sidebar.filtered().map(row=>row.id),expected);
 }
});

test('sidebar badge reports the matching count and exposes the full total on hover',()=>{
 const {sidebar,pipeline}=harness();Object.assign(sidebar,{total:{},list:{},order:[],starred:new Set()});
 pipeline.priorityFilter='Strong';sidebar.render();
 assert.equal(sidebar.total.textContent,sidebar.filtered().length);
 assert.equal(sidebar.total.title,`${sidebar.filtered().length} matching of ${rows.length} partners`);
 pipeline.priorityFilter='';sidebar.render();assert.equal(sidebar.total.textContent,rows.length);
});

test('country, sector and priority intersect; country include/exclude and clear are reversible',()=>{
 const {sidebar,pipeline}=harness();pipeline.priorityFilter='Strong';sidebar.signalFilter.value='Wind';
 for(const country of ['Germany','Finland','','Germany','Norway',''])for(const mode of ['include','exclude']){
  sidebar.countryValues=country?[country]:[];sidebar.countryMode=mode;
  const expected=rows.filter(row=>{
   const countries=[row.country,...(row.source.countryFilterTags||[])];
   const countryMatch=!country||(mode==='include'?countries.includes(country):!countries.includes(country));
   return countryMatch&&defaultSectors(row).includes('Wind')&&pipeline.priorityCategory(row)==='Strong';
  }).map(row=>row.id);
  assert.deepEqual(sidebar.filtered().map(row=>row.id),expected);
 }
 sidebar.countryValues=[];sidebar.signalFilter.value='';pipeline.priorityFilter='';assert.equal(sidebar.filtered().length,rows.length);
});

test('search reaches nested line of business, subsectors, names and emails without object-string matches',()=>{
 const {sidebar}=harness();
 for(const query of ['infrastructure fund management','hydropower','timo.pohjakallio@enordic.fi','Pierre-Antoine Machelon']){
  sidebar.search.value=query;const found=sidebar.filtered();assert.ok(found.length>0,query);
  assert.ok(found.every(row=>JSON.stringify(row).toLowerCase().includes(query.toLowerCase())));
 }
 sidebar.search.value='[object Object]';assert.equal(sidebar.filtered().length,0);
 sidebar.search.value='';assert.equal(sidebar.filtered().length,rows.length);
 const circular={businessLines:['circular fixture']};circular.self=circular;
 assert.match(sidebar.searchText({source:circular}),/circular fixture/);
});

test('Hydropower stays selectable and passes workspace validation',()=>{
 const {sidebar}=harness();sidebar.signalFilter.value='Hydropower';
 assert.deepEqual(sidebar.filtered().map(row=>row.id).sort(),['bkw','cloudberry']);
 assert.deepEqual(defaultSectors({subSector:'Hydroelectric generation'}),['Hydropower']);
 WorkspaceImportGuard.workflow({sectors:['Wind','Hydropower']});
});

test('the Investors & JV priority predicate cannot filter another module',()=>{
 const {sidebar}=harness();sidebar.path='/wind-projects';sidebar.priorityMatches=()=>false;
 sidebar.rows=[{id:'wind',country:'Germany',signal:'Open',project:'Wind fixture'}];
 assert.equal(sidebar.filtered().length,1);
});

test('Kitfox shows exactly the reviewed investor cohort in both lists',()=>{
 const {sidebar,pipeline}=harness();
 pipeline.priorityFilter='kitfox';
 const expected=["cwp-europe","desri","eden-renewables","edf-power-solutions-north-america","elements-green","enel-green-power","firma-energy","geronimo-power","greengo-srl","hive-energy","juwi-inc","lexham-power","mainstream-renewable-power","matrix-renewables","nadara","opdenergy","pattern-energy","prc-wind-solar","renewable-power-capital","silicon-ranch","sonnedix","terraform-power","tion-renewables","velto-q-energy","wi-ipp"];
 assert.deepEqual(sidebar.filtered().map(row=>row.id).sort(),expected);
 assert.deepEqual(rows.filter(row=>pipeline.priorityMatches(row)).map(row=>row.id).sort(),expected);
 assert.ok(sidebar.filtered().every(row=>row.source.sources.length && row.source.summary));
 assert.ok(rows.some(row=>row.id==='edf-power-solutions'));
 sidebar.search.value='Hive Energy';assert.deepEqual(sidebar.filtered().map(row=>row.id),['hive-energy']);
});
