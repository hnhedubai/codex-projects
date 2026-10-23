import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {OutreachExportRoute} from './outreach-export.mjs';
import {partnerRecords,partnerContacts} from '../../modules/investors-jv/data/source.js';
import {listedProjects} from '../../modules/listed-projects/data/source.js';
import {buildOutreachExport,checkOutreachExport,contactCard,readBrowserOutreachState,mwBand,projectStage} from '../../modules/investors-jv/outreach-export.js';
import {installOutreachExport} from '../shared/js/outreach-export.js';

const input={partners:partnerRecords,contacts:partnerContacts,projects:listedProjects};
const storage=values=>({getItem:key=>values[key]??null});
test('real data exports full text, every current investor and six listed projects with visible coverage counts',()=>{
 const before=JSON.stringify(input),data=buildOutreachExport(input),checks=checkOutreachExport(data,input);
 const count=partnerRecords.length;assert.deepEqual(checks.errors,[]);assert.deepEqual(checks.counts,{investors:count,projects:6,country:count,whatTheyDo:count,ticketOrMwCriteria:count,withContacts:count});
 assert.equal(data.investors[0].whatTheyDo,partnerRecords[0].summary);assert.equal(data.investors[0].ticketOrMwCriteria,partnerRecords[0].scale);
 assert.equal(JSON.stringify(input),before);assert.deepEqual(JSON.parse(JSON.stringify(data)),data);
 assert.equal(data.investors.find(item=>item.id==='green-genius').intent,'jv');
 assert.equal(data.investors.find(item=>item.id==='alcazar-energy').investorType,'fund');
});
test('browser snapshot keeps only stars, selected sectors and contact identity, never notes or routing data',()=>{
 const snapshot=readBrowserOutreachState(storage({'oplatform:/investors-jv:starred':'["green-genius"]','oplatform:/investors-jv:detail-workflow':JSON.stringify({'green-genius':{sectors:['Wind','Solar PV','e-SAF'],outreachNotes:'PRIVATE NOTE',outreachDraft:'PRIVATE DRAFT',contactsAdded:[{name:'Dr. José Example',title:'Investment Director',email:'secret@example.com',phone:'+12345678901',linkedin:'https://example.com',notes:'SECRET',isPrimary:true}]}})}));
 const serialized=JSON.stringify(snapshot);assert.doesNotMatch(serialized,/PRIVATE|SECRET|secret@|12345678901|https/);
 const data=buildOutreachExport({...input,state:snapshot}),partner=data.investors.find(item=>item.id==='green-genius');
 assert.equal(partner.isFavourite,true);assert.deepEqual(partner.technologyFocus,['Wind','Solar PV','e-SAF']);assert.equal(partner.contacts[0].fullName,'José Example');assert.equal(partner.contacts[0].title,'Dr');assert.equal(partner.contacts[0].jobTitle,'Investment Director');
 assert.equal(data.investors.find(item=>item.id==='acen').isFavourite,false);
 assert.throws(()=>readBrowserOutreachState(storage({'oplatform:/investors-jv:starred':'broken'})));
});
test('all exported contacts have only allowed identity fields, explicit and inferred primaries sort first',()=>{
 const data=buildOutreachExport(input);
 for(const investor of data.investors){let nonPrimary=false;for(const contact of investor.contacts){assert.deepEqual(Object.keys(contact),['fullName','title','jobTitle','isPrimary']);if(!contact.isPrimary)nonPrimary=true;else assert.equal(nonPrimary,false);}}
 assert.equal(contactCard({name:'Dr. Jane Person',title:'Chief Executive Officer'},'Jane Person, CEO').isPrimary,true);
 assert.equal(contactCard({name:'Jane Person',title:'Former CEO'},'Jane Person').isPrimary,false);
 assert.equal(contactCard({name:'Jane Person',title:'CEO',isPrimary:false},'Jane Person').isPrimary,false);
});
test('project bands use documented half-open thresholds; stage mapping never promotes before-RTB',()=>{
 for(const [capacity,band]of [[19.9,'under 20 MW'],[20,'20-50 MW'],[50,'50-100 MW'],[100,'100-200 MW'],[200,'200-400 MW'],[400,'400+ MW']])assert.equal(mwBand(capacity),band);
 assert.equal(mwBand(null),'');assert.equal(mwBand(0),'');assert.equal(projectStage('Final steps before RTB - source claim'),'Pre-construction');assert.equal(projectStage('Ready for construction - source claim'),'Ready-to-build');assert.equal(projectStage('Unknown'),'');
 const data=buildOutreachExport(input);assert.ok(data.projects.every(project=>project.regionBand==='Southern Europe'&&project.strength===''));
 for(const project of data.projects){assert.deepEqual(Object.keys(project),['id','internalName','technology','mwBand','stage','regionBand','strength','disclosureNote']);assert.equal(project.id,listedProjects.find(item=>item.name===project.internalName).id);}
 // Explicit internal-reference fields requested by the user identify projects. Do not call the entire file anonymous.
 assert.equal(checkOutreachExport(data,input).identityFieldsPresent,true);
});
test('missing fields remain empty and unsupported types are unknown, not guessed',()=>{
 const data=buildOutreachExport({partners:[{id:'test',company:'Test',partnerType:'Adviser',status:'Potential fit'}],contacts:{},projects:[]});
 assert.equal(data.investors[0].country,'');assert.deepEqual(data.investors[0].regions,[]);assert.deepEqual(data.investors[0].contacts,[]);assert.equal(data.investors[0].whatTheyDo,'');assert.equal(data.investors[0].investorType,'unknown');assert.equal(data.investors[0].intent,'unknown');
});
test('ellipsis, contact routes, identifiers in banded fields and arbitrary browser fields fail closed',()=>{
 for(const summary of ['Short…','Short...','Email secret@example.com','See https://example.com'])assert.throws(()=>buildOutreachExport({...input,partners:[{...partnerRecords[0],summary}]}));
 assert.throws(()=>buildOutreachExport({...input,projects:[{...listedProjects[0],disclosureNote:'We Green Energo'}]}));
 assert.throws(()=>buildOutreachExport({...input,state:{favourites:[],companies:{acen:{notes:'not allowed'}}}}));
 assert.throws(()=>buildOutreachExport({...input,state:{favourites:[],companies:{acen:{contacts:[{fullName:'A',title:'',jobTitle:'',isPrimary:false,email:'private'}]}}}}));
});
async function fixture(){const root=await mkdtemp(path.join(os.tmpdir(),'8181-outreach-export-'));return {root,route:new OutreachExportRoute(root),cleanup:()=>rm(root,{recursive:true,force:true})};}
function response(){return {writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};}
const request=(state={favourites:[],companies:{}})=>({method:'GET',headers:{'sec-fetch-site':'same-origin','x-outreach-export':'1','x-outreach-state':Buffer.from(JSON.stringify(state),'utf8').toString('base64')}});
test('GET returns the exact UTF-8 bytes saved atomically, refreshes the same file and makes no record writes',async()=>{
 const test=await fixture();try{const before=JSON.stringify(input);for(let index=0;index<2;index++){const res=response();await test.route.handle(request({favourites:index?['acen']:[],companies:{}}),res);assert.equal(res.status,200);assert.equal(await readFile(path.join(test.root,'exports/outreach-data.json'),'utf8'),res.body);assert.match(res.headers['Content-Disposition'],/outreach-data.json/);assert.equal(JSON.parse(res.body).investors.find(item=>item.id==='acen').isFavourite,index===1);}
 assert.deepEqual(await readdir(path.join(test.root,'exports')),['outreach-data.json']);assert.deepEqual(await readdir(test.root),['exports']);assert.equal(JSON.stringify(input),before);
 }finally{await test.cleanup();}
});
test('POST, HEAD, cross-origin, malformed and overlarge export requests do not create artifacts',async()=>{
 const test=await fixture();try{for(const [req,status]of [[{...request(),method:'POST'},405],[{...request(),method:'HEAD'},405],[{method:'GET',headers:{}},403],[{...request(),headers:{...request().headers,'sec-fetch-site':'cross-site'}},403],[{...request(),headers:{...request().headers,'x-outreach-state':'broken'}},422],[{...request(),headers:{...request().headers,'x-outreach-state':'a'.repeat(12001)}},422]]){const res=response();await test.route.handle(req,res);assert.equal(res.status,status);}
 assert.deepEqual(await readdir(test.root),[]);
 }finally{await test.cleanup();}
});
test('failed disk save produces an error, not a successful download response',async()=>{
 const route=new OutreachExportRoute('.');route.save=async()=>{throw Error('disk unavailable');};const res=response();await route.handle(request(),res);assert.equal(res.status,500);assert.match(JSON.parse(res.body).error,/could not be saved/);
});
test('button appears on both supported pages, hides elsewhere and does not duplicate across transitions',()=>{
 class Navigation{restore(){}}
 class App{bind(){}}
 installOutreachExport({OpportunityPlatformApp:App,PlatformNavigation:Navigation});
 let button;const actions={querySelector:()=>button,append:value=>button=value};const app=new App();app.root={querySelector:()=>actions,ownerDocument:{createElement:()=>({dataset:{}})}};
 app.path='/investors-jv';app.syncOutreachExportButton();assert.equal(button.hidden,false);assert.equal(button.textContent,'Export outreach data (JSON)');const original=button;
 app.path='/listed-projects';app.syncOutreachExportButton();assert.equal(button.hidden,false);assert.equal(button,original);
 app.path='/wind-projects';app.syncOutreachExportButton();assert.equal(button.hidden,true);
});
