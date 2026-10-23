import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {buildPickerDraft,publicProject} from '../project-picker-drafts.js';
import {buildDraftV2,subjectVariantsV2,seniority,greetingV2,ctaV2,CONFIDENTIALITY,EASY_REPLY} from '../outreach-draft-v2.js';
import {listedProjects} from '../../listed-projects/data/source.js';
import {outreachProject} from '../outreach-export.js';
import {checkAnonymity} from '../outreach-policy.js';
import {parseDraft} from '../../../platform-shell/shared/js/pulse-format.js';
import {SendRequest} from '../../../platform-shell/server/pulse/send-request.mjs';
import {PulseSendService} from '../../../platform-shell/server/pulse/send-service.mjs';

export const examplePeople=[
 {name:'Dr María Álvarez',jobTitle:'Chief Executive Officer',email:'maria@example.com'},
 {name:'André Dubois',jobTitle:'Investment Director',email:'andre@example.com'},
 {name:'Sofía Martín',jobTitle:'Investment Analyst',email:'sofia@example.com'},
 {name:'Company team',jobTitle:'',email:'info@example.com'}
];
const projects=listedProjects.map(outreachProject),module={key:'investors-jv',assertChecks(){}};
const request=(person,selection=[projects[0]],mode='separate')=>({recordId:'synthetic-fixture',mode,...parseDraft(buildDraftV2(selection,{person}).draft),recipients:[{...person,field:'to'}]});

test('job titles classify seniority without mistaking vice presidents for presidents; greetings retain accents and never guess honorifics',()=>{
 for(const jobTitle of ['Chief Executive','CEO','COO','CFO','CIO','CTO','President','Chair','Chairman','Managing Director','Founder','Owner','General Partner','Board Member'])assert.equal(seniority({name:'María Álvarez',jobTitle}),'c-level',jobTitle);
 for(const jobTitle of ['Director','Vice President','VP','Head of Development','General Manager','Partner'])assert.equal(seniority({name:'María Álvarez',jobTitle}),'director',jobTitle);
 assert.equal(seniority({name:'María Álvarez',jobTitle:'Analyst'}),'other');
 for(const name of ['','Investment team','Trading desk','Office','Department'])assert.equal(seniority({name,jobTitle:'CEO'}),'shared');
 assert.equal(seniority({name:'María Álvarez',email:'info@example.com',jobTitle:'CEO'}),'shared');
 for(const person of examplePeople){assert.equal(greetingV2(person),greetingV2({...person}));assert.doesNotMatch(greetingV2(person),/\b(?:Mr|Ms)\b/);}
 const variants=new Set(Array.from({length:20},(_,index)=>greetingV2({name:'André Dubois',jobTitle:'Director',email:`synthetic${index}@example.com`})));
 assert.deepEqual(variants,new Set(['Dear André,','Hello André,']));
});

test('every technology/stage/size combination has two anonymous subjects retaining the available region at both levels',()=>{
 for(const technology of ['Solar PV','Onshore wind'])for(const stage of ['Development','Pre-construction','Ready-to-build'])for(const mwBand of ['under 20 MW','20-50 MW','50-100 MW','100-200 MW','200-400 MW','400+ MW'])for(const anonymity of ['balanced','strict'])for(const plural of [false,true]){
  const project={technology,stage,mwBand,regionBand:'Southern Europe'},selection=plural?[project,{...project}]:[project];
  const subjects=subjectVariantsV2(selection,{anonymity});assert.equal(subjects.length,2);assert.notEqual(subjects[0],subjects[1]);
  for(const subject of subjects){assert.ok(subject.length<=100,subject);assert.equal(checkAnonymity(subject).safe,true,subject);assert.doesNotMatch(subject,/\d|\b(?:two|three|four|five|six|urgent|free|exclusive)\b|!/i);}
  if(anonymity==='balanced')assert.match(subjects.join(' '),/Southern Europe/);
  if(anonymity==='balanced'&&stage==='Pre-construction')assert.match(subjects[0],/advanced development/);
  if(anonymity==='strict')assert.doesNotMatch(subjects.join(' '),/Southern Europe|large-scale|mid-size|ready-to-build/i);
 }
 assert.equal(subjectVariantsV2([],{sectors:['Solar PV']})[0],'Quick check on your solar investment criteria');
 assert.deepEqual(subjectVariantsV2([projects[0]]),subjectVariantsV2([{...projects[0],id:'hidden',internalName:'SECRET',owner:'SECRET',location:'SECRET',capacity:98765}]));
});

test('all six-project subsets, message variants, seniorities and anonymity levels are short, count-free, identifier-free and end with CTA/easy-reply/signoff',()=>{
 let checked=0;
 for(let mask=1;mask<64;mask++)for(const person of examplePeople)for(const variant of ['intro','investment','jv'])for(const anonymity of ['balanced','strict']){
  const selection=projects.filter((_item,index)=>mask&(1<<index));
  const value=buildPickerDraft({company:'DO NOT LEAK',intent:'SECRET 80 MW',scale:'LEAK'},selection,{variant,recipient:person.name,recipientEmail:person.email,jobTitle:person.jobTitle,anonymity});
  assert.equal(value.safe,true,`${mask}/${variant}/${person.jobTitle}/${anonymity}: ${value.message}`);assert.ok(value.words<150);
  assert.equal(checkAnonymity(value.draft).safe,true);assert.doesNotMatch(value.draft,/\b(?:MWp?|MWh|kV)\b|\d+\s*[-–]\s*\d+|\b(?:one|two|three|four|five|six)\s+(?:(?:solar PV|wind|renewable-energy)\s+)?(?:projects?|opportunities)\b|DO NOT LEAK|SECRET|LEAK/);
  for(const item of listedProjects)for(const name of [item.name,item.id,item.owner,item.country].filter(Boolean))assert.equal(value.draft.toLowerCase().includes(name.toLowerCase()),false,name);
  const body=parseDraft(value.draft).body,cta=ctaV2(person,value.technology);
  assert.ok(body.indexOf(CONFIDENTIALITY)<body.indexOf(cta));assert.ok(body.endsWith(`${cta}\n${EASY_REPLY}\n\nKind regards,`));
  assert.equal((body.match(/\?/g)||[]).length,1);if(selection.length>1)assert.match(body,/any of them/);
  checked++;
 }
 assert.equal(checked,1512);
});

test('missing fields and hostile subjects fail disclosure; V1 bands are blocked in V2 but not in explicit rollback policy',()=>{
 const draft=buildPickerDraft({},[{...projects[0],stage:''}]);assert.equal(draft.safe,false);assert.equal(checkAnonymity(draft.draft).safe,false);
 for(const subject of ['Drin','Sarandë','We Green Energo','100-200 MW','300 MW','two solar PV projects','six projects','secret@example.com','https://example.com'])assert.equal(checkAnonymity(subject).safe,false,subject);
 assert.equal(checkAnonymity('100-200 MW',undefined,true,false).safe,true);
});

test('one-by-one and grouped sends use stored seniority, preserve safety and have stable keys for identical content',()=>{
 const input={...request(examplePeople[0]),recipients:examplePeople.map(person=>({...person,field:'to'}))};
 const calls=SendRequest.parse(input,module).calls();assert.equal(calls.length,4);assert.deepEqual(calls,SendRequest.parse(input,module).calls());
 for(const [index,person]of examplePeople.entries()){assert.ok(calls[index].payload.body_text.startsWith(greetingV2(person)));assert.match(calls[index].payload.body_text,new RegExp(seniority(person)==='c-level'?'call next week':seniority(person)==='shared'?'please forward this':'next two weeks'));}
 const together=SendRequest.parse({...input,mode:'together'},module).calls();assert.match(together[0].payload.body_text,/^Hello(?: team)?,/);assert.doesNotMatch(together[0].payload.body_text,/Dr María|André|Sofía/);
 const single=SendRequest.parse(request(examplePeople[0],undefined,'together'),module).calls();assert.ok(single[0].payload.body_text.startsWith(greetingV2(examplePeople[0])));
});

test('server checks subjects and personalized content before history or mock sending, including the word limit',async()=>{
 let calls=0;const service=new PulseSendService({client:{enabled:true,async send(){calls++;throw Error('Never send');}}});
 const guarded={...module,history:{begin(){calls++;throw Error('Must not record rejected draft');}}};
 const base=request(examplePeople[0]);
 for(const patch of [{subject:'Drin'},{subject:'100-200 MW solar project'},{body:base.body+'\n80 MW'},{body:base.body+'\n'+('extra '.repeat(150))},{recipients:[{name:'Drin',jobTitle:'CEO',email:'test@example.com'}]}])await assert.rejects(service.send(guarded,{...base,...patch}),error=>error.status===422);
 assert.equal(calls,0);
});

test('V2 off exactly matches the named backup for generated drafts, subject/body checks, picker markup, personalized calls and idempotency',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'8181-v2-rollback-'));
 const files=['modules/investors-jv/project-picker-drafts.js','modules/investors-jv/project-picker.js','modules/investors-jv/project-picker-rules.js','modules/investors-jv/outreach-policy.js','modules/investors-jv/outreach-settings.js','modules/investors-jv/outreach-draft-v2.js','modules/investors-jv/outreach-export.js','modules/investors-jv/sectors.js','modules/listed-projects/data/source.js','platform-shell/server/pulse/send-request.mjs','platform-shell/shared/js/pulse-format.js','platform-shell/shared/js/pulse-modules.js'];
 const backup=new URL('../../../backups/outreach-subject-greeting-cta-20261023-1130/',import.meta.url);
 try{
  for(const kind of ['off','backup']){
   for(const file of files){const destination=path.join(root,kind,file);await mkdir(path.dirname(destination),{recursive:true});let source=new URL('../../../'+file,import.meta.url);if(kind==='backup'){try{await readFile(new URL(file,backup));source=new URL(file,backup);}catch{}}
    await copyFile(source,destination);
   }
   await writeFile(path.join(root,kind,'package.json'),'{"type":"module"}');
   if(kind==='off')await writeFile(path.join(root,kind,'modules/investors-jv/outreach-settings.js'),"export const OUTREACH_PROJECT_PICKER=true;export const OUTREACH_DRAFT_V2=false;export const OUTREACH_SUBJECT_ANONYMITY='balanced';");
  }
  const load=(kind,file)=>import(pathToFileURL(path.join(root,kind,file)).href);
  const off=await load('off','modules/investors-jv/project-picker-drafts.js'),old=await load('backup','modules/investors-jv/project-picker-drafts.js');
  const currentRequest=await load('off','platform-shell/server/pulse/send-request.mjs'),oldRequest=await load('backup','platform-shell/server/pulse/send-request.mjs');
  for(const selection of [[projects[0]],projects.slice(0,3),projects])for(const variant of ['intro','jv','investment'])for(const person of examplePeople){
   const options={variant,recipient:person.name,recipientEmail:person.email};
   const expected=old.buildPickerDraft({},selection,options),actual=off.buildPickerDraft({},selection,options);assert.deepEqual(actual,expected);
   for(const mode of ['separate','together']){const input={recordId:'fixture',mode,...parseDraft(actual.draft),recipients:[{...person,field:'to'}]};assert.deepEqual(currentRequest.SendRequest.parse(input,module).calls(),oldRequest.SendRequest.parse(input,module).calls());}
  }
  const currentPolicy=await load('off','modules/investors-jv/outreach-policy.js'),oldPolicy=await load('backup','modules/investors-jv/outreach-policy.js');
  for(const value of ['100-200 MW','two solar PV projects','Drin','Anonymous wind opportunity','20-minute call'])assert.deepEqual(currentPolicy.checkAnonymity(value),oldPolicy.checkAnonymity(value));
  const render=async kind=>{class App{bind(){}renderOutreachPanel(){return '<label for="investor-pitch-option">Message option</label>';}}class Navigation{restore(){}}
   const {installProjectPicker}=await load(kind,'modules/investors-jv/project-picker.js');installProjectPicker({OpportunityPlatformApp:App,PlatformNavigation:Navigation});const app=new App();Object.assign(app,{path:'/investors-jv',detailRecordId:'test',rows:[{id:'test',source:{sectors:['Solar PV']}}],windWorkflow:()=>({}),escape:String});return app.renderOutreachPanel({sectors:['Solar PV']});};
  assert.equal(await render('off'),await render('backup'));
 }finally{await rm(root,{recursive:true,force:true});}
});
