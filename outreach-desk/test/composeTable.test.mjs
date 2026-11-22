// Phase 1 locks for the compose-table model + email-safe HTML builder.
// Node 24 built-in runner; no dependencies. Covers structure, merge/split, TSV,
// untrusted encode/decode sanitisation, Outlook-safe output and strip-on-export.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ROWS, MAX_COLS, SETTINGS_ATTR, createTable, applyPreset,
  addRow, removeRow, addCol, removeCol, moveRow, moveCol,
  mergeCells, splitCell, setCell, setRowProp, setColProp, setColWidth, setOuterBorder, tsvToTable, tableToTsv,
  encodeSettings, decodeSettings, buildHtml, stripSettings, sizeWarning, escapeHtml,
} from '../public/composeTable.js';

const rectangular = (t) => t.cells.length === t.rows && t.cells.every((r) => r.length === t.cols);

test('createTable clamps rows and columns to the limits', () => {
  const t = createTable(999, 999);
  assert.equal(t.rows, MAX_ROWS);
  assert.equal(t.cols, MAX_COLS);
  assert.ok(rectangular(t));
  assert.equal(t.colWidths.reduce((a, b) => a + b, 0), 100);
});

test('structural add/remove stays rectangular and respects limits', () => {
  const t = createTable(2, 2);
  assert.equal(addRow(t), true);
  assert.equal(t.rows, 3);
  assert.equal(removeRow(t, 0), true);
  assert.equal(t.rows, 2);
  assert.equal(addCol(t), true);
  assert.equal(t.cols, 3);
  assert.ok(rectangular(t));
  // fill to the cap, then confirm it refuses to exceed
  while (t.rows < MAX_ROWS) addRow(t);
  assert.equal(addRow(t), false);
  while (t.cols < MAX_COLS) addCol(t);
  assert.equal(addCol(t), false);
  assert.ok(rectangular(t));
});

test('moveRow / moveCol reorder without breaking the grid', () => {
  const t = createTable(3, 3);
  setCell(t, 0, 0, { text: 'A' }); setCell(t, 1, 0, { text: 'B' });
  assert.equal(moveRow(t, 0, 2), true);
  assert.equal(t.cells[2][0].text, 'A');
  assert.equal(t.cells[0][0].text, 'B'); // row B shifts up to index 0
  assert.equal(moveCol(t, 0, 2), true);
  assert.ok(rectangular(t));
});

test('mergeCells spans the anchor and covers the rest; buildHtml emits spans', () => {
  const t = createTable(3, 3);
  assert.equal(mergeCells(t, 0, 0, 1, 1), true);
  assert.equal(t.cells[0][0].colspan, 2);
  assert.equal(t.cells[0][0].rowspan, 2);
  assert.equal(t.cells[1][1].covered, true);
  const html = buildHtml(t);
  assert.match(html, /colspan="2"/);
  assert.match(html, /rowspan="2"/);
  assert.equal(splitCell(t, 0, 0), true);
  assert.equal(t.cells[1][1].covered, false);
});

test('merge of a single cell is a no-op', () => {
  const t = createTable(2, 2);
  assert.equal(mergeCells(t, 1, 1, 1, 1), false);
});

test('TSV paste round-trips through the model', () => {
  const src = 'Name\tRole\nAda\tEngineer\nLin\tDesigner';
  const t = tsvToTable(src);
  assert.equal(t.rows, 3);
  assert.equal(t.cols, 2);
  assert.equal(t.cells[1][0].text, 'Ada');
  assert.equal(tableToTsv(t), src);
});

test('tsvToTable survives a huge paste without a spread RangeError', () => {
  const big = 'a\n'.repeat(100000); // exceeds the old Math.max(...spread) argument limit
  const t = tsvToTable(big);
  assert.equal(t.rows, MAX_ROWS); // clamped
  assert.equal(t.cols, 1);
});

test('buildHtml is email-safe: inline styles, th scope, border-collapse, width attr+style, trailing line', () => {
  const t = createTable(2, 2, { headerRow: true, preset: 'Grid' });
  setCell(t, 0, 0, { text: 'H1' }); setCell(t, 1, 1, { text: 'x' });
  const html = buildHtml(t);
  assert.match(html, /<table [^>]*border-collapse:collapse/);
  assert.match(html, /width="100%"/);
  assert.match(html, /border-collapse:collapse;width:100%/);
  assert.match(html, /<th [^>]*scope="col"/);
  assert.match(html, /font-family:Calibri,sans-serif;font-size:14px/); // font repeated per cell
  assert.match(html, /border-top:1px solid #999999/);
  assert.match(html, /<p style="margin:0">&nbsp;<\/p>$/); // empty line follows the table
  assert.ok(!/class=/.test(html), 'no classes in output');
});

test('cell text is HTML-escaped', () => {
  const t = createTable(1, 1);
  setCell(t, 0, 0, { text: '<script>alert(1)</script> & "quote"' });
  const html = buildHtml(t);
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;/);
  assert.equal(escapeHtml(undefined), '');
});

test('encode/decode round-trips settings and styles (text excluded)', () => {
  const t = createTable(3, 2, { headerRow: true, preset: 'Dark header' });
  setCell(t, 0, 0, { text: 'keep-out-of-attr', bold: true, color: '#ffffff', align: 'center' });
  setCell(t, 2, 1, { bg: '#f2f2f2', italic: true });
  mergeCells(t, 1, 0, 2, 1);
  const decoded = decodeSettings(encodeSettings(t));
  assert.equal(decoded.rows, 3);
  assert.equal(decoded.cols, 2);
  assert.equal(decoded.settings.preset, 'Dark header');
  assert.equal(decoded.cells[0][0].bold, true);
  assert.equal(decoded.cells[0][0].color, '#ffffff');
  assert.equal(decoded.cells[0][0].text, ''); // text is NOT stored in the attribute
  assert.equal(decoded.cells[1][0].colspan, 2);
  assert.equal(decoded.cells[2][1].covered, true);
});

test('decode rejects hostile input: bad colours, oversized geometry, unknown fields, garbage', () => {
  const enc = (o) => encodeURIComponent(JSON.stringify(o));
  const big = decodeSettings(enc({ v: 2, rows: 9999, cols: 9999, settings: {} }));
  assert.equal(big.rows, MAX_ROWS);
  assert.equal(big.cols, MAX_COLS);

  const bad = decodeSettings(enc({ v: 2, rows: 2, cols: 2, styles: [[{ color: 'javascript:alert(1)', bg: 'red', colspan: 99 }], []], unknown: 'x' }));
  assert.equal(bad.cells[0][0].color, null);
  assert.equal(bad.cells[0][0].bg, null);
  assert.ok(bad.cells[0][0].colspan <= bad.cols);

  assert.equal(decodeSettings('not-json'), null);
  assert.equal(decodeSettings(enc({ v: 1, rows: 2, cols: 2 })), null); // wrong version
  assert.equal(decodeSettings('x'.repeat(200001)), null); // over the 200k cap
});

test('stripSettings removes the attribute so it never reaches outgoing HTML', () => {
  const t = createTable(2, 2);
  const html = buildHtml(t);
  assert.ok(html.includes(SETTINGS_ATTR));
  const stripped = stripSettings(html);
  assert.ok(!stripped.includes(SETTINGS_ATTR), 'settings attribute must not survive export');
  assert.match(stripped, /<table/); // the table itself is preserved
});

test('sizeWarning flags only oversized tables', () => {
  assert.equal(sizeWarning(buildHtml(createTable(2, 2))), false);
  const huge = '<table>' + '<td>lorem ipsum dolor sit amet</td>'.repeat(5000) + '</table>';
  assert.equal(sizeWarning(huge), true);
});

test('applyPreset returns a valid sanitised settings object for each preset', () => {
  for (const p of ['Grid', 'Dark header', 'Striped rows', 'Plain']) {
    const s = applyPreset(p);
    assert.equal(s.preset, p);
    assert.ok(s.font.size >= 11 && s.font.size <= 20);
    assert.ok(!s.border.outer.color || /^#[0-9a-f]{3,6}$/.test(s.border.outer.color));
  }
  assert.equal(applyPreset('nonsense').preset, 'Grid'); // falls back
});

test('setColWidth sets one column and renormalises the rest to 100', () => {
  const t = createTable(2, 4); // 25 each
  setColWidth(t, 0, 55);
  assert.equal(t.colWidths[0], 55);
  assert.equal(t.colWidths.reduce((a, b) => a + b, 0), 100);
});

test('setOuterBorder partial update keeps the other fields', () => {
  const t = createTable(2, 2, { preset: 'Grid' });
  const before = { ...t.settings.border.outer };
  setOuterBorder(t, { color: '#ff0000' });
  assert.equal(t.settings.border.outer.color, '#ff0000');
  assert.equal(t.settings.border.outer.style, before.style);
  assert.equal(t.settings.border.outer.width, before.width);
  setOuterBorder(t, { color: 'javascript:alert(1)' }); // rejected, keeps previous
  assert.equal(t.settings.border.outer.color, '#ff0000');
});

test('setRowProp / setColProp apply to every cell in the line', () => {
  const t = createTable(3, 3);
  setRowProp(t, 1, { bg: '#eeeeee' });
  assert.deepEqual([0, 1, 2].map((c) => t.cells[1][c].bg), ['#eeeeee', '#eeeeee', '#eeeeee']);
  setColProp(t, 2, { align: 'right' });
  assert.deepEqual([0, 1, 2].map((r) => t.cells[r][2].align), ['right', 'right', 'right']);
});

test('buildHtml applies per-column widths on the first row', () => {
  const t = createTable(2, 2);
  setColWidth(t, 0, 70);
  const html = buildHtml(t);
  assert.match(html, /width="70%"/);
  assert.match(html, /width="30%"/);
});

test('buildHtml renders the totals row with emphasis', () => {
  const t = createTable(3, 2);
  t.totalsRow = true;
  const html = buildHtml(t);
  // last row cells get bold + a heavier top border (headerUnder style)
  assert.match(html, /border-top:2px solid #999999/);
  assert.match(html, /font-weight:bold/);
});
