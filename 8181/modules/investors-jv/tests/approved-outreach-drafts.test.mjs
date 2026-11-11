import test from 'node:test';
import assert from 'node:assert/strict';
import {APPROVED_SOLAR_WIND_DRAFTS,approvedSolarWindDraft} from '../approved-outreach-drafts.js';

test('approved Solar/Wind drafts retain bullets, CTA and sign-off',()=>{
 for(const kind of ['evidence','noEvidence']){
  const draft=approvedSolarWindDraft(kind,{name:'Mubashir',company:'Green Genius',evidenceUrl:'https://example.com/source'});
  assert.match(draft,/• Capacity 510 MW/);assert.match(draft,/• shovel-ready \/ RTB opportunities\./);assert.match(draft,/30-minute meeting/);assert.match(draft,/Best regards,\nMubashir$/);assert.doesNotMatch(draft,/\[(?:Name|Company|Evidence URL)\]/);
 }
 assert.ok(APPROVED_SOLAR_WIND_DRAFTS.evidence.includes('[Evidence URL]'));
});
