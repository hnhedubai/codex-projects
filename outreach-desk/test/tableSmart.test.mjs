// Phase 6 locks for optional smart-fill logic. Node 24 runner; no deps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SMART_FILL_ENABLED, detectSeries, smartFill, autocomplete, suggestImprovements } from '../public/tableSmart.js';
import { createTable, setCell } from '../public/composeTable.js';

test('smart fill is feature-flagged off by default', () => {
  assert.equal(SMART_FILL_ENABLED, false);
});

test('detectSeries finds arithmetic and geometric runs', () => {
  assert.deepEqual(detectSeries([2, 4, 6]), { type: 'arithmetic', step: 2 });
  assert.deepEqual(detectSeries([2, 6, 18]), { type: 'geometric', ratio: 3 });
  assert.equal(detectSeries([2, 5, 9]), null);
  assert.equal(detectSeries([5]), null);
  assert.equal(detectSeries(['a', 'b']), null);
});

test('smartFill predicts the next values', () => {
  assert.deepEqual(smartFill([2, 4, 6], 2), [8, 10]);
  assert.deepEqual(smartFill([2, 6, 18], 1), [54]);
  assert.deepEqual(smartFill([1, 2, 4, 9], 3), []); // neither arithmetic nor geometric
});

test('autocomplete filters by prefix, de-dupes and sorts shortest-first', () => {
  const r = autocomplete(['Engineering', 'Engineer', 'Sales', 'engineer'], 'eng');
  assert.deepEqual(r, ['Engineer', 'Engineering']);
  assert.deepEqual(autocomplete(['a', 'b'], ''), []);
});

test('suggestImprovements flags headerless and oversized tables', () => {
  const plain = createTable(2, 2);
  assert.ok(suggestImprovements(plain).some((n) => /header row/i.test(n)));
  const wide = createTable(2, 9, { headerRow: true });
  assert.ok(suggestImprovements(wide).some((n) => /8 columns/i.test(n)));
  const tall = createTable(25, 2, { headerRow: true });
  assert.ok(suggestImprovements(tall).some((n) => /clip limit/i.test(n)));
  const healthy = createTable(3, 4, { headerRow: true });
  assert.deepEqual(suggestImprovements(healthy), []);
});
