import test from 'node:test';
import assert from 'node:assert/strict';
import {PITCH_OPTIONS,buildAnonymousPitch,checkAnonymity,recipientContext} from '../outreach-policy.js';
import {installInvestorOutreach} from '../outreach.js';
import {partnerRecords} from '../data/source.js';
import {listedProjects} from '../../listed-projects/data/source.js';
import {PulseSendService} from '../../../platform-shell/server/pulse/send-service.mjs';
import {SendModule} from '../../../platform-shell/server/pulse/send-modules.mjs';
import {parseDraft} from '../../../platform-shell/shared/js/pulse-format.js';

test('all partner records receive three distinct anonymous project pitches',()=>{
 assert.equal(PITCH_OPTIONS.length,3);
 for(const record of partnerRecords){
  const drafts=PITCH_OPTIONS.map(option=>buildAnonymousPitch(record,option.id));
  assert.equal(new Set(drafts).size,3);
  for(const draft of drafts){assert.equal(checkAnonymity(draft).safe,true);assert.match(draft,/Listed Projects/);assert.match(draft,/owner permissions/);assert.doesNotMatch(draft,/\d/);}
 }
});
test('raw recipient and project free text cannot leak through generation',()=>{
 const record={name:'Drin owner',intent:'Secret acquisition 80 MW Sarande',subSector:'wind'};
 const hostile=listedProjects.map(project=>({...project,name:'SECRET',capacity:'LEAK',summary:'LEAK',owner:'HOSTILE'}));
 assert.doesNotMatch(buildAnonymousPitch(record,'investment',hostile),/SECRET|LEAK|HOSTILE|Sarande|Drin|80/);
 assert.throws(()=>buildAnonymousPitch({},'unknown'));
 assert.throws(()=>buildAnonymousPitch({},'intro',[]));
});
test('recipient classifications do not misrepresent capital seekers or offshore focus as buyers',()=>{
 assert.match(recipientContext({intent:'Seeking an aligned equity partner for our own wind project'}),/raising capital for your own/);
 assert.match(recipientContext({subSector:'Floating offshore wind'}),/extend to onshore/);
 assert.match(recipientContext({intent:'Buying wind projects in Poland'}),/fit would need to be confirmed/);
});
test('disclosure gate blocks known identities, diacritics, numbers, routes and documents',()=>{
 for(const text of ['Sarandë','WE GREEN ENERGO','Kosovo','Sushevo 2','Drin','Nordex','Dear 80 MW team,','eighty megawatts','EUR investment','ten million','contact@company.com','https://example.com','company.energy','brief.pdf','19%'])assert.equal(checkAnonymity(text).safe,false,text);
 assert.equal(checkAnonymity('An anonymous onshore wind opportunity, subject to diligence.').safe,true);
 for(const project of listedProjects)assert.equal(checkAnonymity(project.name).safe,false);
});
function ui(){
 class App{renderOutreachPanel(){return '<h2>Draft an introductory enquiry</h2><label class="sr-only" for="outreach-draft">Email</label><textarea id="outreach-draft">old default</textarea>';}handleDetailAction(action){this.lastAction=action;}}
 class Navigation{restore(){}captureField(){}}
 installInvestorOutreach({OpportunityPlatformApp:App,PlatformNavigation:Navigation});
 const app=new App(),editor={value:'User draft: preserve me'},picker={value:'jv'},copy={},status={};
 const fields={'#outreach-draft':editor,'#investor-pitch-option':picker,'[data-anonymity-status]':status,'[data-detail-action="copy-outreach-draft"]':copy};
 let entry={fields:{other:{value:'keep'}}};let accepted=true,saved=true;
 const nav=new Navigation();Object.assign(nav,{current:{id:'a',path:'/investors-jv',tab:'outreach'},browser:{confirm:()=>accepted},status(message){this.message=message;},drafts:{read:()=>entry,write(_route,value){if(saved)entry=value;return saved;},key:()=> 'a',cache:new Map()}});
 Object.assign(app,{path:'/investors-jv',detailTab:'outreach',detailRecordId:'a',rows:[{id:'a',source:{subSector:'Wind'}}],root:{querySelector:key=>fields[key]},navigation:nav,windWorkflow:()=>({}),escape:value=>value,pulse:{refreshReadiness(){}}});nav.app=app;
 return {app,nav,editor,copy,status,entry:()=>entry,accept:value=>accepted=value,storage:value=>saved=value};
}
test('existing saved drafts remain; options reuse the existing shared editor',()=>{
 const {app}=ui();let markup=app.renderOutreachPanel({});assert.match(markup,/Message option/);assert.match(markup,/JV \/ Co-development/);assert.match(markup,/Listed Projects/);assert.match(markup,/Confirm replacement/);
 app.windWorkflow=()=>({outreachDraft:'existing'});assert.match(app.renderOutreachPanel({}),/>old default<\/textarea>/);
 app.path='/wind-projects';assert.doesNotMatch(app.renderOutreachPanel({}),/Message option/);
});
test('explicit replacement preserves pending drafts and can restore them',()=>{
 const view=ui();const before=view.editor.value;view.app.handleDetailAction('generate-investor-pitch');assert.equal(view.editor.value,before);view.app.handleDetailAction('confirm-investor-pitch');
 assert.match(view.editor.value,/joint venture/);assert.equal(view.entry().pitchVersions[0].text,before);assert.equal(view.entry().fields.other.value,'keep');
 view.app.handleDetailAction('restore-investor-pitch');view.app.handleDetailAction('confirm-investor-pitch');assert.equal(view.editor.value,before);
});
test('cancel or storage failure does not replace the editor',()=>{
 for(const failure of ['cancel','storage']){const view=ui(),before=view.editor.value;view.app.handleDetailAction('generate-investor-pitch');if(failure==='cancel')view.app.handleDetailAction('cancel-investor-pitch');else{view.storage(false);view.app.handleDetailAction('confirm-investor-pitch');}assert.equal(view.editor.value,before);assert.equal(view.entry().pitchVersions,undefined);}
});
test('confirmation cannot overwrite a draft edited in the meantime or moved to another record',()=>{
 for(const change of ['edit','record']){const view=ui();view.app.handleDetailAction('generate-investor-pitch');if(change==='edit')view.editor.value='new edit';else view.app.detailRecordId='b';const before=view.editor.value;view.app.handleDetailAction('confirm-investor-pitch');assert.equal(view.editor.value,before);assert.equal(view.entry().pitchVersions,undefined);}
});
test('unsafe restored or edited drafts disable copy and block copy/send actions',()=>{
 const view=ui();view.editor.value='Sarande 80 MW';view.nav.restore();assert.equal(view.copy.disabled,true);
 view.app.handleDetailAction('copy-outreach-draft');assert.equal(view.app.lastAction,undefined);
 view.app.handleDetailAction('pulse-send');assert.equal(view.app.lastAction,undefined);
 view.editor.value=buildAnonymousPitch({});view.nav.captureField({id:'outreach-draft'});assert.equal(view.copy.disabled,false);
 view.app.handleDetailAction('copy-outreach-draft');assert.equal(view.app.lastAction,'copy-outreach-draft');
});
function service(key='investors-jv'){
 let begun=0,sent=0;const module=new SendModule({route:`/${key}`,key,label:'Test'});
 module.history={async begin(){begun++;return 'test';},async complete(_id,{results}){return {results};}};
 const client={enabled:true,async send(){sent++;return {status:'sent',httpStatus:200};}};
 return {module,service:new PulseSendService({client}),counts:()=>({begun,sent})};
}
const input={recordId:'test',mode:'separate',recipients:[{email:'test@example.com',name:'Alex Smith',origin:'added'}],...parseDraft(buildAnonymousPitch({}))};
test('server rejects leaked subject/body and personalized recipient names before history/provider writes',async()=>{
 for(const patch of [{subject:'Drin'},{body:'Dear Team,\n\nSarande'},{recipients:[{email:'test@example.com',name:'Drin Person'}]}]){
  const test=service();await assert.rejects(test.service.send(test.module,{...input,...patch}),error=>error.status===422);assert.deepEqual(test.counts(),{begun:0,sent:0});
 }
});
test('server allows safe anonymous payloads with routing emails, without changing other modules',async()=>{
 const test=service();await test.service.send(test.module,input);assert.deepEqual(test.counts(),{begun:1,sent:1});
 const wind=service('wind-projects');await wind.service.send(wind.module,{...input,subject:'Sarande 80 MW'});assert.equal(wind.counts().sent,1);
});
