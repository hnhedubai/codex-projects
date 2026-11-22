// Phase 4 locks for in-message table logic. Node 24 runner; no deps.
// Only the pure parts are tested; the DOM helpers are browser-only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recalcTable, clipboardToTableHtml, tableBarHtml } from '../public/composeTableMessage.js';
import { createTable, setCell } from '../public/composeTable.js';

test('recalcTable evaluates formula cells and writes results', () => {
  const t = createTable(2, 1);
  setCell(t, 0, 0, { text: '=A2*2' });
  setCell(t, 1, 0, { text: '5' });
  recalcTable(t);
  assert.equal(t.cells[0][0].text, '10');
  assert.equal(t.cells[1][0].text, '5'); // non-formula untouched
});

test('recalcTable handles ranges and totals', () => {
  const t = createTable(4, 1);
  setCell(t, 0, 0, { text: '1' });
  setCell(t, 1, 0, { text: '2' });
  setCell(t, 2, 0, { text: '3' });
  setCell(t, 3, 0, { text: '=SUM(A1:A3)' });
  recalcTable(t);
  assert.equal(t.cells[3][0].text, '6');
});

test('recalcTable writes error tokens for bad formulas', () => {
  const cycle = createTable(1, 1);
  setCell(cycle, 0, 0, { text: '=A1' });
  recalcTable(cycle);
  assert.equal(cycle.cells[0][0].text, '#CYCLE!');

  const div = createTable(3, 1);
  setCell(div, 0, 0, { text: '1' });
  setCell(div, 1, 0, { text: '0' });
  setCell(div, 2, 0, { text: '=A1/A2' });
  recalcTable(div);
  assert.equal(div.cells[2][0].text, '#DIV/0!');
});

test('recalcTable rounds non-integers', () => {
  const t = createTable(2, 1);
  setCell(t, 0, 0, { text: '=A2' });
  setCell(t, 1, 0, { text: '=10/3' });
  recalcTable(t);
  assert.equal(t.cells[1][0].text, String(Math.round((10 / 3) * 1e6) / 1e6));
});

test('clipboardToTableHtml converts tabular TSV into an email-safe table', () => {
  const html = clipboardToTableHtml('Name\tRole\nAda\tEngineer');
  assert.ok(html.includes('<table'));
  assert.ok(html.includes('Ada') && html.includes('Engineer'));
  assert.match(html, /border-collapse:collapse/);
});

test('clipboardToTableHtml returns null for non-tabular text', () => {
  assert.equal(clipboardToTableHtml('just a sentence'), null);
  assert.equal(clipboardToTableHtml(''), null);
});

test('tableBarHtml renders the in-message action bar (non-editable)', () => {
  const html = tableBarHtml();
  assert.match(html, /contenteditable="false"/);
  for (const a of ['ct-bar-edit', 'ct-bar-up', 'ct-bar-down', 'ct-bar-delete', 'ct-bar-drag']) {
    assert.ok(html.includes(`data-action="${a}"`), 'missing ' + a);
  }
});
