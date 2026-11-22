// Phase 5 locks for the export boundary: the editor-settings attribute must be
// stripped from outgoing HTML (Copy / Open) so recipients never see settings.
// This is the single shared strip function; the test fails if the attribute leaks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTable, setCell, buildHtml, stripSettings, SETTINGS_ATTR } from '../public/composeTable.js';

const outgoing = (t) => stripSettings(buildHtml(t));

test('built table carries the settings attribute before export', () => {
  const html = buildHtml(createTable(2, 2));
  assert.ok(html.includes(SETTINGS_ATTR), 'baseline: the editor attribute is present in the stored draft');
});

test('stripSettings removes the attribute from outgoing HTML', () => {
  const html = outgoing(createTable(2, 2));
  assert.ok(!html.includes(SETTINGS_ATTR), 'settings attribute leaked into outgoing HTML');
  assert.ok(!/data-compose-table=/.test(html));
});

test('the table itself survives stripping (content preserved)', () => {
  const t = createTable(2, 2, { headerRow: true });
  setCell(t, 0, 0, { text: 'Quarter' });
  setCell(t, 1, 1, { text: '42' });
  const html = outgoing(t);
  assert.match(html, /<table/);
  assert.match(html, /Quarter/);
  assert.match(html, /42/);
  assert.match(html, /border-collapse:collapse/);
});

test('stripSettings removes every attribute across multiple tables', () => {
  const two = buildHtml(createTable(2, 2)) + buildHtml(createTable(3, 3));
  assert.equal((two.match(new RegExp(SETTINGS_ATTR, 'g')) || []).length, 2);
  const stripped = stripSettings(two);
  assert.equal((stripped.match(new RegExp(SETTINGS_ATTR, 'g')) || []).length, 0);
});

test('stripSettings handles a hostile pre-existing attribute in arbitrary HTML', () => {
  const dirty = `<p>hi</p><table ${SETTINGS_ATTR}="%7B%22v%22%3A2%7D"><tr><td>x</td></tr></table>`;
  const clean = stripSettings(dirty);
  assert.ok(!clean.includes(SETTINGS_ATTR));
  assert.ok(clean.includes('<td>x</td>'));
});
