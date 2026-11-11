import test from 'node:test';
import assert from 'node:assert/strict';
import {h2ProjectRecords} from './data/source.js';
import {h2OutreachPilot} from './data/outreach-pilot.js';
import {buildH2Outreach,h2OutreachDraft} from './data/outreach-drafts.js';

test('every current project has a distinct compliant outreach draft and traceable review metadata',()=>{
 const drafts=h2ProjectRecords.map(buildH2Outreach);
 assert(drafts.length>=60);assert.equal(new Set(drafts.map(d=>d.body)).size,drafts.length);
 for(const d of drafts){
  assert(d.wordCount>=120&&d.wordCount<=170,`${d.id}: ${d.wordCount} words`);
  assert(d.body.endsWith('Best regards,\nMubashir'));
  assert.equal((d.body.match(/Mubashir/g)||[]).length,1);
  assert.doesNotMatch(d.body,/GrynH2|H&H|Dubai|DIFC|\bNDA\b|\bsynergies\b|game-changer|cutting-edge|\bleverage\b|touch base|\bunlock\b|!|^[-*] /m);
  assert(d.facts.length&&Array.isArray(d.flags));
 }
});

test('all five approved pilot bodies and subjects remain exactly unchanged',()=>{
 for(const approved of h2OutreachPilot){const d=buildH2Outreach(h2ProjectRecords.find(r=>r.id===approved.id));assert.equal(d.body,approved.body);assert.equal(d.subject,approved.subject);assert(d.approvedPilot);}
});

test('new projects automatically get a conservative fact-based draft without invented scale or mandate',()=>{
 const record={id:'future-plant',name:'Future Hydrogen Project',signal:'Investment opportunities unconfirmed',capacity:'A disputed 9876 MW number',stage:'FID unconfirmed'};
 const original=JSON.stringify(record),draft=buildH2Outreach(record);
 assert.equal(draft.angle,'Consortium-led or established partnership');
 assert.match(draft.body,/Dear \[Name\],/);assert.match(draft.body,/Is any additional partner role open/);
 assert.doesNotMatch(draft.body,/9876|secured|committed capital|open investment opportunity/i);
 assert(draft.wordCount>=120&&draft.wordCount<=170);assert.equal(JSON.stringify(record),original);
 assert(draft.flags.some(f=>f.includes('Automatic draft')));assert(h2OutreachDraft(record).startsWith('Subject: Future Hydrogen Project'));
});

test('future archived projects ask about current status rather than promote an active raise',()=>{
 const draft=buildH2Outreach({id:'archived-new',name:'Old Hydrogen Project',signal:'Investment invitation',stage:'Archived'});
 assert.match(draft.body,/whether any further development is under consideration/);
 assert.doesNotMatch(draft.body,/capital being raised|currently seeking investors/i);
});

test('personal greetings exclude historical officers, shared desks and uncertain role matches',()=>{
 const draft=buildH2Outreach({id:'new-recipient',name:'New Project',contacts:[{name:'Old Person',title:'Former CEO'},{name:'Project Desk',title:'Contact team'},{name:'Maybe Person',status:'Current role unconfirmed'},{name:'Dr Alice Smith',title:'Commercial Director'}]});
 assert.match(draft.body,/^Dear Alice,/);assert.equal(draft.contactName,'Dr Alice Smith');
});
