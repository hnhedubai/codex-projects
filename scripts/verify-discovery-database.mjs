// Integration verification deliberately rolls back all fixture records.
import pg from 'pg';
import assert from 'node:assert/strict';
process.loadEnvFile('.env.local');
const url=new URL(process.env.DATABASE_URL_UNPOOLED);
if(url.hostname.split('.')[0] !== 'ep-falling-river-b4qbvjsk') throw Error('Unexpected database branch');
const db=new pg.Client({connectionString:url.href});
await db.connect();
try {
  await db.query('begin');
  const {rows:[project]}=await db.query("select * from tracker.create_research_project('Discovery rollback verification','OM')");
  const {rows:[intent]}=await db.query("select * from tracker.create_intent_request($1,'verification','Find an Oman data-centre site','land_site','All Oman','Data centres',$2,null,'high')",[project.id,JSON.stringify({targetItLoadMw:10})]);
  const {rows:[run]}=await db.query("select * from tracker.start_discovery($1,$2,'verification','official_catalogue','Oman test',$3)",[project.id,intent.id,JSON.stringify({targetItLoadMw:10})]);
  await db.query('select * from tracker.finish_discovery($1,$2,null)',[run.id,JSON.stringify([{title:'Verification',url:'https://www.opaz.gov.om/en/zones/sohar-free-zone'}])]);
  const promote=()=>db.query("select tracker.promote_discovery($1,0,'Verification site','Plot test-1, rollback fixture','verification') as id",[run.id]);
  const first=(await promote()).rows[0];const second=(await promote()).rows[0];assert.equal(first.id,second.id);
  const {rows:[parcel]}=await db.query('select * from tracker_read.v_parcels where id=$1',[first.id]);
  assert.equal(parcel.lifecycle_stage,'identified');assert.equal(parcel.firm_capacity_mw,null);assert.equal(parcel.location_description,'Plot test-1, rollback fixture');
  assert.equal((await db.query('select * from tracker_read.v_discovery_promotions where parcel_id=$1',[first.id])).rows.length,1);
  console.log('PASS: run persistence, provenance, idempotent promotion, location and unconfirmed power; all fixture rows rolled back.');
} finally {await db.query('rollback');await db.end();}
