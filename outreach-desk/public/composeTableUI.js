// Compose-table editor UI (Phase 3). Pure builders + reducer are framework-free
// and unit-tested; mountTableEditor wires the live dialog (browser only).
import {
  createTable, buildHtml, setCell, addRow, removeRow, addCol, removeCol,
  moveRow, moveCol, mergeCells, splitCell, applyPreset,
  MAX_ROWS, MAX_COLS, PRESETS, SAFE_FONTS, ALIGNMENTS, VALIGNMENTS, escapeHtml,
} from './composeTable.js';

const e = escapeHtml;
const colName = (i) => { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const opt = (list, value) => list.map((x) => `<option value="${e(x)}"${x === value ? ' selected' : ''}>${e(x)}</option>`).join('');
const pxOpt = (list, value) => list.map((x) => `<option value="${e(x[0])}"${x[0] === value ? ' selected' : ''}>${e(x[1])}</option>`).join('');

// ---------- pure reducer (drives the model from a toolbar/cell action) ----------
export function applyAction(t, a = {}) {
  switch (a.type) {
    case 'preset': t.settings = applyPreset(a.value); break;
    case 'headerRow': t.headerRow = !t.headerRow; break;
    case 'headerCol': t.headerCol = !t.headerCol; break;
    case 'totalsRow': t.totalsRow = !t.totalsRow; break;
    case 'addRow': addRow(t, a.at); break;
    case 'removeRow': removeRow(t, a.at); break;
    case 'addCol': addCol(t, a.at); break;
    case 'removeCol': removeCol(t, a.at); break;
    case 'moveRow': moveRow(t, a.from, a.to); break;
    case 'moveCol': moveCol(t, a.from, a.to); break;
    case 'merge': mergeCells(t, a.r1, a.c1, a.r2, a.c2); break;
    case 'split': splitCell(t, a.r, a.c); break;
    case 'cell': setCell(t, a.r, a.c, a.props); break;
    case 'font': t.settings.font = { family: SAFE_FONTS.includes(a.value.family) ? a.value.family : t.settings.font.family, size: Math.min(20, Math.max(11, Number(a.value.size) || 14)) }; break;
    case 'layout': t.settings.layout = { ...t.settings.layout, ...a.value }; break;
    default: break;
  }
  return t;
}

// ---------- pure builders ----------

export function gridPickerHtml() {
  const rows = [];
  for (let r = 1; r <= 8; r++) {
    const cells = [];
    for (let c = 1; c <= 8; c++) cells.push(`<button type="button" class="ct-pick" data-action="table-create" data-rows="${r}" data-cols="${c}" aria-label="${r} by ${c} table"><span></span></button>`);
    rows.push(`<div class="ct-pick-row">${cells.join('')}</div>`);
  }
  return `<div class="ct-picker"><div class="ct-pick-grid">${rows.join('')}</div>` +
    `<div class="ct-pick-custom">Custom: <input type="number" class="ct-custom-rows" min="1" max="${MAX_ROWS}" value="3" aria-label="Rows"> × ` +
    `<input type="number" class="ct-custom-cols" min="1" max="${MAX_COLS}" value="3" aria-label="Columns"> ` +
    `<button type="button" class="btn" data-action="table-create-custom">Create</button></div></div>`;
}

export function toolbarHtml(t) {
  const s = t.settings;
  const toggle = (label, key, on) => `<label class="ct-tog"><input type="checkbox" data-action="table-toggle" data-key="${key}"${on ? ' checked' : ''}>${e(label)}</label>`;
  const fmt = (label, key) => `<button type="button" class="btn subtle" data-action="table-format" data-key="${key}">${e(label)}</button>`;
  return `<div class="ct-toolbar">` +
    `<label>Preset<select data-action="table-preset">${opt(PRESETS, s.preset)}</select></label>` +
    `<label>Font<select data-action="table-font-family">${opt(SAFE_FONTS, s.font.family)}</select></label>` +
    `<label>Size<select data-action="table-font-size">${opt([11, 12, 13, 14, 15, 16, 18, 20], s.font.size)}</select></label>` +
    toggle('Header row', 'headerRow', t.headerRow) + toggle('Header column', 'headerCol', t.headerCol) + toggle('Totals row', 'totalsRow', t.totalsRow) +
    `<label>Align<select data-action="table-align">${pxOpt([['left', 'Left'], ['center', 'Center'], ['right', 'Right']], 'left')}</select></label>` +
    `<label>Width<select data-action="table-layout-width">${pxOpt([['full', 'Full'], ['fit', 'Fit content'], ['percent', 'Percent'], ['px', 'Fixed px']], s.layout.width)}</select></label>` +
    `<div class="ct-group">${fmt('Bold', 'bold')}${fmt('Italic', 'italic')}</div>` +
    `<div class="ct-group"><button type="button" class="btn subtle" data-action="table-merge">Merge</button><button type="button" class="btn subtle" data-action="table-split">Split</button></div>` +
    `<div class="ct-group"><button type="button" class="btn subtle" data-action="table-add" data-what="row">+ Row</button><button type="button" class="btn subtle" data-action="table-remove" data-what="row">− Row</button>` +
    `<button type="button" class="btn subtle" data-action="table-add" data-what="col">+ Col</button><button type="button" class="btn subtle" data-action="table-remove" data-what="col">− Col</button></div>` +
    `<div class="ct-group"><button type="button" class="btn subtle" data-action="table-move" data-what="row-up">↑ Row</button><button type="button" class="btn subtle" data-action="table-move" data-what="row-down">↓ Row</button>` +
    `<button type="button" class="btn subtle" data-action="table-move" data-what="col-left">← Col</button><button type="button" class="btn subtle" data-action="table-move" data-what="col-right">→ Col</button></div>` +
    `<button type="button" class="btn primary" data-action="table-commit">Insert table</button>` +
    `</div>`;
}

export function editorGridHtml(t) {
  const head = `<tr><th class="ct-corner"></th>${Array.from({ length: t.cols }, (_, c) => `<th class="ct-colhead">${e(colName(c))}</th>`).join('')}</tr>`;
  const body = [];
  for (let r = 0; r < t.rows; r++) {
    const cells = [];
    for (let c = 0; c < t.cols; c++) {
      const cell = t.cells[r][c];
      if (cell.covered) { cells.push(`<td class="ct-covered" data-r="${r}" data-c="${c}"></td>`); continue; }
      const isHead = (t.headerRow && r === 0) || (t.headerCol && c === 0);
      const span = [cell.colspan > 1 ? `colspan="${cell.colspan}"` : '', cell.rowspan > 1 ? `rowspan="${cell.rowspan}"` : ''].filter(Boolean).join(' ');
      cells.push(`<td class="${isHead ? 'ct-head ' : ''}ct-cell" data-r="${r}" data-c="${c}" contenteditable="true" ${span}>${e(cell.text)}</td>`);
    }
    body.push(`<tr><th class="ct-rowhead">${r + 1}</th>${cells.join('')}</tr>`);
  }
  return `<table class="ct-grid"><tbody>${head}${body.join('')}</tbody></table>`;
}

export function dialogHtml(t) {
  return `<div class="ct-editor">${toolbarHtml(t)}${editorGridHtml(t)}<p class="small muted">Up to ${MAX_ROWS} rows and ${MAX_COLS} columns. Output is email-safe HTML.</p></div>`;
}

// ---------- live dialog wiring (browser only; not unit-tested) ----------

export function mountTableEditor(host, { model = createTable(3, 3), onInsert } = {}) {
  const state = { model, sel: { r1: 0, c1: 0, r2: 0, c2: 0 } };
  const paint = () => { host.innerHTML = dialogHtml(state.model); };
  paint();
  const sel = () => state.sel;

  host.addEventListener('input', (ev) => {
    const td = ev.target.closest('.ct-cell');
    if (td) setCell(state.model, Number(td.dataset.r), Number(td.dataset.c), { text: td.textContent });
  });
  host.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-action]');
    const td = ev.target.closest('.ct-cell,.ct-head');
    if (td && !b) { const r = Number(td.dataset.r), c = Number(td.dataset.c); state.sel = { r1: r, c1: c, r2: r, c2: c }; return; }
    if (!b) return;
    const a = b.dataset, s = sel();
    switch (a.action) {
      case 'table-toggle': applyAction(state.model, { type: a.key }); paint(); break;
      case 'table-format': applyAction(state.model, { type: 'cell', r: s.r1, c: s.c1, props: { [a.key]: !state.model.cells[s.r1][s.c1][a.key] } }); paint(); break;
      case 'table-merge': applyAction(state.model, { type: 'merge', ...s }); paint(); break;
      case 'table-split': applyAction(state.model, { type: 'split', r: s.r1, c: s.c1 }); paint(); break;
      case 'table-add': applyAction(state.model, { type: a.what === 'row' ? 'addRow' : 'addCol', at: a.what === 'row' ? state.model.rows : state.model.cols }); paint(); break;
      case 'table-remove': applyAction(state.model, { type: a.what === 'row' ? 'removeRow' : 'removeCol', at: a.what === 'row' ? s.r1 : s.c1 }); paint(); break;
      case 'table-move': {
        const m = { 'row-up': ['moveRow', s.r1, s.r1 - 1], 'row-down': ['moveRow', s.r1, s.r1 + 1], 'col-left': ['moveCol', s.c1, s.c1 - 1], 'col-right': ['moveCol', s.c1, s.c1 + 1] }[a.what];
        if (m) applyAction(state.model, { type: m[0], from: m[1], to: m[2] });
        paint(); break;
      }
      case 'table-commit': if (onInsert) onInsert(buildHtml(state.model)); break;
      default: break;
    }
  });
  host.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-action]'); if (!el) return;
    const a = el.dataset;
    if (a.action === 'table-preset') applyAction(state.model, { type: 'preset', value: el.value });
    else if (a.action === 'table-font-family') applyAction(state.model, { type: 'font', value: { family: el.value, size: state.model.settings.font.size } });
    else if (a.action === 'table-font-size') applyAction(state.model, { type: 'font', value: { family: state.model.settings.font.family, size: Number(el.value) } });
    else if (a.action === 'table-layout-width') applyAction(state.model, { type: 'layout', value: { width: el.value } });
    else if (a.action === 'table-align') { const s = sel(); applyAction(state.model, { type: 'cell', r: s.r1, c: s.c1, props: { align: el.value } }); }
    paint();
  });
  return { get model() { return state.model; }, paint };
}
