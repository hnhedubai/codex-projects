import test from 'node:test';
import assert from 'node:assert/strict';
import {partnerRecords} from '../data/source.js';
import {buildOutreachExport} from '../outreach-export.js';
import {listedProjects} from '../../listed-projects/data/source.js';
import {hostedPlan} from '../../../platform-shell/server/pulse/hosted-schedule.mjs';
import {PulseSendService} from '../../../platform-shell/server/pulse/send-service.mjs';

test('intermediary records are explicitly referral-only and excluded from automated scheduling',async()=>{
  const arra=partnerRecords.find(record=>record.id==='arra-pan-european-platform');
  const east=partnerRecords.find(record=>record.id==='east-benefit');
  for(const record of [arra,east]){
    assert.equal(record.referralOnly,true);
    assert.match(record.status,/Referral route/);
    assert.match(record.status,/do not schedule/);
  }
  const start=Date.now()+15*60*1000;
  const plan=hostedPlan([{id:'job',recordId:'arra-pan-european-platform',project:'Arra',company:'arra energy',companyKey:'arra',name:'Route',email:'route@example.com',body:'Dear Route,',subject:'Test',status:'pending'}],[{id:'arra-pan-european-platform',name:'Arra',company:'arra energy',referralOnly:true,region:'Germany',contacts:[{name:'Route',email:'route@example.com',title:'Adviser'}]}],new Date(start).toISOString(),{now:Date.now(),gapSeconds:()=>120});
  assert.equal(plan.jobs.length,0);
  assert.match(plan.excluded[0].reason,/Referral\/intermediary route/);
  const exported=buildOutreachExport({partners:partnerRecords,contacts:{},projects:listedProjects,state:{favourites:[],companies:{}}});
  assert.equal(exported.investors.find(row=>row.id==='arra-pan-european-platform').broadcastEligible,false);
  assert.equal(exported.investors.find(row=>row.id==='east-benefit').broadcastEligible,false);
  assert.equal(exported.investors.find(row=>row.id==='mercury-renewables').broadcastEligible,true);
  const service=new PulseSendService({client:{enabled:true,send(){throw new Error('must not reach Pulse');}},records:{get:async()=>({referralOnly:true})},verifyRecipients:async()=>{throw new Error('must not verify');}});
  await assert.rejects(service.send({key:'investors-jv',history:{},assertChecks(){}},{recordId:'arra-pan-european-platform',mode:'separate',subject:'Test',body:'Hello',recipients:[{email:'route@example.com',name:'Route'}]}),/referral\/intermediary route/);
});
