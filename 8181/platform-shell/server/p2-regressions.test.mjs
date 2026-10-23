import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {contactMatches,hydrateContactRows,mergeContactRecords} from '../shared/js/contact-registry.js';
import {PulseClient} from './pulse/pulse-client.mjs';
import {PulseSendController} from '../shared/js/pulse-send-panel.js';
import {loadContactCatalog} from './contact-catalog.mjs';

const root=path.resolve(new URL('../../',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const appSource=await readFile(new URL('../shared/js/platform-app.js',import.meta.url),'utf8');

test('3: named refinery contacts stay site-specific; explicit group routes remain shared',()=>{
 const sites=['Repsol — Cartagena refinery','Repsol — Tarragona refinery'];
 const contact={name:'Tarragona site',company:'Repsol',asset:'Repsol - Tarragona refinery'};
 assert.equal(contactMatches(contact,{assetName:sites[0],identities:['Repsol',sites[0]]}),false);
 assert.equal(contactMatches(contact,{assetName:sites[1],identities:['Repsol',sites[1]]}),true);
 assert.equal(contactMatches({company:'Repsol',asset:'Repsol Spanish refinery and trading portfolio'},{assetName:sites[0],identities:['Repsol',sites[0]]}),true);
 assert.equal(contactMatches({company:'bp'},{identities:['BPC']}),false);
 assert.equal(contactMatches({company:''},{identities:['Repsol']}),false);
});

test('3: actual EN590 dataset keeps site contacts and resolves historical site-name aliases',async()=>{
 let code=await readFile(new URL('../data/records.js',import.meta.url),'utf8');
 code=code.replaceAll(/from '(\/(?:modules|shared)\/[^']+)'/g,(_,p)=>`from '${pathToFileURL(path.join(root,p.startsWith('/shared/')?'platform-shell'+p:p)).href}'`);
 const previousFetch=globalThis.fetch,previousStorage=globalThis.localStorage;
 globalThis.localStorage={getItem:()=>null};
 globalThis.fetch=async url=>{assert.match(url,/^\/data\/en590-/);return {json:async()=>JSON.parse(await readFile(path.join(root,'modules/diesel-en590/data',path.basename(url)),'utf8'))};};
 try{
  const {loadLegacyRows}=await import('data:text/javascript,'+encodeURIComponent(code));
  const rows=hydrateContactRows(await loadLegacyRows('/diesel-en590'),JSON.parse(await readFile(path.join(root,'modules/diesel-en590/data/en590-contacts.source.json'))));
  assert.equal(rows.length,86);assert.equal(rows.filter(row=>row.entityRole==='Refinery operator').length,74);
  const cartagena=rows.find(row=>row.buyer==='Repsol — Cartagena refinery');
  assert.ok(cartagena.contacts.some(c=>c.name==='Rafael Quesada'));
  assert.ok(!cartagena.contacts.some(c=>c.name==='Javier Sancho'||c.name==='Natalia Barreiro'));
  assert.ok(rows.find(row=>row.buyer==='Repsol — Tarragona refinery').contacts.some(c=>c.name==='Javier Sancho'));
  assert.ok(rows.find(row=>row.buyer==='IRVIN OIL — Whitegate refinery').contacts.some(c=>c.name==='Ger Lynch'));
  assert.ok(rows.find(row=>row.buyer==='Orlen — Mazeikiu (Lietuva) refinery').contacts.some(c=>c.name==='ORLEN Lietuva Inland Wholesale Department'));
  assert.ok(!rows.find(row=>row.buyer==='Orlen — Gdansk refinery').contacts.some(c=>c.name==='MONIKA POPŁAWSKA'));
 }finally{globalThis.fetch=previousFetch;globalThis.localStorage=previousStorage;}
});

test('4: duplicate enrichment merges routes, phones, sources and notes without mutating originals',()=>{
 const first={name:'Person',company:'Co',asset:'Site',email:'p@example.com',phones:['111'],source:'https://one.example',notes:'Earlier finding',corporateRoutes:[{email:'office@example.com',type:'Corporate'}]};
 const second={...first,phones:['222'],source:'https://two.example',notes:'Later finding',corporateRoutes:[{email:'sales@example.com',type:'Corporate'}]};
 const before=JSON.stringify([first,second]);const merged=mergeContactRecords([first,second]);
 assert.equal(merged.length,1);assert.deepEqual(merged[0].phones,['111','222']);assert.equal(merged[0].corporateRoutes.length,2);assert.equal(merged[0].sources.length,2);
 assert.match(merged[0].notes,/Earlier finding/);assert.match(merged[0].notes,/Later finding/);assert.equal(JSON.stringify([first,second]),before);
 const repeated=mergeContactRecords([...merged,first,second]);assert.deepEqual(repeated,merged);
 assert.equal(mergeContactRecords([first,{...first,asset:'Different Site'}]).length,2);
 assert.equal(mergeContactRecords([first,{...first,email:'other@example.com'}]).length,2);
});

test('5: malformed or absent Pulse confirmations never become sent',async()=>{
 for(const json of [async()=>{throw Error('truncated');},async()=>null,async()=>({}),async()=>({sent:'true'}),async()=>({sent:false})]){
  const client=new PulseClient({key:'mock-key',fetchImpl:async()=>({ok:true,status:200,json})});
  const result=await client.send({to:'fixture@example.com'});assert.equal(result.status,'failed');assert.match(result.error,/unconfirmed/);
 }
 assert.equal((await new PulseClient({key:'mock-key',fetchImpl:async()=>({ok:true,status:200,json:async()=>({sent:true,emailMessageId:'test'})})}).send({})).status,'sent');
});

test('6: a deferred send cannot display its success or error on a different record',async()=>{
 for(const outcome of ['success','error']){
  const statuses={a:{textContent:''},b:{textContent:'Record B unchanged'}};let finish,fail;
  const api={send:()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject;})};
  const pulse=PulseSendController.forPath('/wind-projects',api);pulse.status={enabled:true};
  const card={querySelector:selector=>selector==='.pulse-send-status'?statuses[app.detailRecordId]:{disabled:false,textContent:''},querySelectorAll:()=>[{dataset:{pulseRecipient:'fixture@example.com',name:'Person',origin:'published'}}]};
  const app={detailRecordId:'a',windWorkflow:()=>({}),root:{addEventListener(){},querySelector:selector=>selector==='#outreach-draft'?{value:'Subject: Test\n\nTest body.'}:selector==='[data-pulse-mode]:checked'?{value:'separate'}:selector==='[data-pulse-card]'?card:null}};
  pulse.attach(app);pulse.refresh=async()=>{};const pending=pulse.send({name:'Record A'});app.detailRecordId='b';
  if(outcome==='success')finish({summary:{sent:1,blocked:0,failed:0},results:[]});else fail(Error('Record A failure'));
  await pending;assert.equal(statuses.b.textContent,'Record B unchanged');assert.equal(pulse.sending,false);
 }
});

test('7: portfolio transition clears the selected record and writes the portfolio URL',()=>{
 const window={location:{origin:'http://localhost:8181',hash:'#record/a/outreach'}};
 const context=vm.createContext({document:{addEventListener(){}},window,URL});
 vm.runInContext(appSource.replace(/export class /g,'class ')+'\nglobalThis.App=OpportunityPlatformApp;',context);
 const app=Object.create(context.App.prototype);let renders=0;
 Object.assign(app,{detailRecordId:'a',detailTab:'outreach',resetBreadcrumb(){},pipeline:{render(){renders++;}}});app.showPortfolio();
 assert.equal(app.detailRecordId,null);assert.equal(app.detailTab,'overview');assert.equal(window.location.hash,'portfolio');assert.equal(renders,1);
 assert.match(appSource,/onChange:list=>this\.showPortfolio\(\)/);
});

test('8: NDA checks and cited quotations follow Original versus Proposed without changing saved evidence',async()=>{
 const source=await readFile(new URL('../../modules/nda-guard/comparison-core.js',import.meta.url),'utf8');const context=vm.createContext({});vm.runInContext(source,context);const C=context.DealGuardCore;
 const block=id=>({id,location:'fixture '+id,runs:[{text:'Protection lasts ',revision:null},{text:'one year',revision:{type:'deleted'}},{text:'five years',revision:{type:'inserted'}},{text:'.',revision:null}]});
 const rows=[{topic:'term',matches:[{blocks:['term']}]},{topic:'circumvention',matches:[{blocks:['circumvention']}]}];
 const baseline=Array.from({length:10},(_,index)=>({id:'base'+index,text:'Protection lasts five years.',location:'baseline'}));
 const record={baseline,extracted:{blocks:[block('term'),block('circumvention')],coverage:'full'},mappings:{original:{rows},proposed:{rows}},riskAnalysis:{view:'proposed',historic:true}};
 const before=JSON.stringify(record),original=C.riskForView(record,'original'),proposed=C.riskForView(record,'proposed');
 assert.equal(original.blocking,true);assert.equal(original.risks[0].observedDurationMonths,12);assert.match(original.risks[0].uploaded[0].quote,/one year/);assert.doesNotMatch(original.risks[0].uploaded[0].quote,/five years/);
 assert.equal(proposed.blocking,false);assert.equal(proposed.risks[0].observedDurationMonths,60);assert.equal(C.riskForView(record,'markup').view,'proposed');assert.equal(JSON.stringify(record),before);
 const app=await readFile(new URL('../../modules/nda-guard/comparison-app.js',import.meta.url),'utf8');assert.match(app,/C\.riskForView\(r,state\.view\)/);
});

test('9: NDA only offers available absolute fixture URLs and an absolute PDF worker URL',async()=>{
 const app=await readFile(new URL('../../modules/nda-guard/comparison-app.js',import.meta.url),'utf8');const core=await readFile(new URL('../../modules/nda-guard/comparison-core.js',import.meta.url),'utf8');
 assert.match(app,/value="\/nda-guard\/NDA_1__Viktoriia_V2\.docx"/);assert.doesNotMatch(app,/INERATEC_NDA_Non-CircumventionKlausel/);assert.match(core,/workerSrc='\/nda-guard\/vendor\/pdf\.worker/);
});

test('10: corrupt local registration preserves evidence and pauses only new registrations',async()=>{
 const temporary=await mkdtemp(path.join(tmpdir(),'8181-p2-catalog-')),file=path.join(temporary,'platform-shell/data/reoon-local-contacts.json');await mkdir(path.dirname(file),{recursive:true});await writeFile(file,'{broken');
 const known='known@example.com',catalog=await loadContactCatalog(temporary,{windProjects:[{contacts:[{email:known,source:'https://example.com'}]}]});
 assert.equal(catalog.registrationStatus().available,false);assert.ok(catalog.allowedEmails.has(known));await catalog.register({},[known]);
 assert.throws(()=>catalog.register({module:'/wind-projects',recordId:'a',name:'Person',email:'new@example.com',provenance:'manual-contact-entry'},['new@example.com']),error=>error.status===503);
 assert.equal(await readFile(file,'utf8'),'{broken');
});
