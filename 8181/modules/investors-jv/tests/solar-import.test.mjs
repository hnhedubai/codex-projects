import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {partnerRecords,partnerContacts,partnerRegistry,solarResearchAudit,chinaSolarResearchAudit} from '../data/source.js';
import {solarResearch,applySolarResearch} from '../data/solar-research.js';
import {defaultSectors,installInvestorSectors} from '../sectors.js';

test('all 25 solar companies and their contacts are imported exactly once with sources',()=>{
 assert.equal(partnerRegistry.count,75);assert.equal(solarResearchAudit.added,25);assert.equal(solarResearchAudit.contactsAdded,25);assert.equal(chinaSolarResearchAudit.added,25);
 assert.equal(new Set(partnerRecords.map(row=>row.id)).size,75);
 for(const input of solarResearch.records){
  const row=partnerRecords.find(item=>item.id===input.id);assert.ok(row);assert.ok(defaultSectors(row).includes('Solar PV'));
  assert.equal(row.status,'Potential fit — intent identified, availability unconfirmed');assert.ok(row.sources.includes(input.intentSource));
  const card=partnerContacts[row.id].find(item=>item.name===input.contact.name);assert.ok(card);assert.equal(card.linkedin,input.contact.linkedin);
  assert.deepEqual(card.providerHistory,[input.contact.reoon]);assert.ok(card.links.some(item=>item.url===input.contact.corporateURL));
  assert.equal(card.emails[0]?.email||'',input.contact.email);
  if(input.contact.addressProvenance.startsWith('Published'))assert.equal(card.email,input.contact.email);
  else {assert.equal(card.email,'');if(card.emails.length)assert.match(card.emails[0].type,/Candidate only/);}
 }
 const records=structuredClone(partnerRecords),contacts=structuredClone(partnerContacts),before=JSON.stringify({records,contacts});
 const audit=applySolarResearch(records,contacts);assert.equal(audit.added,0);assert.equal(audit.contactsAdded,0);assert.equal(JSON.stringify({records,contacts}),before);
});

test('existing relationship details and contact cards are never replaced on a matching company',()=>{
 const input=solarResearch.records[0],record={id:'existing-id',company:input.company,status:'Engaged',intent:'Private discussion',sectors:['Wind'],sources:['https://example.com/original']};
 const contact={name:input.contact.name,email:'existing@example.com',notes:'Keep relationship history'};
 const records=[record],contacts={'existing-id':[contact]};applySolarResearch(records,contacts,{researchedAt:solarResearch.researchedAt,methods:solarResearch.methods,records:[input]});
 assert.equal(records.length,1);assert.equal(record.id,'existing-id');assert.equal(record.status,'Engaged');assert.equal(record.intent,'Private discussion');
 assert.deepEqual(record.sectors,['Wind','Solar PV']);assert.deepEqual(contacts['existing-id'],[contact]);assert.ok(record.sources.includes('https://example.com/original'));
});

test('Sector sidebar matches multi-sector companies and leaves other modules on Signal/Role',async()=>{
 const source=await readFile(new URL('../../../platform-shell/shared/js/platform-app.js',import.meta.url),'utf8');
 const values=new Map([['oplatform:/investors-jv:detail-workflow',JSON.stringify({both:{sectors:['Wind','Solar PV']}})]]);
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const context=vm.createContext({localStorage:storage,document:{addEventListener(){}},window:{location:{origin:'http://localhost:8181'}},URL});
 vm.runInContext(source.replace(/export class /g,'class ')+'\nglobalThis.Sidebar=SidebarController;',context);
 class Pipeline{columns(){}values(){}cell(){}render(){}}class App{bind(){}}
 const old=globalThis.localStorage;globalThis.localStorage=storage;
 try{
  installInvestorSectors({OpportunityPlatformApp:App,PipelineView:Pipeline,SidebarController:context.Sidebar});
  const sidebar=Object.create(context.Sidebar.prototype);Object.assign(sidebar,{path:'/investors-jv',rows:[{id:'solar',partner:'Solar company',source:{sectors:['Solar PV']}},{id:'wind',partner:'Wind company',source:{sectors:['Wind']}},{id:'both',partner:'Both',source:{sectors:['Wind']}}],search:{value:''},signalFilter:{value:'Solar PV'},viewMode:'table',countryValues:[]});
  assert.equal(sidebar.filterLabel(),'Sector');assert.equal(sidebar.filterStateField(),'sector');assert.deepEqual(Array.from(sidebar.filtered(),row=>row.id),['solar','both']);
  sidebar.sidebarStateKey='state';sidebar.legacySignal='Engaged';sidebar.countryMode='exclude';sidebar.saveState();
  const saved=JSON.parse(storage.getItem('state'));assert.equal(saved.sector,'Solar PV');assert.equal(saved.signal,'Engaged');
  sidebar.path='/wind-projects';assert.equal(sidebar.filterLabel(),'Signal');assert.equal(sidebar.filterStateField(),'signal');
  sidebar.path='/diesel-en590';assert.equal(sidebar.filterLabel(),'Role');
 }finally{if(old===undefined)delete globalThis.localStorage;else globalThis.localStorage=old;}
});
