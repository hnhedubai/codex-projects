import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {listedProjects} from '../../listed-projects/data/source.js';
import {partnerRecords} from '../data/source.js';
import {outreachProject} from '../outreach-export.js';
import {checkAnonymity,PITCH_OPTIONS,buildAnonymousPitch} from '../outreach-policy.js';
import {pickerGreeting} from '../project-picker-rules.js';
import {buildLegacyPickerDraft as buildPickerDraft,buildPickerDraft as buildCurrentPickerDraft,pickerOptions,fitLabel,missingFields,publicProject} from '../project-picker-drafts.js';
import {installProjectPicker} from '../project-picker.js';
import {installInvestorOutreach} from '../outreach.js';
import {SendRequest} from '../../../platform-shell/server/pulse/send-request.mjs';
import {PulseSendService} from '../../../platform-shell/server/pulse/send-service.mjs';
import {parseDraft} from '../../../platform-shell/shared/js/pulse-format.js';

const projects=listedProjects.map(outreachProject),green=partnerRecords.find(record=>record.id==='green-genius');
const backup=new URL('../../../backups/outreach-before-project-picker-20261022-2211/',import.meta.url);
test('Green Genius receives JV, introduction and acquisition; unknown intent has criteria check without a project',()=>{
 assert.deepEqual(pickerOptions(green),['jv','intro','investment']);
 assert.deepEqual(pickerOptions({status:'Potential fit',partnerType:'Developer'}),['intro','criteria']);
 assert.deepEqual(pickerOptions({status:'Open — actively seeking investment/JV',partnerType:'Developer / equity seeking sponsor'}),['jv','intro']);
 assert.deepEqual(pickerOptions({status:'Acquisition mandate',partnerType:'Buyer'}),['investment','intro']);
 const result=buildPickerDraft({subSector:'Wind'},[],{variant:'criteria'});assert.equal(result.safe,true);assert.doesNotMatch(result.draft,/\bMW\b|Southern Europe|Pre-construction|Ready-to-build/);assert.match(result.draft,/development and investment criteria/);
});
test('every subset of six projects for every partner produces short, safe, unblended drafts without raw-text leaks',()=>{
 let count=0;
 for(const partner of partnerRecords)for(let mask=1;mask<64;mask++){
  const items=projects.filter((_project,index)=>mask&(1<<index));
  for(const variant of pickerOptions(partner)){
   const result=buildPickerDraft(partner,items,{variant});assert.equal(result.safe,true,`${partner.id}/${mask}/${variant}: ${result.message}`);assert.ok(result.words<150);
   for(const raw of [...listedProjects.flatMap(project=>[project.name,project.owner,project.id]),partner.company,partner.intent,partner.scale,partner.summary,partner.latestEvidence].filter(Boolean))assert.equal(result.draft.toLowerCase().includes(raw.toLowerCase()),false,`leaked ${raw}`);
   assert.doesNotMatch(result.draft,/GrynH2|Dubai|DIFC|https?:|@|\b(?:68\.4|150|130|80|45|30)\s*MWp?\b/);
   if(variant!=='criteria'){const groups=new Set(items.map(item=>JSON.stringify(publicProject(item))));assert.equal(result.draft.split('\n').filter(line=>line.startsWith('- ')).length,items.length>1?groups.size:0);}
   count++;
  }
 }
 assert.ok(count>3000);
});
test('greetings use the selected person or a generic greeting for shared routes; titles are retained',()=>{
 assert.equal(pickerGreeting('Jane Smith'),'Hello Jane,');assert.equal(pickerGreeting('Dr Maria Reyes'),'Hello Dr Reyes,');assert.equal(pickerGreeting('Investment Office'),'Hello,');assert.equal(pickerGreeting('Jane Smith','info@example.com'),'Hello,');
 const result=buildPickerDraft(green,[projects[0]],{recipient:'Dr Maria Reyes'});assert.match(result.draft,/Hello Dr Reyes,/);assert.equal(result.safe,true);
});

test('identical anonymous profiles are grouped without losing counts or merging distinct evidence',()=>{
 const solar=projects[0],second={...solar,id:'other-internal-id'};
 const result=buildPickerDraft(green,[solar,second]);
 assert.equal(result.safe,true);assert.match(result.draft,/100-200 MW each/);assert.match(result.draft,/\(two projects\)/);
 assert.equal(result.draft.split('\n').filter(line=>line.startsWith('- ')).length,1);
 const distinct=buildPickerDraft(green,[solar,{...second,strength:'Permit granted'}]);
 assert.equal(distinct.draft.split('\n').filter(line=>line.startsWith('- ')).length,2);assert.match(distinct.draft,/Permit granted/);
});

test('all template variants ask named executives directly and use routing only for shared recipients',()=>{
 for(const variant of ['intro','investment','jv','criteria']){
  const direct=buildPickerDraft(green,[projects[0]],{variant,recipient:'Dr Maria Reyes',recipientEmail:'maria@example.com'});
  const shared=buildPickerDraft(green,[projects[0]],{variant,recipient:'Dr Maria Reyes',recipientEmail:'info@example.com'});
  assert.equal(direct.safe,true);assert.equal(shared.safe,true);
  assert.match(direct.draft,/Hello Dr Reyes,/);assert.match(direct.draft,/Would you be open/);assert.doesNotMatch(direct.draft,/right decision-maker|direct this enquiry/);
  assert.match(shared.draft,/Hello,/);assert.match(shared.draft,/Could you direct this enquiry/);
 }
 assert.match(buildPickerDraft(green,[projects[0]],{audience:'shared',recipient:'Jane Smith'}).draft,/Hello,\n/);
});
test('fit badges distinguish technology, region and broad international focus without blocking selection',()=>{
 assert.equal(fitLabel(green,projects[1],['Wind']),'Check fit: region');
 assert.equal(fitLabel({country:'Albania'},projects[1],['Wind']),'Fits stated focus');
 assert.equal(fitLabel({country:'Albania'},projects[1],['Solar PV']),'Check fit: technology');
 assert.equal(fitLabel({country:'Germany'},projects[1],['e-SAF']),'Check fit: technology and region');
 for(const country of ['global','worldwide','Europe','Serbia','Bosnia','Turkey'])assert.equal(fitLabel({country},projects[1],['Wind']),'Fits stated focus');
 assert.equal(fitLabel({...green,source:{date:'research metadata'}},projects[1]),'Check fit: region');
});
test('missing or hostile banded fields stay visible as blocked placeholders; optional strengths are evidence allowlisted',()=>{
 const project={...projects[0],technology:'Secret turbine owner',mwBand:'150 MW',regionBand:''};
 assert.deepEqual(missingFields([project]),['technology','MW band','region band']);
 const result=buildPickerDraft(green,[project]);assert.equal(result.safe,false);assert.match(result.draft,/\[Missing: technology\]/);assert.doesNotMatch(result.draft,/Secret turbine owner|150 MW/);
 assert.doesNotMatch(buildPickerDraft(green,[{...projects[0],strength:'Excellent IRR'}]).draft,/Excellent IRR/);
 assert.match(buildPickerDraft(green,[{...projects[0],strength:'Permit granted'}]).draft,/Permit granted/);
 const all=buildPickerDraft(green,projects.map(project=>({...project,strength:'Grid application submitted'})),{variant:'jv'});assert.ok(all.words<150);assert.equal(all.safe,true);
});
test('known identifier gate accepts only exact requested bands/counts/call phrase, not exact capacities or placeholders',()=>{
 for(const band of ['under 20 MW','20-50 MW','50-100 MW','100-200 MW','200-400 MW','400+ MW'])assert.equal(checkAnonymity(`Opportunity ${band}.`,undefined,true,false).safe,true,band);
 for(const value of ['80 MW','150 MW','100-200 MWp','20 kV','68.4 MW','50 MW','19%','[Missing: stage]','Drin','GrynH2','Dubai','DIFC'])assert.equal(checkAnonymity(value).safe,false,value);
 assert.equal(checkAnonymity('20-minute introductory call').safe,true);assert.equal(checkAnonymity('20-minute introductory call',listedProjects,false).safe,false);
});

async function realApp(source){
 const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL});
 vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.App=OpportunityPlatformApp;',context);return context.App;
}
test('disabled picker leaves shared baseline renderer/prototypes and two saved partner drafts unchanged',async()=>{
 const baseline=await readFile(new URL('platform-shell/shared/js/platform-app.js',backup),'utf8');
 const current=await readFile(new URL('../../../platform-shell/shared/js/platform-app.js',import.meta.url),'utf8');
 const Baseline=await realApp(baseline),Current=await realApp(current);assert.equal(Current.prototype.renderOutreachPanel.toString(),Baseline.prototype.renderOutreachPanel.toString());
 const adapter=await readFile(new URL('../outreach.js',import.meta.url),'utf8');assert.match(adapter,/offerContext/); // Additive offer-version metadata; existing UI renderer below is unchanged.
 const App=await realApp(current);class Navigation{restore(){}captureField(){}}
 installInvestorOutreach({OpportunityPlatformApp:App,PlatformNavigation:Navigation});
 const app=Object.create(App.prototype);Object.assign(app,{path:'/investors-jv',detailTab:'outreach',pulse:{renderChecklist:()=>'<section>baseline checks</section>',renderCard:()=>'<section>baseline recipients, modes, signature and history</section>'},renderImportedOutreachHistory:()=>'',renderSendHistorySync:()=>''});
 const prior=App.prototype.renderOutreachPanel,priorRestore=Navigation.prototype.restore;
 const before=[];for(const id of ['saved-a','saved-b']){app.detailRecordId=id;app.windWorkflow=()=>({outreachDraft:`Existing ${id} draft`,outreachNotes:'Keep notes'});before.push(app.renderOutreachPanel({name:'Test',contacts:[]}));}
 installProjectPicker({OpportunityPlatformApp:App,PlatformNavigation:Navigation,enabled:false});assert.equal(App.prototype.renderOutreachPanel,prior);assert.equal(Navigation.prototype.restore,priorRestore);
 for(const [index,id]of ['saved-a','saved-b'].entries()){app.detailRecordId=id;app.windWorkflow=()=>({outreachDraft:`Existing ${id} draft`,outreachNotes:'Keep notes'});assert.equal(app.renderOutreachPanel({name:'Test',contacts:[]}),before[index]);}
});
test('the actual false setting restores the original strict gate, not just the UI switch',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'8181-picker-off-'));
 try{
  const files=['modules/investors-jv/outreach-policy.js','modules/investors-jv/project-picker-rules.js','modules/listed-projects/data/source.js'];
  for(const file of files){const target=path.join(directory,file);await mkdir(path.dirname(target),{recursive:true});await copyFile(new URL('../../../'+file,import.meta.url),target);}
  await writeFile(path.join(directory,'package.json'),'{"type":"module"}');await writeFile(path.join(directory,'modules/investors-jv/outreach-settings.js'),"export const OUTREACH_PROJECT_PICKER=false;export const OUTREACH_DRAFT_V2=false;export const OUTREACH_SUBJECT_ANONYMITY='balanced';");
  const off=await import(pathToFileURL(path.join(directory,'modules/investors-jv/outreach-policy.js')).href);
  const oldSource=(await readFile(new URL('modules/investors-jv/outreach-policy.js',backup),'utf8')).replace(/^import .*$/gm,'').replace(/export (const|function)/g,'$1');const context=vm.createContext({listedProjects});vm.runInContext(oldSource+'\nglobalThis.check=checkAnonymity;',context);
  for(const value of ['Anonymous wind opportunity','50-100 MW','20-minute call','Drin','[Name]','info@example.com'])assert.equal(JSON.stringify(off.checkAnonymity(value)),JSON.stringify(context.check(value)));
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('Pulse keeps both modes and ten-recipient gate; new Hello greeting is personalized once and shared routes stay generic',()=>{
 const draft=parseDraft(buildCurrentPickerDraft(green,[projects[1]],{variant:'jv'}).draft),module={key:'investors-jv',assertChecks(){}};
 const input={recordId:'fixture',mode:'separate',...draft,recipients:[{email:'person@example.com',name:'Dr Maria Reyes',jobTitle:'CEO'},{email:'info@example.com',name:'Jane Smith'}]};
 const calls=SendRequest.parse(input,module).calls();assert.match(calls[0].payload.body_text,/^Dear (?:Dr Reyes|Maria Reyes),/);assert.match(calls[1].payload.body_text,/^Hello(?: team)?,/);assert.equal(calls.length,2);
 assert.match(calls[0].payload.body_text,/Would a 20-minute call next week/);assert.doesNotMatch(calls[0].payload.body_text,/forward this|point me/);
 assert.match(calls[1].payload.body_text,/Could you please forward this/);assert.doesNotMatch(calls[1].payload.body_text,/Would a 20-minute call/);
 const together=SendRequest.parse({...input,mode:'together',recipients:[{email:'a@example.com',field:'to'},{email:'b@example.com',field:'cc'},{email:'c@example.com',field:'bcc'}]},module).calls();assert.equal(together.length,1);assert.equal(together[0].payload.cc,'b@example.com');assert.equal(together[0].payload.bcc,'c@example.com');
 assert.throws(()=>SendRequest.parse({...input,recipients:Array.from({length:11},(_,index)=>({email:`p${index}@example.com`}))},module),/up to 10/);
});
test('server disclosure checks run after personalization and before any mock send/history action',async()=>{
 const module={key:'investors-jv',assertChecks(){},history:{begin(){throw Error('must not write');}}};
 let calls=0;const service=new PulseSendService({client:{enabled:true,send(){calls++;throw Error('must not send');}}});
 const base={recordId:'fixture',mode:'separate',...parseDraft(buildCurrentPickerDraft(green,[projects[1]]).draft),recipients:[{email:'fixture@example.com',name:'Drin'}]};
 await assert.rejects(service.send(module,base),error=>error.status===422);assert.equal(calls,0);
});
function pickerHarness(){
 class App{bind(){}renderOutreachPanel(){return '<textarea id="outreach-draft">baseline</textarea><label for="investor-pitch-option">Message option</label>';}handleDetailAction(){}}
 const entries=new Map(),workflows={a:{outreachDraft:'Saved draft A',outreachNotes:'Keep A'},b:{outreachDraft:'Saved draft B',outreachNotes:'Keep B'}};
 class Navigation{restore(){const fields=this.drafts.read(this.current).fields||{};app.editor.value=fields['outreach-draft']?.value??workflows[this.current.id].outreachDraft;}captureField(){}}
 installInvestorOutreach({OpportunityPlatformApp:App,PlatformNavigation:Navigation});
 installProjectPicker({OpportunityPlatformApp:App,PlatformNavigation:Navigation,projects});
 const app=new App(),nav=new Navigation(),events={change:[],click:[]};
 const controls=projects.map(project=>({checked:false,dataset:{outreachProject:project.id},matches:selector=>selector.includes('data-outreach-project')}));
 const status={},suggestions={},box={hidden:true,querySelector:()=>({focus(){}})},copy={};
 app.editor={value:workflows.a.outreachDraft};
 const nodes={'#picker-audience':{id:'picker-audience',value:'auto'},'#investor-pitch-option':{id:'investor-pitch-option',value:'intro'},'#outreach-draft':app.editor,'[data-project-picker]':{},'[data-picker-status]':status,'[data-picker-subjects]':{},'[data-picker-suggestions]':suggestions,'[data-pitch-confirmation]':box,'[data-anonymity-status]':{},'[data-detail-action="copy-outreach-draft"]':copy};
 const root={ownerDocument:{getElementById:()=>true},querySelector:selector=>nodes[selector],querySelectorAll:selector=>selector==='[data-outreach-project]'?controls:selector==='[data-outreach-project]:checked'?controls.filter(input=>input.checked):[],addEventListener:(name,listener)=>events[name].push(listener)};
 Object.assign(app,{root,path:'/investors-jv',detailTab:'outreach',detailRecordId:'a',rows:[{id:'a',source:green},{id:'b',source:{...green,id:'b'}}],navigation:nav,windWorkflow:id=>workflows[id],escape:value=>String(value).replaceAll('<','&lt;'),pulse:{refreshReadiness(){}}});
 Object.assign(nav,{app,current:{path:'/investors-jv',id:'a',tab:'outreach'},drafts:{read:route=>entries.get(route.id)||{},write(route,value){if(this.fail)return false;entries.set(route.id,value);return true;},cache:new Map(),key:route=>route.id},status(message){this.message=message;}});
 app.bind();nav.restore();
 const change=input=>events.change.forEach(listener=>listener({target:input}));
 const click=(action,variant,subject)=>events.click.forEach(listener=>listener({target:{closest:()=>({dataset:{pickerAction:action,pickerVariant:variant,pickerSubject:subject}})}}));
 return {app,nav,entries,controls,status,suggestions,box,workflows,change,click,copy};
}
test('picker toggles update suggestions and selection count without reloading or editing existing saved drafts',()=>{
 const view=pickerHarness(),before=JSON.stringify(view.workflows);assert.match(view.status.textContent,/0 of 6/);assert.equal(view.app.editor.value,'Saved draft A');
 view.controls[0].checked=true;view.change(view.controls[0]);assert.match(view.status.textContent,/1 of 6/);assert.equal(view.app.pickerDrafts.size,3);assert.match(view.suggestions.innerHTML,/Use this draft/);assert.equal(view.app.editor.value,'Saved draft A');
 view.click('all');assert.match(view.status.textContent,/6 of 6/);view.click('clear');assert.match(view.status.textContent,/0 of 6/);assert.equal(JSON.stringify(view.workflows),before);
});
test('one-click draft use preserves previous text and restores it without confirmation across partners',()=>{
 const view=pickerHarness();view.controls[0].checked=true;view.change(view.controls[0]);view.click('use','jv');assert.equal(view.box.hidden,true);
 assert.match(view.app.editor.value,/independent introducer/);assert.equal(view.entries.get('a').pitchVersions[0].text,'Saved draft A');
 view.nav.current.id='b';view.app.detailRecordId='b';view.nav.restore();assert.equal(view.app.editor.value,'Saved draft B');assert.match(view.status.textContent,/0 of 6/);
 view.nav.current.id='a';view.app.detailRecordId='a';view.nav.restore();assert.match(view.app.editor.value,/independent introducer/);assert.match(view.status.textContent,/1 of 6/);
 view.app.handleDetailAction('restore-investor-pitch');assert.equal(view.app.editor.value,'Saved draft A');assert.equal(view.workflows.b.outreachDraft,'Saved draft B');assert.equal(view.workflows.a.outreachNotes,'Keep A');
});
test('changing project selection leaves the applied draft untouched; missing fields remain blocked',()=>{
 const view=pickerHarness();view.controls[0].checked=true;view.change(view.controls[0]);view.click('use','intro');const applied=view.app.editor.value;view.click('clear');assert.equal(view.app.pendingInvestorPitch,null);assert.equal(view.box.hidden,true);assert.equal(view.app.editor.value,applied);
 view.app.editor.value=buildCurrentPickerDraft(green,[{...projects[0],stage:''}]).draft;view.app.refreshOutreachSafety();assert.equal(view.copy.disabled,true);
});
test('selection storage failure never overwrites the editor or saved workflow',()=>{
 const view=pickerHarness();view.nav.drafts.fail=true;view.controls[0].checked=true;view.change(view.controls[0]);assert.match(view.nav.message,/could not be saved/);assert.equal(view.app.editor.value,'Saved draft A');assert.equal(view.workflows.a.outreachDraft,'Saved draft A');
});

test('audience selection persists per company and refreshes suggestions without replacing an existing draft',()=>{
 const view=pickerHarness();view.controls[0].checked=true;view.change(view.controls[0]);
 const audience=view.app.root.querySelector('#picker-audience');audience.value='shared';view.change(audience);
 assert.equal(view.entries.get('a').projectPicker.audience,'shared');assert.match(view.app.pickerDrafts.get('intro').draft,/please forward this/);assert.equal(view.app.editor.value,'Saved draft A');
 view.nav.current.id='b';view.app.detailRecordId='b';view.nav.restore();assert.equal(audience.value,'auto');
 view.nav.current.id='a';view.app.detailRecordId='a';view.nav.restore();assert.equal(audience.value,'shared');
});

test('message selection immediately applies the selected-project draft; storage failure preserves current text',()=>{
 const view=pickerHarness();view.controls[0].checked=true;view.change(view.controls[0]);
 const option=view.app.root.querySelector('#investor-pitch-option');option.value='intro';view.change(option);
 assert.equal(view.app.editor.value,view.app.pickerDrafts.get('intro').draft);assert.equal(view.entries.get('a').pitchVersions[0].text,'Saved draft A');assert.equal(view.box.hidden,true);
 const before=view.app.editor.value;view.nav.drafts.fail=true;option.value='jv';view.change(option);
 assert.equal(view.app.editor.value,before);assert.match(view.nav.message,/not changed/);
});

test('offer association follows the applied draft, not later selections; edited drafts cannot be mislabelled',()=>{
 const view=pickerHarness();view.controls[0].checked=true;view.change(view.controls[0]);view.click('use','intro');
 assert.deepEqual(view.app.projectOfferContext().projectIds,[projects[0].id]);
 view.click('clear');view.controls[1].checked=true;view.change(view.controls[1]);
 assert.deepEqual(view.app.projectOfferContext().projectIds,[projects[0].id]);
 view.app.editor.value+='\nUser edit';assert.throws(()=>view.app.projectOfferContext(),/edited/);
 view.app.handleDetailAction('restore-investor-pitch');assert.equal(view.app.editor.value,'Saved draft A');assert.throws(()=>view.app.projectOfferContext(),/Link/);view.click('clear');assert.equal(view.app.projectOfferContext(),null);
});

test('one-click manual linking records only explicitly selected projects without changing the edited message',()=>{
 const view=pickerHarness();view.controls[2].checked=true;view.change(view.controls[2]);view.app.editor.value='Subject: Anonymous opportunity\n\nHello, a wind opportunity.';
 const before=view.app.editor.value;view.click('link');assert.deepEqual(view.app.projectOfferContext().projectIds,[projects[2].id]);assert.equal(view.app.editor.value,before);
 view.nav.drafts.fail=true;view.controls[3].checked=true;view.change(view.controls[3]);view.click('link');assert.deepEqual(view.app.projectOfferContext().projectIds,[projects[2].id]);
});

test('subject choice preserves body, previous draft, offer association and selection; failed storage leaves the editor unchanged',()=>{
 const view=pickerHarness();view.controls[0].checked=true;view.change(view.controls[0]);view.click('use','intro');
 const before=view.app.editor.value,body=before.slice(before.indexOf('\n'));view.click('subject',undefined,'1');
 assert.equal(view.app.editor.value,`Subject: ${view.app.pickerSubjects[1]}${body}`);assert.equal(view.entries.get('a').pitchVersions.at(-1).text,before);
 assert.deepEqual(view.app.projectOfferContext().projectIds,[projects[0].id]);assert.equal(view.entries.get('a').projectPicker.subjectVariant,1);
 const current=view.app.editor.value;view.nav.drafts.fail=true;view.click('subject',undefined,'0');assert.equal(view.app.editor.value,current);assert.match(view.nav.message,/not changed/);
 view.nav.drafts.fail=false;view.app.handleDetailAction('restore-investor-pitch');assert.equal(view.app.editor.value,before);
 view.app.editor.value+='\n80 MW';view.click('subject',undefined,'0');assert.match(view.nav.message,/restricted details/);
});
