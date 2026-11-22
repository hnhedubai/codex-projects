// In-message table behaviour (Phase 4).
// Pure, unit-tested: recalcTable, clipboardToTableHtml, tableBarHtml.
// Browser-only DOM helpers (read/replace/move/delete/bar wiring) are thin and
// are NOT unit-tested here — they need a live editor to verify.
import { createTable, tsvToTable, buildHtml, setCell, decodeSettings, SETTINGS_ATTR } from './composeTable.js';
import { evaluate } from './tableFormula.js';

// Evaluate every "=..." cell against a snapshot of the grid, then write results.
export function recalcTable(model) {
  const snapshot = model.cells.map((row) => row.map((c) => c.text));
  const opts = { maxRows: model.rows, maxCols: model.cols };
  for (let r = 0; r < model.rows; r++) for (let c = 0; c < model.cols; c++) {
    const raw = String(snapshot[r][c] ?? '').trim();
    if (!raw.startsWith('=')) continue;
    const value = evaluate(raw, snapshot, opts);
    setCell(model, r, c, { text: formatResult(value) });
  }
  return model;
}

function formatResult(value) {
  if (typeof value === 'string') return value; // error token (#REF! etc)
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 1e6) / 1e6);
}

// Turn pasted Excel/Sheets content into a clean, email-safe table.
// TSV text is handled purely (unit-tested); raw pasted HTML needs a DOM.
export function clipboardToTableHtml(clipboardText) {
  const text = String(clipboardText ?? '');
  if (!/[\t\n]/.test(text)) return null; // not tabular
  return buildHtml(tsvToTable(text));
}

// The small bar shown under/over a table that is clicked in the message.
export function tableBarHtml() {
  const b = (action, label, title) => `<button type="button" class="btn subtle ct-bar-btn" data-action="${action}" aria-label="${title}">${label}</button>`;
  return `<div class="ct-bar" contenteditable="false">` +
    b('ct-bar-edit', 'Edit', 'Edit table') +
    b('ct-bar-up', '↑', 'Move table up') +
    b('ct-bar-down', '↓', 'Move table down') +
    `<span class="ct-bar-drag" data-action="ct-bar-drag" title="Drag to move">⠿</span>` +
    b('ct-bar-delete', 'Delete', 'Delete table') +
    `</div>`;
}

// ---------- browser-only DOM helpers (not unit-tested) ----------

// Read a rendered <table> back into a model using its stored settings attribute.
export function readTableFromDom(tableEl) {
  const attr = tableEl.getAttribute(SETTINGS_ATTR);
  const model = attr ? safeDecode(attr) : createTable(1, 1);
  if (!model) return null;
  let r = 0;
  for (const tr of tableEl.querySelectorAll(':scope > tr, :scope > tbody > tr')) {
    let c = 0;
    for (const cell of tr.children) {
      while (model.cells[r]?.[c]?.covered) c++;
      if (model.cells[r]?.[c]) model.cells[r][c].text = cell.textContent;
      c += (Number(cell.getAttribute('colspan')) || 1);
    }
    r++;
  }
  return model;
}
function safeDecode(value) {
  try { return decodeSettings(value); } catch { return null; }
}

export function replaceTableDom(tableEl, model) {
  const wrap = document.createElement('div');
  wrap.innerHTML = buildHtml(model);
  const fresh = wrap.querySelector('table');
  if (fresh) tableEl.replaceWith(fresh);
}

export function moveTableElement(tableEl, direction) {
  const parent = tableEl.parentElement; if (!parent) return false;
  if (direction === 'up' && parent.previousElementSibling) parent.before(parent.previousElementSibling);
  else if (direction === 'down' && parent.nextElementSibling) parent.after(parent.nextElementSibling);
  else return false;
  return true;
}

export function deleteTableElement(tableEl) {
  const bar = tableEl.closest('div')?.querySelector?.('.ct-bar');
  tableEl.remove(); if (bar) bar.remove();
}

// Wire click -> bar, double-click -> reopen editor, paste -> clean table, blur -> recalc.
export function attachTableInteractions(container, { onEdit, onRecalc } = {}) {
  container.addEventListener('paste', (ev) => {
    const text = ev.clipboardData?.getData('text/plain') || '';
    const html = clipboardToTableHtml(text);
    if (html) { ev.preventDefault(); insertHtmlAtCaret(html); }
  });
  container.addEventListener('click', (ev) => {
    const table = ev.target.closest('table[' + SETTINGS_ATTR + ']');
    if (!table) return;
    showBar(table);
    const btn = ev.target.closest('[data-action^="ct-bar-"]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'ct-bar-edit' && onEdit) onEdit(readTableFromDom(table));
    if (action === 'ct-bar-up') moveTableElement(table, 'up');
    if (action === 'ct-bar-down') moveTableElement(table, 'down');
    if (action === 'ct-bar-delete') deleteTableElement(table);
  });
  container.addEventListener('dblclick', (ev) => {
    const table = ev.target.closest('table[' + SETTINGS_ATTR + ']');
    if (table && onEdit) onEdit(readTableFromDom(table));
  });
  container.addEventListener('blur', () => { if (onRecalc) onRecalc(); }, true);
}

let activeBar = null;
export function showBar(tableEl) {
  if (activeBar) activeBar.remove();
  const host = document.createElement('div');
  host.innerHTML = tableBarHtml();
  activeBar = host.firstChild;
  tableEl.after(activeBar);
}

function insertHtmlAtCaret(html) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const node = document.createElement('div');
  node.innerHTML = html;
  range.insertNode(node);
}
