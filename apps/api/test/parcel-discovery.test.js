import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLandSearchQuery,createParcelDiscovery,safeOfficialUrl,discoveryAgents} from '../src/parcel-discovery.js';
import {createTrackerHttpHandler} from '../src/tracker-http.js';
const project='00000000-0000-4000-8000-000000000001';
const intent='00000000-0000-4000-8000-000000000002';
const input={researchProjectId:project,intentId:intent,mode:'official_catalogue',region:'All Oman',keywords:'',targetItLoadMw:10};
function harness(options={}) {
  const calls=[];
  const query=async(sql,params)=>{
    calls.push({sql,params});
    if(sql.includes('start_discovery'))return {rows:[{id:project}]};
    if(sql.includes('v_intent_requests'))return {rows:[{id:intent,research_project_id:project,created_by:params[2]||'user',goal:'Find allocation-ready land',opportunity_kind:'land_site',geography:'Oman',sector:'Digital infrastructure',criteria:{targetItLoadMw:10},exclusions:null,priority:'normal'}]};
    if(sql.includes('finish_discovery'))return {rows:[{id:project,output:JSON.parse(params[1]),error:params[2],status:params[2]?'failed':'completed'}]};
    return {rows:[]};
  };
  return {calls,service:createParcelDiscovery({query,apiKey:'',...options})};
}
test('catalogue filters sources and persists researcher and requirements without network calls',async()=>{
  const {calls,service}=harness({fetchImpl:()=>{throw Error('must not fetch');}});
  const result=await service.search({...input,region:'Sohar'},'researcher');
  assert.equal(result.output.length,1);assert.equal(result.output[0].title,'Sohar Free Zone');
  assert.equal(calls[0].params[2],'researcher');assert.equal(calls[0].params[1],intent);assert.equal(JSON.parse(calls[0].params[5]).targetItLoadMw,10);
  assert.equal(result.output[0].kind,'area_lead');
});
test('catalogue does not manufacture matches for uncovered areas',async()=>{
  const {service}=harness();assert.equal((await service.search({...input,region:'Salalah'},'user')).output.length,0);
});
test('SourceFetchAgent fetches and persists each unique official source before completion',async()=>{
  const events=[]; const fetched=[]; const calls=[];
  const query=async(sql,params)=>{
    calls.push({sql,params});
    if(sql.includes('start_discovery'))return {rows:[{id:project}]};
    if(sql.includes('v_intent_requests'))return {rows:[{id:intent,research_project_id:project,created_by:'user',goal:'Find allocation-ready land',opportunity_kind:'land_site',geography:'Oman',sector:'Digital infrastructure',criteria:{targetItLoadMw:10},exclusions:null,priority:'normal'}]};
    if(sql.includes('record_discovery_source_fetch'))return {rows:[{id:`fetch-${params[1]}`}]};
    if(sql.includes('finish_discovery'))return {rows:[{id:project,output:JSON.parse(params[1]),error:params[2],status:params[2]?'failed':'completed'}]};
    return {rows:[]};
  };
  const service=createParcelDiscovery({query,eventBus:{publish:event=>events.push(event)},sourceFetcher:async({url})=>{fetched.push(url);return {sourceUrl:url,finalUrl:url,statusCode:200,contentType:'text/markdown',content:`Fetched ${url}`,metadata:{}};}});
  const result=await service.search({...input,region:'Sohar'},'user');
  assert.equal(result.status,'completed'); assert.equal(fetched.length,1); assert.equal(calls.filter(call=>call.sql.includes('record_discovery_source_fetch')).length,1);
  assert.ok(events.some(event=>event.agent==='SourceFetchAgent'&&event.phase==='output_saved'));
});
test('SourceFetchAgent checkpoint blocks hand-off when paused',async()=>{
  const {service}=harness({sourceFetcher:async()=>{throw new Error('must not fetch');}});
  const result=await service.search({...input,region:'Sohar',enabledAgents:discoveryAgents.slice(0,3)},'user');
  assert.equal(result.status,'failed'); assert.match(result.error,/SourceFetchAgent is paused/);
});
test('AuthorityContactAgent collects multiple public contact routes from the official domain',async()=>{
  const calls=[]; const events=[];
  const query=async(sql,params)=>{
    calls.push({sql,params});
    if(sql.includes('v_discovery_runs'))return {rows:[{id:project,status:'completed',output:[{title:'Khazaen Economic City',url:'https://www.opaz.gov.om/en/zones/khazaen-economic-city'}]}]};
    if(sql.includes('record_discovery_contacts'))return {rows:JSON.parse(params[2]).map((contact,index)=>({id:`contact-${index}`,email:contact.email,phone:contact.phone,rank:contact.rank}))};
    return {rows:[]};
  };
  const service=createParcelDiscovery({query,apiKey:'key',eventBus:{publish:event=>events.push(event)},fetchImpl:async()=>Response.json({results:[
    {title:'Investment office',url:'https://www.opaz.gov.om/contact',text:'Investment office email invest@opaz.gov.om phone +968 2417 0000'},
    {title:'Land allocation office',url:'https://www.opaz.gov.om/land',text:'Land allocation office email land@opaz.gov.om phone +968 2417 0001'},
  ]})});
  const result=await service.discoverContacts({runId:project,index:0},'user');
  assert.equal(result.contacts.length,2); assert.equal(calls.filter(call=>call.sql.includes('record_discovery_contacts')).length,1); assert.ok(events.some(event=>event.agent==='AuthorityContactAgent'&&event.phase==='output_saved'));
});
test('contact page cache changes when the database rollup token changes', async () => {
  let rollupVersion = '2026-10-08T00:00:00.000Z';
  let pageQueries = 0;
  const query = async (sql) => {
    if (sql.includes('v_discovery_contact_rollups')) {
      return { rows: [{ total_count: 1, latest_created_at: rollupVersion, refreshed_at: rollupVersion, contact_type_counts: {}, organisation_counts: {}, verification_status_counts: {} }] };
    }
    if (sql.includes('list_discovery_contacts')) {
      pageQueries += 1;
      return { rows: [{ id: `contact-${pageQueries}`, organisation: 'Authority', created_at: rollupVersion }] };
    }
    return { rows: [] };
  };
  const service = createParcelDiscovery({ query });

  const first = await service.listContacts('researcher', { limit: 25, offset: 0 });
  const cached = await service.listContacts('researcher', { limit: 25, offset: 0 });
  rollupVersion = '2026-10-08T00:01:00.000Z';
  const refreshed = await service.listContacts('researcher', { limit: 25, offset: 0 });

  assert.equal(pageQueries, 2);
  assert.equal(first.contacts[0].id, 'contact-1');
  assert.equal(cached.contacts[0].id, 'contact-1');
  assert.equal(refreshed.contacts[0].id, 'contact-2');
});
test('contact pages accept only the supported page sizes', async () => {
  const { service } = harness();
  await assert.rejects(
    service.listContacts('researcher', { limit: 200, offset: 0 }),
    /Contact page size must be 25, 50, or 100/
  );
});
test('contact page offsets are bounded before reaching the database', async () => {
  const { service, calls } = harness();
  await service.listContacts('researcher', { limit: 100, offset: 9999999 });
  const pageCall = calls.find(call => call.sql.includes('list_discovery_contacts'));
  assert.equal(pageCall.params[2], 1000000);
});
test('contact page cache remains bounded as rollup versions change', async () => {
  let rollupVersion = '2026-10-08T00:00:00.000Z';
  let pageQueries = 0;
  const query = async (sql) => {
    if (sql.includes('v_discovery_contact_rollups')) {
      return { rows: [{ total_count: 1, refreshed_at: rollupVersion, contact_type_counts: {}, organisation_counts: {}, verification_status_counts: {} }] };
    }
    if (sql.includes('list_discovery_contacts')) {
      pageQueries += 1;
      return { rows: [{ id: `contact-${pageQueries}` }] };
    }
    return { rows: [] };
  };
  const service = createParcelDiscovery({ query });

  await service.listContacts('researcher', { offset: 0 });
  for (let version = 1; version <= 256; version += 1) {
    rollupVersion = new Date(Date.UTC(2026, 9, 8, 0, 0, version)).toISOString();
    await service.listContacts('researcher', { offset: version });
  }
  rollupVersion = '2026-10-08T00:00:00.000Z';
  await service.listContacts('researcher', { offset: 0 });

  assert.equal(pageQueries, 258);
});
test('agent controls default to paused and prevent a paused hand-off',async()=>{
  const {service}=harness();
  assert.equal(service.agentControls(project,'user').enabledAgents.length,0);
  const result=await service.search({...input,enabledAgents:['IntentAgent']},'user');
  assert.equal(result.status,'failed');
  assert.match(result.error,/ExaSearchAgent is paused/);
});
test('same-project searches are processed FIFO instead of rejected',async()=>{
  const {calls,service}=harness();
  const first=service.search({...input,targetItLoadMw:10},'user');
  const second=service.search({...input,targetItLoadMw:20},'user');
  const [a,b]=await Promise.all([first,second]);
  assert.equal(a.status,'completed');
  assert.equal(b.status,'completed');
  const starts=calls.filter(call=>call.sql.includes('start_discovery'));
  assert.deepEqual(starts.map(call=>JSON.parse(call.params[5]).targetItLoadMw),[10,20]);
});
test('a running run can resume after the in-memory worker is lost',async()=>{
  const events=[]; const calls=[];
  const run={id:'00000000-0000-4000-8000-000000000003',research_project_id:project,researcher_id:'user',intent_id:intent,tool:'official_catalogue',region:'All Oman',criteria:{researchProjectId:project,intentId:intent,mode:'official_catalogue',region:'All Oman',keywords:'',targetItLoadMw:10},status:'running',created_at:new Date().toISOString()};
  const query=async(sql,params)=>{calls.push({sql,params}); if(sql.includes("status='running'"))return {rows:[run]}; if(sql.includes('v_intent_requests'))return {rows:[{id:intent,research_project_id:project,created_by:'user',goal:'Find allocation-ready land',opportunity_kind:'land_site',geography:'Oman',sector:'Digital infrastructure',criteria:{targetItLoadMw:10},exclusions:null,priority:'normal'}]}; if(sql.includes('finish_discovery'))return {rows:[{...run,status:params[2]?'failed':'completed',output:JSON.parse(params[1]),error:params[2]}]}; return {rows:[]};};
  const service=createParcelDiscovery({query,apiKey:'',eventBus:{publish:event=>events.push(event)}});
  service.setAgentControls(project,'user',['IntentAgent']);
  await service.resumeStalledRuns(project,'user');
  await new Promise(resolve=>setTimeout(resolve,700));
  assert.ok(events.some(event=>event.agent==='IntentAgent'&&event.phase==='woke'));
  assert.ok(events.some(event=>event.agent==='ExaSearchAgent'&&event.phase==='blocked'));
  assert.equal(calls.filter(call=>call.sql.includes('start_discovery')).length,0);
  service.setAgentControls(project,'user',['IntentAgent','ExaSearchAgent','UniquenessAgent']);
  await new Promise(resolve=>setTimeout(resolve,700));
  assert.ok(events.some(event=>event.agent==='ExaSearchAgent'&&event.phase==='working'));
});
test('checkpoint hand-off blocks Exa provider work until Exa and Uniqueness are enabled',async()=>{
  let fetches=0; const {service}=harness({apiKey:'key',fetchImpl:async()=>{fetches++;return Response.json({results:[]});}});
  service.setAgentControls(project,'user',['IntentAgent']);
  const run=service.search({...input,mode:'exa',waitForControls:true},'user');
  await new Promise(resolve=>setTimeout(resolve,700));
  assert.equal(fetches,0);
  service.setAgentControls(project,'user',['IntentAgent','ExaSearchAgent']);
  await new Promise(resolve=>setTimeout(resolve,700));
  assert.equal(fetches,1);
  service.setAgentControls(project,'user',['IntentAgent','ExaSearchAgent','UniquenessAgent']);
  const result=await run;
  assert.equal(result.status,'completed');
});
test('history scopes saved runs and promotions to the authenticated researcher',async()=>{
  const {calls,service}=harness();
  await service.history(project,'researcher');
  assert.deepEqual(calls[0].params,[project,'researcher',30,0]);
  assert.deepEqual(calls[1].params,[project,'researcher',200,0]);
  assert.deepEqual(calls[2].params,[project,'researcher',200,0]);
});
test('missing live credentials do not silently fall back to catalogue',async()=>{
  const {calls,service}=harness();await assert.rejects(service.search({...input,mode:'exa'},'user'),{status:409});assert.equal(calls.length,0);
});
test('official links reject unsafe schemes, credentials and lookalike domains',()=>{
  for(const url of ['javascript:alert(1)','https://opaz.gov.om.evil.com/a','https://x:secret@opaz.gov.om/a','https://127.0.0.1/a'])assert.equal(safeOfficialUrl(url),null);
  assert.equal(safeOfficialUrl('https://www.opaz.gov.om/a#x'),'https://www.opaz.gov.om/a');
  assert.equal(safeOfficialUrl('https://soharportandfreezone.om/sohar-freezone-land'),'https://soharportandfreezone.om/sohar-freezone-land');
  assert.equal(safeOfficialUrl('https://soharportandfreezone.om.evil.com/a'),null);
});
test('provider failure is retained without leaking provider response or key',async()=>{
  const {service}=harness({apiKey:'secret',fetchImpl:async()=>new Response('secret upstream detail',{status:429})});
  const result=await service.search({...input,mode:'exa'},'user');assert.equal(result.status,'failed');assert.equal(result.output.length,0);assert.ok(!JSON.stringify(result).includes('secret'));
});
test('live search is bounded, official-only and deduplicated',async()=>{
  const requests=[];
  const {service}=harness({apiKey:'key',fetchImpl:async(url,options)=>{requests.push({url,options});return Response.json({results:[{title:'Sohar',url:'https://www.opaz.gov.om/a'},{url:'https://www.opaz.gov.om/a#b'},{url:'https://evil.com'}]});}});
  const result=await service.search({...input,mode:'exa'},'user');assert.equal(result.output.length,1);const request=requests[0];assert.equal(JSON.parse(request.options.body).numResults,8);assert.equal(JSON.parse(request.options.body).contents.text.maxCharacters,1000);assert.equal(request.url,'https://api.exa.ai/search');
});
test('live search removes duplicate content exposed by different official URLs',async()=>{
  const excerpt='Oman is offering various significant locations to build data centers with reliable infrastructure and an investment opportunity for digital infrastructure operators.'.repeat(2);
  const {service}=harness({apiKey:'key',fetchImpl:async()=>Response.json({results:[
    {title:'Data Centers Establishment',url:'https://mtcit.gov.om/a',text:excerpt},
    {title:'Data Centers Establishment',url:'https://mtcit.gov.om/b?download=true',text:excerpt},
    {title:'Different opportunity',url:'https://mtcit.gov.om/c',text:'A distinct source with different evidence.'},
  ]})});
  const result=await service.search({...input,mode:'exa'},'user');
  assert.equal(result.output.length,2);
  assert.deepEqual(result.output.map(row=>row.rank),[1,2]);
});
test('live search uses the requested land-use focus instead of a fixed data-centre query',async()=>{
  let request;
  const {service}=harness({apiKey:'key',fetchImpl:async(url,options)=>{request={url,options};return Response.json({results:[]});}});
  await service.search({...input,mode:'exa',keywords:'residential'},'user');
  assert.match(JSON.parse(request.options.body).query,/residential/);
  assert.doesNotMatch(JSON.parse(request.options.body).query,/data centre/);
});
test('structured land criteria generate a land-specific query',()=>{
  const query=buildLandSearchQuery({region:'Duqm',landCriteria:{landUse:'solar renewable energy',zone:'SEZAD',plotAreaMinSqm:50000,tenureRoute:'usufruct',utilities:['power','roads']}});
  assert.match(query,/Duqm/);assert.match(query,/solar renewable energy/);assert.match(query,/SEZAD/);assert.match(query,/50000 square metre plot/);assert.match(query,/usufruct/);assert.match(query,/power infrastructure/);assert.match(query,/land plot site/);
  assert.doesNotMatch(query,/data centre/);
});
test('discovery endpoints require authentication and validate input before storage',async()=>{
  const discovery={search:()=>{throw Error('unexpected');}};
  const request=()=>new Request('http://localhost:9500/v1/discovery/search',{method:'POST',body:JSON.stringify({...input,targetItLoadMw:9})});
  assert.equal((await createTrackerHttpHandler({tracker:{},discovery}).fetch(request())).status,401);
  assert.equal((await createTrackerHttpHandler({tracker:{},discovery,authenticate:async()=>({id:'user'})}).fetch(request())).status,422);
});
