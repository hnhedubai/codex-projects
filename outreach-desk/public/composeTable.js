// Framework-free compose-table model + email-safe HTML builder.
// Reimplemented for this vanilla-JS app (no DOM, no dependencies) so it imports
// cleanly into the node --test runner. Output is Outlook/Gmail/Apple Mail safe:
// every style inline, width as attribute + style, per-cell borders, fonts repeated.

export const MAX_ROWS = 30;
export const MAX_COLS = 10;
export const MAX_WIDTH_PX = 1000;
export const WARN_BYTES = 60 * 1024; // Gmail clips messages near 102 KB.
export const MAX_SETTINGS_CHARS = 200000;
export const SETTINGS_ATTR = 'data-compose-table';
export const SETTINGS_VERSION = 2;

export const SAFE_FONTS = ['Arial', 'Calibri', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Times New Roman'];
export const ALIGNMENTS = ['left', 'center', 'right'];
export const VALIGNMENTS = ['top', 'middle', 'bottom'];
export const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'none'];
export const PRESETS = ['Grid', 'Dark header', 'Striped rows', 'Plain'];

const clampInt = (v, min, max) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min; };
const hex = (v) => { if (typeof v !== 'string') return null; const s = v.trim().toLowerCase(); return /^#[0-9a-f]{3}$/.test(s) || /^#[0-9a-f]{6}$/.test(s) ? s : null; };
const oneOf = (v, list, def) => (list.includes(v) ? v : def);
const px = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(MAX_WIDTH_PX, Math.round(n))) : 0; };

export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- model ----------

function makeCell(text = '') {
  return { text: String(text ?? ''), bold: false, italic: false, color: null, bg: null, align: 'left', valign: 'top', colspan: 1, rowspan: 1, covered: false };
}

export function applyPreset(name) {
  switch (oneOf(name, PRESETS, 'Grid')) {
    case 'Dark header':
      return { preset: 'Dark header', font: { family: 'Calibri', size: 14 },
        border: { outer: { style: 'solid', width: 1, color: '#444444' }, innerH: { style: 'solid', width: 1, color: '#cccccc' }, innerV: { style: 'solid', width: 1, color: '#cccccc' }, headerUnder: { style: 'solid', width: 2, color: '#444444' } },
        header: { bg: '#333333', color: '#ffffff', bold: true }, stripe: { bg: '#f2f2f2' }, layout: { width: 'full', align: 'left', wrap: false } };
    case 'Striped rows':
      return { preset: 'Striped rows', font: { family: 'Calibri', size: 14 },
        border: { outer: { style: 'solid', width: 1, color: '#dddddd' }, innerH: { style: 'none', width: 0, color: null }, innerV: { style: 'none', width: 0, color: null }, headerUnder: { style: 'solid', width: 2, color: '#ea580c' } },
        header: { bg: '#fff3ea', color: '#1c1917', bold: true }, stripe: { bg: '#faf7f2' }, layout: { width: 'full', align: 'left', wrap: false } };
    case 'Plain':
      return { preset: 'Plain', font: { family: 'Arial', size: 14 },
        border: { outer: { style: 'none', width: 0, color: null }, innerH: { style: 'none', width: 0, color: null }, innerV: { style: 'none', width: 0, color: null }, headerUnder: { style: 'none', width: 0, color: null } },
        header: { bg: null, color: null, bold: true }, stripe: { bg: null }, layout: { width: 'fit', align: 'left', wrap: false } };
    case 'Grid':
    default:
      return { preset: 'Grid', font: { family: 'Calibri', size: 14 },
        border: { outer: { style: 'solid', width: 1, color: '#999999' }, innerH: { style: 'solid', width: 1, color: '#cccccc' }, innerV: { style: 'solid', width: 1, color: '#cccccc' }, headerUnder: { style: 'solid', width: 2, color: '#999999' } },
        header: { bg: '#f4f0e7', color: null, bold: true }, stripe: { bg: null }, layout: { width: 'full', align: 'left', wrap: false } };
  }
}

export function createTable(rows = 3, cols = 3, opts = {}) {
  rows = clampInt(rows, 1, MAX_ROWS);
  cols = clampInt(cols, 1, MAX_COLS);
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => makeCell()));
  const base = Math.floor(100 / cols);
  return {
    version: SETTINGS_VERSION, rows, cols, cells,
    headerRow: !!opts.headerRow, headerCol: !!opts.headerCol, totalsRow: !!opts.totalsRow,
    colWidths: Array.from({ length: cols }, (_, i) => (i === cols - 1 ? 100 - base * (cols - 1) : base)),
    settings: applyPreset(opts.preset),
  };
}

// ---------- structure ----------

export function addRow(t, at = t.rows) {
  if (t.rows >= MAX_ROWS) return false;
  t.rows += 1;
  const i = clampInt(at, 0, t.rows - 1);
  t.cells.splice(i, 0, Array.from({ length: t.cols }, () => makeCell()));
  clearSpans(t);
  return true;
}

export function removeRow(t, at) {
  if (t.rows <= 1) return false;
  t.cells.splice(clampInt(at, 0, t.rows - 1), 1);
  t.rows -= 1;
  clearSpans(t);
  return true;
}

export function addCol(t, at = t.cols) {
  if (t.cols >= MAX_COLS) return false;
  t.cols += 1;
  const i = clampInt(at, 0, t.cols - 1);
  for (const row of t.cells) row.splice(i, 0, makeCell());
  rebalanceCols(t);
  clearSpans(t);
  return true;
}

export function removeCol(t, at) {
  if (t.cols <= 1) return false;
  const i = clampInt(at, 0, t.cols - 1);
  for (const row of t.cells) row.splice(i, 1);
  t.cols -= 1;
  rebalanceCols(t);
  clearSpans(t);
  return true;
}

export function moveRow(t, from, to) {
  from = clampInt(from, 0, t.rows - 1); to = clampInt(to, 0, t.rows - 1);
  if (from === to) return false;
  const [row] = t.cells.splice(from, 1);
  t.cells.splice(to, 0, row);
  clearSpans(t);
  return true;
}

export function moveCol(t, from, to) {
  from = clampInt(from, 0, t.cols - 1); to = clampInt(to, 0, t.cols - 1);
  if (from === to) return false;
  for (const row of t.cells) { const [c] = row.splice(from, 1); row.splice(to, 0, c); }
  const [w] = t.colWidths.splice(from, 1);
  t.colWidths.splice(to, 0, w);
  clearSpans(t);
  return true;
}

function rebalanceCols(t) {
  const base = Math.floor(100 / t.cols);
  t.colWidths = Array.from({ length: t.cols }, (_, i) => (i === t.cols - 1 ? 100 - base * (t.cols - 1) : base));
}

// Reset any merges so the grid stays rectangular after a structural change.
function clearSpans(t) {
  for (const row of t.cells) for (const c of row) { c.colspan = 1; c.rowspan = 1; c.covered = false; }
}

// ---------- merge / split ----------

export function mergeCells(t, r1, c1, r2, c2) {
  r1 = clampInt(Math.min(r1, r2), 0, t.rows - 1); r2 = clampInt(Math.max(r1, r2), 0, t.rows - 1);
  c1 = clampInt(Math.min(c1, c2), 0, t.cols - 1); c2 = clampInt(Math.max(c1, c2), 0, t.cols - 1);
  if (r1 === r2 && c1 === c2) return false;
  const anchor = t.cells[r1][c1];
  anchor.colspan = c2 - c1 + 1; anchor.rowspan = r2 - r1 + 1;
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
    if (r === r1 && c === c1) continue;
    t.cells[r][c].covered = true;
  }
  return true;
}

export function splitCell(t, r, c) {
  const cell = t.cells[clampInt(r, 0, t.rows - 1)]?.[clampInt(c, 0, t.cols - 1)];
  if (!cell || (cell.colspan === 1 && cell.rowspan === 1)) return false;
  const { colspan, rowspan } = cell;
  cell.colspan = 1; cell.rowspan = 1;
  for (let rr = r; rr < r + rowspan; rr++) for (let cc = c; cc < c + colspan; cc++) {
    if (rr === r && cc === c) continue;
    if (t.cells[rr]?.[cc]) t.cells[rr][cc].covered = false;
  }
  return true;
}

// ---------- cell props ----------

export function setCell(t, r, c, props = {}) {
  const cell = t.cells[clampInt(r, 0, t.rows - 1)]?.[clampInt(c, 0, t.cols - 1)];
  if (!cell) return false;
  if ('text' in props) cell.text = String(props.text ?? '');
  if ('bold' in props) cell.bold = !!props.bold;
  if ('italic' in props) cell.italic = !!props.italic;
  if ('color' in props) cell.color = hex(props.color);
  if ('bg' in props) cell.bg = hex(props.bg);
  if ('align' in props) cell.align = oneOf(props.align, ALIGNMENTS, 'left');
  if ('valign' in props) cell.valign = oneOf(props.valign, VALIGNMENTS, 'top');
  return true;
}

// ---------- TSV paste ----------

export function tsvToTable(text, opts = {}) {
  const rows = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  while (rows.length && rows[rows.length - 1] === '') rows.pop();
  const grid = rows.map((line) => line.split('\t'));
  const cols = Math.max(1, ...grid.map((r) => r.length));
  const t = createTable(clampInt(grid.length || 1, 1, MAX_ROWS), clampInt(cols, 1, MAX_COLS), opts);
  for (let r = 0; r < t.rows; r++) for (let c = 0; c < t.cols; c++) t.cells[r][c].text = grid[r]?.[c] ?? '';
  return t;
}

export function tableToTsv(t) {
  return t.cells.map((row) => row.map((c) => (c.covered ? '' : String(c.text ?? '').replace(/[\t\n]/g, ' '))).join('\t')).join('\n');
}

// ---------- settings encode / decode (untrusted-safe) ----------

function cellStyle(c) {
  return { bold: !!c.bold, italic: !!c.italic, color: hex(c.color), bg: hex(c.bg), align: oneOf(c.align, ALIGNMENTS, 'left'), valign: oneOf(c.valign, VALIGNMENTS, 'top'), colspan: clampInt(c.colspan, 1, MAX_COLS), rowspan: clampInt(c.rowspan, 1, MAX_ROWS), covered: !!c.covered };
}

// Everything except cell text, so a draft reopens exactly.
export function encodeSettings(t) {
  const styles = t.cells.map((row) => row.map(cellStyle));
  const obj = {
    v: SETTINGS_VERSION, rows: clampInt(t.rows, 1, MAX_ROWS), cols: clampInt(t.cols, 1, MAX_COLS),
    headerRow: !!t.headerRow, headerCol: !!t.headerCol, totalsRow: !!t.totalsRow,
    colWidths: t.colWidths.slice(0, MAX_COLS).map((w) => clampInt(w, 0, 100)),
    settings: sanitizeSettings(t.settings), styles,
  };
  return encodeURIComponent(JSON.stringify(obj));
}

export function decodeSettings(value) {
  const raw = String(value ?? '');
  if (raw.length > MAX_SETTINGS_CHARS) return null; // reject oversized payloads outright
  let obj;
  try { obj = JSON.parse(decodeURIComponent(raw)); } catch { return null; }
  if (!obj || typeof obj !== 'object' || obj.v !== SETTINGS_VERSION) return null;
  const rows = clampInt(obj.rows, 1, MAX_ROWS), cols = clampInt(obj.cols, 1, MAX_COLS);
  const t = createTable(rows, cols);
  t.headerRow = !!obj.headerRow; t.headerCol = !!obj.headerCol; t.totalsRow = !!obj.totalsRow;
  if (Array.isArray(obj.colWidths)) for (let c = 0; c < cols; c++) t.colWidths[c] = clampInt(obj.colWidths[c], 0, 100);
  t.settings = sanitizeSettings(obj.settings);
  if (Array.isArray(obj.styles)) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const s = obj.styles[r]?.[c]; if (!s) continue;
    const cell = t.cells[r][c];
    cell.bold = !!s.bold; cell.italic = !!s.italic; cell.color = hex(s.color); cell.bg = hex(s.bg);
    cell.align = oneOf(s.align, ALIGNMENTS, 'left'); cell.valign = oneOf(s.valign, VALIGNMENTS, 'top');
    cell.colspan = clampInt(s.colspan, 1, cols - c); cell.rowspan = clampInt(s.rowspan, 1, rows - r);
    cell.covered = !!s.covered;
  }
  return t;
}

// Accept only our own fields; hex colours only; clamp everything. Unknown keys ignored.
function sanitizeSettings(s) {
  const base = applyPreset('Grid');
  if (!s || typeof s !== 'object') return base;
  const border = (b, def) => (!b || typeof b !== 'object' ? def : { style: oneOf(b.style, BORDER_STYLES, def.style), width: clampInt(b.width, 0, 12), color: hex(b.color) });
  return {
    preset: oneOf(s.preset, PRESETS, 'Grid'),
    font: { family: oneOf(s.font?.family, SAFE_FONTS, base.font.family), size: clampInt(s.font?.size, 11, 20) },
    border: { outer: border(s.border?.outer, base.border.outer), innerH: border(s.border?.innerH, base.border.innerH), innerV: border(s.border?.innerV, base.border.innerV), headerUnder: border(s.border?.headerUnder, base.border.headerUnder) },
    header: { bg: hex(s.header?.bg), color: hex(s.header?.color), bold: s.header ? !!s.header.bold : true },
    stripe: { bg: hex(s.stripe?.bg) },
    layout: { width: oneOf(s.layout?.width, ['full', 'fit', 'percent', 'px'], 'full'), align: oneOf(s.layout?.align, ALIGNMENTS, 'left'), wrap: !!s.layout?.wrap, percent: clampInt(s.layout?.percent ?? 100, 1, 100), px: px(s.layout?.px ?? MAX_WIDTH_PX) },
  };
}

// ---------- email-safe HTML ----------

function cssBorder(spec) {
  if (!spec || spec.style === 'none' || spec.width <= 0) return 'none';
  return `${spec.width}px ${spec.style} ${spec.color || '#000000'}`;
}

function tableWidth(t) {
  const l = t.settings.layout;
  if (l.width === 'fit') return { attr: null, style: 'width:auto' };
  if (l.width === 'percent') { const p = clampInt(t.settings.layout.percent ?? 100, 1, 100); return { attr: `${p}%`, style: `width:${p}%` }; }
  if (l.width === 'px') { const w = px(t.settings.layout.px ?? MAX_WIDTH_PX); return { attr: String(w), style: `width:${w}px;max-width:${w}px` }; }
  return { attr: '100%', style: 'width:100%' };
}

export function buildHtml(t) {
  const s = t.settings, font = `font-family:${s.font.family},sans-serif;font-size:${s.font.size}px`;
  const w = tableWidth(t);
  const rows = [];
  for (let r = 0; r < t.rows; r++) {
    const cells = [];
    for (let c = 0; c < t.cols; c++) {
      const cell = t.cells[r][c];
      if (cell.covered) continue;
      const isHeader = (t.headerRow && r === 0) || (t.headerCol && c === 0);
      const top = r === 0 ? s.border.outer : (t.headerRow && r === 1 ? s.border.headerUnder : s.border.innerH);
      const bottom = r === t.rows - 1 ? s.border.outer : s.border.innerH;
      const left = c === 0 ? s.border.outer : s.border.innerV;
      const right = c === t.cols - 1 ? s.border.outer : s.border.innerV;
      const bg = cell.bg || (isHeader ? s.header.bg : (s.stripe.bg && r % 2 === 1 ? s.stripe.bg : null));
      const color = cell.color || (isHeader ? s.header.color : null);
      const bold = cell.bold || (isHeader && s.header.bold);
      const style = [
        font,
        `border-top:${cssBorder(top)}`, `border-right:${cssBorder(right)}`, `border-bottom:${cssBorder(bottom)}`, `border-left:${cssBorder(left)}`,
        `padding:8px 10px`, `text-align:${cell.align}`, `vertical-align:${cell.valign}`,
        bold ? 'font-weight:bold' : '', cell.italic ? 'font-style:italic' : '',
        bg ? `background-color:${bg}` : '', color ? `color:${color}` : '',
      ].filter(Boolean).join(';');
      const attrs = [
        cell.colspan > 1 ? `colspan="${cell.colspan}"` : '',
        cell.rowspan > 1 ? `rowspan="${cell.rowspan}"` : '',
        bg ? `bgcolor="${bg}"` : '',
        `align="${cell.align}"`, `valign="${cell.valign}"`,
        isHeader ? `scope="${t.headerCol && c === 0 && !(t.headerRow && r === 0) ? 'row' : 'col'}"` : '',
      ].filter(Boolean).join(' ');
      cells.push(`<${isHeader ? 'th' : 'td'} ${attrs} style="${style}">${escapeHtml(cell.text)}</${isHeader ? 'th' : 'td'}>`);
    }
    rows.push(`<tr>${cells.join('')}</tr>`);
  }
  const table = `<table border="0" cellspacing="0" cellpadding="0" ${w.attr ? `width="${w.attr}" ` : ''}${SETTINGS_ATTR}="${encodeSettings(t)}" style="border-collapse:collapse;${w.style}">${rows.join('')}</table>`;
  const wrapAttr = s.layout.align === 'right' && !s.layout.wrap ? ' align="right"' : s.layout.align === 'center' && !s.layout.wrap ? ' align="center"' : '';
  const block = `<div${wrapAttr}>${table}</div>`;
  return `${block}<p style="margin:0">&nbsp;</p>`;
}

// Strip the editor settings attribute so recipients never see formulas/settings.
// Single shared function used at the export boundary (Copy / Open).
export function stripSettings(html) {
  return String(html ?? '').replace(new RegExp(`\\s${SETTINGS_ATTR}(?:="[^"]*"|='[^']*'|=[^\\s>]+)?`, 'g'), '');
}

export function sizeWarning(html) {
  return new TextEncoder().encode(String(html ?? '')).length > WARN_BYTES;
}
