// Optional smart-fill logic (Phase 6). Pure and framework-free, unit-tested.
// Feature-flagged OFF by default; AI fill is intentionally not implemented
// because this backend does not provide it.
export const SMART_FILL_ENABLED = false;

// Arithmetic (constant difference) or geometric (constant ratio) series.
export function detectSeries(values) {
  const nums = (values || []).map(Number).filter(Number.isFinite);
  if (nums.length < 2) return null;
  const diffs = nums.slice(1).map((v, i) => v - nums[i]);
  if (diffs.every((d) => Math.abs(d - diffs[0]) < 1e-9)) return { type: 'arithmetic', step: diffs[0] };
  if (nums[0] !== 0) {
    const ratios = nums.slice(1).map((v, i) => v / nums[i]);
    if (ratios.every((r) => Math.abs(r - ratios[0]) < 1e-9)) return { type: 'geometric', ratio: ratios[0] };
  }
  return null;
}

// Predict the next `count` values from a known run.
export function smartFill(known, count) {
  const s = detectSeries(known);
  if (!s) return [];
  const out = [];
  let last = Number(known[known.length - 1]);
  for (let i = 0; i < count; i++) {
    last = s.type === 'arithmetic' ? last + s.step : last * s.ratio;
    out.push(Math.round(last * 1e6) / 1e6);
  }
  return out;
}

// Complete a prefix against a column's existing values (case-insensitive,
// de-duplicated, shortest-first so the most likely completion leads).
export function autocomplete(values, prefix) {
  const p = String(prefix ?? '').trim().toLowerCase();
  if (!p) return [];
  const seen = new Set();
  return (values || [])
    .filter((v) => { const l = String(v ?? '').toLowerCase(); return l.startsWith(p) && !seen.has(l) && seen.add(l); })
    .sort((a, b) => String(a).length - String(b).length);
}

// Lightweight, deterministic suggestions for the current table.
export function suggestImprovements(model) {
  const notes = [];
  if (!model) return notes;
  if (!model.headerRow) notes.push('Add a header row so column labels are clear in email.');
  if (model.cols > 8) notes.push('Tables wider than 8 columns are often clipped on mobile.');
  if (model.rows > 20) notes.push('Long tables may push the message past Gmail’s clip limit.');
  return notes;
}
