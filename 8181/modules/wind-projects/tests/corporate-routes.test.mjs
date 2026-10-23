import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import {projects,corporateRouteAudit} from '../data/source.js';

const source=await readFile(new URL('../../../platform-shell/shared/js/platform-app.js',import.meta.url),'utf8');
const context=vm.createContext({document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL});
vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.ContactApp=OpportunityPlatformApp;',context);
const app=Object.create(context.ContactApp.prototype);
const contact=(id,name)=>projects.find(item=>item.id===id).contacts.find(item=>item.name===name);

test('audit retains all contacts and every added route has provenance and a qualification',()=>{
 assert.equal(corporateRouteAudit.contacts,236);
 assert.equal(projects.length,74);
 for(const project of projects)for(const item of project.contacts){
  assert.ok(item.corporateRouteStatus,item.name);
  assert.equal(item.corporateRouteAuditedAt,'2026-10-22');
  assert.equal(new Set(item.corporateRoutes.map(route=>route.email.toLowerCase())).size,item.corporateRoutes.length);
  for(const route of item.corporateRoutes){assert.match(route.source,/^https:\/\//);assert.ok(route.entity);assert.match(route.status,/not verified/);}
 }
});
test('routing is explicit per entity and never borrowed from an unrelated project colleague',()=>{
 assert.equal(contact('marri','Forest Chu').corporateRoutes[0].email,'investorrelations@sembcorp.com');
 assert.ok(!contact('marri','Andres Maasing').corporateRoutes.some(route=>route.email.includes('sembcorp')));
 assert.match(contact('ol-ndanyat','Eddie Odhiambo').corporateRoutes[0].status,/NOT established/);
 assert.match(contact('afrendev-secunda','Liesel Venetia Ryan').corporateRoutes[0].status,/Not Liesel/);
 assert.match(contact('wpp-godica','Ringo Global Partners').corporateRouteStatus,/Unresolved/);
});
test('source-backed new routes render with caveats and unresolved cards stay visible',()=>{
 const html=app.renderContactCard(contact('cpc-finland-pipeline','Erik Trast'));
 assert.match(html,/mailto:info@cpc-finland.com/);
 assert.match(html,/legal-information/);
 assert.match(html,/not the named person/);
 assert.match(app.renderContactCard(contact('wpp-godica','Ringo Global Partners')),/Unresolved/);
});
test('existing personal and generated addresses survive; corporate fallback never promotes a candidate',()=>{
 const froio=app.contactEmailRoutes(contact('alerion-400mw','Giovanni Froio'));
 assert.ok(froio.some(route=>/gmail.com$/i.test(route.email)));
 assert.ok(froio.some(route=>route.email==='investor.relations@alerion.it'));
 const candidate=app.renderContactCard(contact('planik-bileca-hybrid','Shahar Gober'));
 assert.match(candidate,/Candidate only/);
 assert.ok(!candidate.includes('mailto:shahar@bigmegare.com'));
 assert.ok(candidate.includes('mailto:Limor@bigmegare.com'));
 const duplicate=app.contactEmailRoutes({email:'desk@example.com',corporateRoutes:[{email:'DESK@example.com',type:'Shared corporate route',source:'https://example.com',status:'not verified'}]});
 assert.equal(duplicate.length,1);
});
