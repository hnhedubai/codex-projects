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

// Allow-list HTML sanitiser for the draft body. Drafts are stored and re-rendered
// across team workspaces, so any HTML that entered the editor must be cleaned of
// scripts, event handlers, remote/embedded content and disallowed tags.
export function sanitizeBodyHtml(html) {
  const doc = new DOMParser().parseFromString('<body>' + String(html ?? '') + '</body>', 'text/html');
  const ALLOWED = new Set(['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD', 'DIV', 'P', 'BR', 'SPAN', 'B', 'I', 'STRONG', 'EM', 'U', 'S', 'STRIKE', 'A', 'UL', 'OL', 'LI', 'FONT', 'HR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'CODE', 'PRE', 'SUP', 'SUB', 'SMALL', 'BIG']);
  const DROP = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'SVG', 'MATH', 'IMG', 'VIDEO', 'AUDIO', 'SOURCE', 'TEMPLATE', 'NOSCRIPT', 'BASE', 'XMP', 'LISTING', 'NOEMBED', 'NOFRAMES', 'PLAINTEXT']);
  const ATTRS = new Set(['style', 'colspan', 'rowspan', 'align', 'valign', 'bgcolor', 'width', 'height', 'scope', 'border', 'cellspacing', 'cellpadding', 'href', 'title', 'data-compose-table']);
  const clean = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 8) { child.remove(); continue; }        // drop comments
      if (child.nodeType !== 1) continue;                             // keep text
      const tag = child.tagName.toUpperCase();
      if (DROP.has(tag)) { child.remove(); continue; }
      if (!ALLOWED.has(tag)) {                                        // unwrap unknown tag, keep children
        const frag = doc.createDocumentFragment();
        while (child.firstChild) frag.appendChild(child.firstChild);
        child.replaceWith(frag);
        clean(node); return;                                          // re-scan this node
      }
      for (const attr of [...child.attributes]) {
        const n = attr.name.toLowerCase();
        if (!ATTRS.has(n) || n.startsWith('on')) { child.removeAttribute(attr.name); continue; }
        if (n === 'href' && !/^(https?:|mailto:|#|\/)/i.test(attr.value.trim())) child.removeAttribute(attr.name);
        if (n === 'style' && /expression|javascript:|url\s*\(|@import/i.test(attr.value)) child.removeAttribute(attr.name);
      }
      clean(child);
    }
  };
  clean(doc.body);
  return doc.body.innerHTML;
}

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

// The direct child of the editor body that contains the table (its movable block).
function movableBlock(tableEl) {
  const body = tableEl.closest('.ct-body');
  if (!body) return tableEl; // never walk to the document root
  let n = tableEl;
  while (n.parentElement && n.parentElement !== body) n = n.parentElement;
  return n;
}
function adjacentBlockSibling(block, direction) {
  let s = direction === 'up' ? block.previousElementSibling : block.nextElementSibling;
  while (s && s.classList && s.classList.contains('ct-bar')) s = direction === 'up' ? s.previousElementSibling : s.nextElementSibling;
  return s;
}

export function moveTableElement(tableEl, direction) {
  const block = movableBlock(tableEl);
  const parent = block.parentElement; if (!parent) return false;
  const target = adjacentBlockSibling(block, direction);
  if (!target) return false;
  if (direction === 'up') parent.insertBefore(block, target);
  else parent.insertBefore(target, block);
  return true;
}

export function deleteTableElement(tableEl) {
  movableBlock(tableEl).remove();
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
