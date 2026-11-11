import test from 'node:test';
import assert from 'node:assert/strict';
const {H2_PRIORITY_CATEGORIES,h2PriorityCategory}=await import('../../../modules/h2-dev/priority.js');
const {h2DeveloperRecords}=await import('../../../modules/h2-dev/data/source.js');
test('every H2 developer has one of the six priority categories',()=>{
 assert.deepEqual(H2_PRIORITY_CATEGORIES,['Ultra High','High','Strong','Moderate','Low','Very Low']);
 assert.equal(new Set(h2DeveloperRecords.map(h2PriorityCategory)).size,6);
 assert.equal(h2DeveloperRecords.length,55);
});
