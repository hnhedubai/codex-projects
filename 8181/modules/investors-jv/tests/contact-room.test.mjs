import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildContactRows,filterContactRows,verificationState,profileUrl,externalUrl,escapeHtml,emailRoutes,CONTACT_COLUMNS,CONTACT_LAYOUT_KEY,normalizeContactLayout,moveContactColumn,renderContactCell} from '../contact-room-model.js';

const now=Date.parse('2026-10-25T08:00:00Z'),good={provider:'Reoon',mode:'power',status:'safe',deliverable:true,isRoleAccount:false,checkedAt:'2026-10-24T08:00:00Z'};
const company={id:'one',company:'One Solar',country:'Europe',originCountry:'India',sectors:['Solar PV','Wind'],intent:'Seeking external solar projects',intentStrength:'Strong',outreachPriority:{level:'priority',label:'Priority enquiry'},contacts:[{name:'First Person',title:'CEO',email:'first@one.test',linkedin:'https://www.linkedin.com/in/first-person/'}]};

test('green tick requires fresh positive Reoon Power, not imported status text',()=>{
 assert.equal(verificationState(good,{}, {},now).verified,true);
 for(const patch of [{provider:'Other'},{mode:'quick'},{deliverable:false},{deliverable:''},{status:'unknown'},{status:'invalid'},{checkedAt:'2026-09-01T00:00:00Z'},{checkedAt:'not a date'},{checkedAt:'2026-10-26T00:00:00Z'}])assert.equal(verificationState({...good,...patch},{},{},now).verified,false,JSON.stringify(patch));
 assert.equal(verificationState({...good,status:'catch_all'},{},{},now).verified,true);
 assert.equal(verificationState(null,{verification:'safe'},{},now).verified,false);
});
test('shared positive is explicitly separate from person ownership; candidates and former officers are not green',()=>{
 const shared=verificationState({...good,status:'role_account',isRoleAccount:true},{},{email:'info@one.test'},now);
 assert.equal(shared.verified,true);assert.equal(shared.shared,true);assert.match(shared.detail,/not proof of identity/);
 for(const [contact,route]of [[{emailType:'Candidate pattern'},{}],[{roleStatus:'Historical — replaced'},{}],[{},{type:'Guessed personal mailbox'}]])assert.equal(verificationState(good,contact,route,now).verified,false);
});
test('all companies and all contacts roll up, including multiple routes, no email and no contacts',()=>{
 const companies=[company,{id:'two',company:'Second',contacts:[{name:'LinkedIn Only',linkedin:'https://linkedin.com/in/second/'}]},{id:'three',company:'New company',contacts:[]}];
 const workflows={one:{contactsAdded:[{name:'New Director',title:'BD Director',email:'bd@one.test'}]}};
 const rows=buildContactRows(companies,workflows,{'first@one.test':good},now);
 assert.equal(rows.length,4);assert.equal(rows.filter(row=>row.companyId==='one').length,2);assert.equal(rows.find(row=>row.companyId==='three').email,'');assert.equal(rows.find(row=>row.name==='LinkedIn Only').linkedin,'https://linkedin.com/in/second/');
 assert.equal(rows.find(row=>row.name==='First Person').intentValue,'Strong');
 assert.equal(companies[0].contacts.length,1,'does not mutate source');
});
test('local additions deduplicate exact rows; distinct shared and primary routes remain labelled',()=>{
 const contact={name:'Person',email:'person@one.test',emails:[{email:'PERSON@one.test'}],corporateRoutes:[{email:'info@one.test',type:'Published corporate route'}]};
 assert.equal(emailRoutes(contact).length,2);
 const rows=buildContactRows([{...company,contacts:[contact]}],{one:{contactsAdded:[contact]}},{},now);
 assert.equal(rows.length,2);assert.match(rows.find(row=>row.email==='info@one.test').routeLabel,/not this person/);
});
test('filters work across company, person, sectors, origin, priority, verification and missing email',()=>{
 const rows=buildContactRows([company,{id:'two',company:'Other',contacts:[{name:'No Email'}]}],{}, {'first@one.test':good},now);
 for(const filter of [{search:'CEO'},{search:'seeking external'},{country:'India'},{sector:'Wind'},{priority:true},{verification:'verified'},{linkedin:true},{route:'personal'}])assert.equal(filterContactRows(rows,filter).length,1);
 assert.equal(filterContactRows(rows,{verification:'missing'})[0].name,'No Email');assert.equal(filterContactRows(rows,{sector:'Solar PV',country:'France'}).length,0);
});
test('new verification changes next projection without a separate imported contact list',()=>{
 const results={},before=buildContactRows([company],{},results,now);assert.equal(before[0].verification.verified,false);
 results['first@one.test']=good;assert.equal(buildContactRows([company],{},results,now)[0].verification.verified,true);
});
test('column layout validates saved IDs, appends new fields and bounds widths without changing saved order',()=>{
 const layout=normalizeContactLayout({order:['email','company','email','bad'],widths:{email:455,company:4,intent:99999,person:'250'}});
 assert.deepEqual(layout.order.slice(0,2),['email','company']);assert.equal(layout.order.length,CONTACT_COLUMNS.length);
 assert.equal(layout.widths.email,455);assert.equal(layout.widths.company,90);assert.equal(layout.widths.intent,1200);assert.equal(layout.widths.person,210);
 assert.deepEqual(normalizeContactLayout(JSON.parse(JSON.stringify(layout))),layout);assert.match(CONTACT_LAYOUT_KEY,/^investor-contact-room:/);
});
test('moving columns is deterministic, immutable and preserves individual widths',()=>{
 const original=normalizeContactLayout(),next=moveContactColumn(original,'email','company');
 assert.equal(next.order[0],'email');assert.equal(original.order[0],'company');assert.deepEqual(next.widths,original.widths);
 assert.equal(moveContactColumn(next,'email','actions',true).order.at(-1),'email');
 assert.deepEqual(moveContactColumn(original,'unknown','company'),original);
});
test('multi-line cells preserve supporting details and safely expose full text on hover',()=>{
 const row=buildContactRows([company],{}, {'first@one.test':good},now)[0];row.designation='<Director> & CEO';
 for(const column of CONTACT_COLUMNS){const html=renderContactCell(row,column.id);assert.match(html,new RegExp(`data-cr-column="${column.id}"`));assert.match(html,/title="/);}
 assert.match(renderContactCell(row,'designation'),/&lt;Director&gt; &amp; CEO/);
 assert.match(renderContactCell(row,'company'),/<small>India/);assert.match(renderContactCell(row,'email'),/Business email/);assert.match(renderContactCell(row,'intent'),/Evidence:/);
});
test('layout controls persist separately and the scrollbar remains synchronized on redraw',async()=>{
 const source=await readFile(new URL('../contact-room.js',import.meta.url),'utf8'),css=await readFile(new URL('../contact-room.css',import.meta.url),'utf8');
 assert.match(source,/setItem\(CONTACT_LAYOUT_KEY/);assert.match(source,/dragstart/);assert.match(source,/pointermove/);assert.match(source,/this\.applyLayout\(\)/);assert.match(source,/Horizontal table scrollbar/);
 assert.match(css,/\.cr-horizontal-scroll/);assert.match(css,/\.cr-cell-text\{white-space:normal/);
});
test('record rows have a visible vertical scrollbar inside the table',async()=>{
 const css=await readFile(new URL('../contact-room.css',import.meta.url),'utf8');
 assert.match(css,/\.cr-table-wrap\{[^}]*overflow-y:scroll/);
 assert.match(css,/\.cr-table-wrap\{[^}]*scrollbar-width:auto/);
 assert.match(css,/\.cr-table-wrap::-webkit-scrollbar\{width:16px/);
 assert.match(css,/\.cr-table-wrap::-webkit-scrollbar-thumb\{[^}]*background:#719b89/);
});
test('only genuine HTTPS LinkedIn person URLs are offered; text and links are escaped',()=>{
 assert.equal(profileUrl('https://linkedin.com/in/first/'),'https://linkedin.com/in/first/');
 for(const url of ['javascript:alert(1)','https://linkedin.com.evil.test/in/person','https://linkedin.com/company/one','http://linkedin.com/in/person'])assert.equal(profileUrl(url),'');
 assert.equal(externalUrl('javascript:alert(1)'),'');assert.equal(escapeHtml('<script>"x"</script>'),'&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
});
test('control room verifies published email routes but does not send, overwrite portfolio preferences or instantiate JEV',async()=>{
 const source=await readFile(new URL('../contact-room.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\/api\/(?:pulse|jev)|column-order|column-widths|visible-columns|verifyAddedContact/);
 assert.match(source,/\/api\/reoon\/verify/);assert.match(source,/verifyAllContactEmails/);assert.match(source,/slice\(index,index\+5\)/);
 assert.match(source,/investor-contact-room:preferences:v1/);assert.match(source,/setInterval[\s\S]*5000/);assert.match(source,/storage/);assert.match(source,/visibilitychange/);assert.match(source,/if\(html!==this.drawn\)/);
});
test('removed heading block stays absent while live status, filters and table remain',async()=>{
 const source=await readFile(new URL('../contact-room.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/<h1>|One live view of every company|cr-back|← Portfolio/);
 assert.match(source,/data-cr-live/);assert.match(source,/data-cr-filter/);assert.match(source,/data-cr-rows/);
});
test('sync indicator is mounted after breadcrumb title and removed when leaving the room',async()=>{
 const source=await readFile(new URL('../contact-room.js',import.meta.url),'utf8');
 assert.match(source,/breadcrumb\.textContent='Contact Control Room';breadcrumb\.append\(this.liveIndicator\)/);
 assert.doesNotMatch(source,/const live=this\.element\.querySelector\('\[data-cr-live\]'\)/);
 const {ContactControlRoom}=await import('../contact-room.js');
 let removed=0,aborted=0;
 const controller={active:true,generation:1,controller:{abort(){aborted++;}},liveIndicator:{remove(){removed++;}}};
 ContactControlRoom.prototype.stop.call(controller);
 assert.equal(removed,1);assert.equal(aborted,1);assert.equal(controller.liveIndicator,null);assert.equal(controller.active,false);
});
test('Refresh and Clear filters stay in one action group in that order',async()=>{
 const source=await readFile(new URL('../contact-room.js',import.meta.url),'utf8');
 assert.match(source,/filterActions\.append\(refreshButton,clearButton\)/);
 const css=await readFile(new URL('../contact-room.css',import.meta.url),'utf8');
 assert.match(css,/\.cr-filter-actions\{[^}]*flex-wrap:nowrap/);
 assert.match(source,/querySelector\('\[data-cr-metrics\]'\)\.append\(metricValues,filterActions\)/);
 assert.match(source,/querySelector\('\[data-cr-metric-values\]'\)\.innerHTML=/);
 assert.doesNotMatch(source,/querySelector\('\[data-cr-metrics\]'\)\.innerHTML=/);
});

globalThis.document??={addEventListener(){}};
const {PlatformNavigation,parseRoute,routeUrl}=await import('../../../platform-shell/shared/js/navigation.js');
test('contact-room route belongs only to Investors & JV and roundtrips without changing record Contacts',()=>{
 const workspaces={'/investors-jv':{},'/wind-projects':{}},route={path:'/investors-jv',id:null,tab:'contact-room'};
 assert.deepEqual(parseRoute(new URL(routeUrl(route),'http://localhost:8181'),workspaces),route);
 assert.equal(parseRoute(new URL('http://localhost:8181/wind-projects#contact-room'),workspaces).invalid,true);
 assert.equal(parseRoute(new URL('http://localhost:8181/investors-jv#record/one/contacts'),workspaces).tab,'contacts');
});
test('leaving control room for portfolio uses navigation; prioritising cannot overwrite directory',()=>{
 let target,drawn=0;const nav=Object.create(PlatformNavigation.prototype);Object.assign(nav,{current:{path:'/investors-jv',id:null,tab:'contact-room'},app:{path:'/investors-jv',pipeline:{}},remember(){},cancelPending(){},go(value){target=value;},contactRoom:{draw(){drawn++;}}});
 nav.refreshStar();assert.equal(drawn,1);nav.portfolio();assert.equal(target.tab,'overview');
});
