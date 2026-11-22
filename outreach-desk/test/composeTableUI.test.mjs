// Phase 3 locks for the compose-table editor builders + reducer. Node 24 runner; no deps.
// Only the pure, framework-free parts are tested here; the live mount is browser-only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, gridPickerHtml, toolbarHtml, editorGridHtml, dialogHtml } from '../public/composeTableUI.js';
import { createTable, setCell, mergeCells, buildHtml, MAX_ROWS, MAX_COLS } from '../public/composeTable.js';

test('gridPickerHtml renders an 8x8 picker and custom inputs within the caps', () => {
  const html = gridPickerHtml();
  assert.equal((html.match(/data-action="table-create"/g) || []).length, 64);
  assert.match(html, /data-rows="8" data-cols="8"/);
  assert.match(html, new RegExp(`class="ct-custom-rows" min="1" max="${MAX_ROWS}"`));
  assert.match(html, new RegExp(`class="ct-custom-cols" min="1" max="${MAX_COLS}"`));
});

test('applyAction preset/header/cell mutate the model', () => {
  const t = createTable(2, 2);
  applyAction(t, { type: 'preset', value: 'Dark header' });
  assert.equal(t.settings.preset, 'Dark header');
  applyAction(t, { type: 'headerRow' });
  assert.equal(t.headerRow, true);
  applyAction(t, { type: 'cell', r: 0, c: 0, props: { text: 'Hi', bold: true } });
  assert.equal(t.cells[0][0].text, 'Hi');
  assert.equal(t.cells[0][0].bold, true);
});

test('applyAction add/remove/move rows and columns stay within caps', () => {
  const t = createTable(2, 2);
  applyAction(t, { type: 'addRow', at: 2 });
  assert.equal(t.rows, 3);
  applyAction(t, { type: 'removeRow', at: 0 });
  assert.equal(t.rows, 2);
  applyAction(t, { type: 'addCol', at: 2 });
  assert.equal(t.cols, 3);
  // refuse to exceed the cap
  while (t.rows < MAX_ROWS) applyAction(t, { type: 'addRow', at: t.rows });
  applyAction(t, { type: 'addRow', at: t.rows });
  assert.equal(t.rows, MAX_ROWS);
});

test('editorGridHtml renders headers, row numbers, editable cells and merges', () => {
  const t = createTable(3, 3, { headerRow: true });
  setCell(t, 0, 0, { text: 'Name' });
  mergeCells(t, 1, 0, 2, 1);
  const html = editorGridHtml(t);
  assert.match(html, /class="ct-colhead">A</);
  assert.match(html, /class="ct-rowhead">1</);
  assert.match(html, /data-r="0" data-c="0"[^>]*contenteditable="true"[^>]*>Name</);
  assert.match(html, /ct-head/); // header cell class
  assert.match(html, /colspan="2"/);
  assert.match(html, /rowspan="2"/);
  assert.ok(!html.includes('ct-covered'), 'covered cells must not be emitted (anchor spans them)');
});

test('editorGridHtml escapes cell text', () => {
  const t = createTable(1, 1);
  setCell(t, 0, 0, { text: '<script>alert(1)</script>' });
  const html = editorGridHtml(t);
  assert.ok(!html.includes('<script>alert'));
  assert.match(html, /&lt;script&gt;/);
});

test('toolbarHtml reflects model state and includes the Insert action', () => {
  const t = createTable(2, 2, { preset: 'Striped rows' });
  t.headerRow = true;
  const html = toolbarHtml(t);
  assert.match(html, /value="Striped rows" selected/);
  assert.match(html, /data-key="headerRow"[^>]*checked/);
  assert.match(html, /data-action="table-commit">Insert table/);
});

test('dialogHtml composes toolbar and grid', () => {
  const html = dialogHtml(createTable(2, 2));
  assert.match(html, /class="ct-toolbar"/);
  assert.match(html, /class="ct-grid"/);
});

test('reducer to buildHtml produces email-safe output for a driven model', () => {
  const t = createTable(2, 2, { headerRow: true, preset: 'Grid' });
  applyAction(t, { type: 'cell', r: 0, c: 0, props: { text: 'Q1', bold: true } });
  applyAction(t, { type: 'cell', r: 1, c: 0, props: { text: '100' } });
  const html = buildHtml(t);
  assert.match(html, /<th [^>]*scope="col"/);
  assert.match(html, /font-weight:bold/);
  assert.match(html, /border-collapse:collapse/);
  assert.ok(html.includes('Q1') && html.includes('100'));
});
