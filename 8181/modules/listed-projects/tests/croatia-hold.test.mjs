import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {listedProjects,listedRows} from '../data/source.js';
import {croatiaProjects} from '../data/croatia-portfolio.js';
import {installListedProjectViews,isListedProjectOnHold,disableHeldProjectLinks,groupListedProjects} from '../profile.js';

test('five separate Croatia projects reconcile to summary and retain source cells',async()=>{
 assert.equal(croatiaProjects.length,5);
 assert.equal(new Set(listedProjects.map(p=>p.id)).size,11);
 const sum=key=>Math.round(croatiaProjects.reduce((n,p)=>n+p[key],0)*100)/100;
 assert.equal(sum('capacityValue'),51.77);assert.equal(sum('acCapacityMw'),42.8);
 assert.equal(sum('bessPowerMw'),41);assert.equal(sum('bessEnergyMwh'),82);
 assert.equal(sum('capexEur'),44770000);assert.equal(sum('annualGenerationMwh'),73847.95);
 const bytes=await readFile(new URL('../documents/Projectlist%20Croatia%20new.xlsx',import.meta.url));
 for(const [index,p]of croatiaProjects.entries()){
  assert.equal(p.document.range,`B${index+5}:P${index+5}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),p.document.sha256);
  assert.equal(p.document.date,null);assert.equal(p.bankability,'Not independently assessed');
  assert.match(p.stage,/not confirmed/i);assert.match(p.legalSpv,/to be supplied/);
 }
});

test('PPA offers are not executed agreements and do not cover all five by inference',()=>{
 for(const p of croatiaProjects){assert.match(p.offtakeAgreement.status,/unconfirmed/);assert.equal(p.offtakeAgreement.term,'Not confirmed');}
 for(const p of croatiaProjects.slice(2)){assert.equal(p.offtakeAgreement.offtaker,'');assert.match(p.offtakeAgreement.evidence,/must not be applied/);}
});

test('Cernik stays listed, retains its prior data, and has no opening controls',()=>{
 const row=listedRows.find(p=>p.id==='cernik-croatia-pv');assert.ok(isListedProjectOnHold(row));
 assert.equal(row.stage,'On hold');assert.equal(row.source.capacityValue,45);assert.match(row.source.previousStage,/Pre-construction/);
 class App{openRecord(){throw Error('Held record must not open');}}
 class Pipeline{values(){return [];}cell(){return '<td><button data-record="cernik-croatia-pv">Open ↗</button></td>';}render(){}}
 class Navigation{go(target){return target;}}
 installListedProjectViews({OpportunityPlatformApp:App,PipelineView:Pipeline,PlatformNavigation:Navigation});
 const app=Object.assign(new App(),{path:'/listed-projects'});assert.doesNotThrow(()=>app.openRecord(row.id));
 const pipeline=Object.assign(new Pipeline(),{path:'/listed-projects'});
 const html=pipeline.cell(row,'Open',9);assert.match(html,/disabled/);assert.match(html,/On hold/);assert.doesNotMatch(html,/data-record/);
 const nav=new Navigation();assert.equal(nav.go({path:'/listed-projects',id:row.id,tab:'outreach'}).id,null);
 assert.equal(nav.go({path:'/listed-projects',id:'ludina-croatia-pv',tab:'overview'}).id,'ludina-croatia-pv');
 const button={dataset:{record:row.id},classList:{contains:()=>true},setAttribute(){}};
 disableHeldProjectLinks({querySelectorAll:()=>[button]},[row]);assert.equal(button.disabled,true);assert.equal(button.textContent,'On hold');
});

test('country blocks stay together with Ceric above disabled Cernik last despite saved ordering or stars',()=>{
 const input=[...listedRows].reverse();const original=input.map(row=>row.id);
 const grouped=groupListedProjects(input);
 assert.deepEqual(input.map(row=>row.id),original);
 assert.equal(grouped.at(-1).id,'cernik-croatia-pv');
 assert.equal(grouped.at(-2).id,'ceric-croatia-pv');
 const countries=grouped.map(row=>row.country),blocks=countries.filter((country,i)=>i===0||countries[i-1]!==country);
 assert.equal(blocks.length,new Set(countries).size);
 assert.equal(blocks.at(-1),'Croatia');
 const croatia=grouped.filter(row=>row.country==='Croatia');assert.equal(croatia.length,6);assert.equal(croatia.at(-1).id,'cernik-croatia-pv');
 assert.equal(groupListedProjects(listedRows.filter(row=>row.country==='Croatia')).at(-1).id,'cernik-croatia-pv');
 class Sidebar{ordered(list){return list;}render(){}}
 class App{openRecord(){}}
 class Pipeline{values(){}cell(){}render(){}}
 installListedProjectViews({OpportunityPlatformApp:App,PipelineView:Pipeline,SidebarController:Sidebar});
 const sidebar=new Sidebar();sidebar.path='/listed-projects';assert.deepEqual(sidebar.ordered(input),grouped);
 sidebar.path='/investors-jv';assert.equal(sidebar.ordered(input),input);
});
