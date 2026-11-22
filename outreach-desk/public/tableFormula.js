// Framework-free table formula engine (Phase 2).
// Supports = formulas with A1 references, ranges, SUM/AVERAGE/MIN/MAX/COUNT,
// + - * / parentheses, and the error set #REF! #VALUE! #DIV/0! #CYCLE! #NAME?.
// Also shifts references when rows/columns are inserted, deleted or moved.

export const ERR = { REF: '#REF!', VALUE: '#VALUE!', DIV0: '#DIV/0!', CYCLE: '#CYCLE!', NAME: '#NAME?' };
const FUNCS = ['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT'];

const colToIndex = (s) => { let n = 0; for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
const indexToCol = (i) => { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const REF_RE = /^\$?([A-Za-z]+)\$?([0-9]+)$/;
const parseRef = (t) => { const m = REF_RE.exec(String(t)); return m ? { c: colToIndex(m[1]), r: parseInt(m[2], 10) - 1 } : null; };
const isErr = (v) => typeof v === 'string' && Object.values(ERR).includes(v);

class Fail { constructor(error) { this.error = error; } }

function toNumber(raw, grid, opts, stack) {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  const s = String(raw).trim();
  if (s.startsWith('=')) return evaluate(s, grid, opts, stack);
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Fail(ERR.VALUE);
  return n;
}

function resolve(r, c, grid, opts, stack) {
  const maxRows = opts.maxRows ?? (grid.length || 0);
  const maxCols = opts.maxCols ?? (grid[0]?.length || 0);
  if (r < 0 || c < 0 || r >= maxRows || c >= maxCols) throw new Fail(ERR.REF);
  const key = r + ':' + c;
  if (stack.has(key)) throw new Fail(ERR.CYCLE);
  const raw = grid[r]?.[c];
  if (raw != null && String(raw).trim().startsWith('=')) {
    stack.add(key);
    try { return evaluate(String(raw), grid, opts, stack); } finally { stack.delete(key); }
  }
  return toNumber(raw, grid, opts, stack);
}

function tokenize(src) {
  const t = []; let i = 0;
  const readRef = () => { let j = i; if (src[j] === '$') j++; const s1 = j; while (j < src.length && /[A-Za-z]/.test(src[j])) j++; if (j === s1) return null; if (src[j] === '$') j++; const s2 = j; while (j < src.length && /[0-9]/.test(src[j])) j++; if (j === s2) return null; const v = src.slice(i, j); i = j; return v; };
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) { let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++; const n = Number(src.slice(i, j)); if (!Number.isFinite(n)) throw new Fail(ERR.VALUE); t.push({ type: 'num', value: n }); i = j; continue; }
    if (/[A-Za-z]/.test(c) || c === '$') {
      const save = i; const ref = readRef();
      if (ref) {
        if (src[i] === ':') { i++; const ref2 = readRef(); if (!ref2) throw new Fail(ERR.NAME); t.push({ type: 'range', a: ref, b: ref2 }); }
        else t.push({ type: 'ref', value: ref });
        continue;
      }
      let j = save; if (src[j] === '$') j++; const s1 = j; while (j < src.length && /[A-Za-z]/.test(src[j])) j++;
      const name = src.slice(save, j).replace('$', '').toUpperCase();
      if (src[j] === '(') { if (!FUNCS.includes(name)) throw new Fail(ERR.NAME); t.push({ type: 'func', value: name }); i = j; continue; }
      throw new Fail(ERR.NAME);
    }
    if (c === '(') { t.push({ type: 'lparen' }); i++; continue; }
    if (c === ')') { t.push({ type: 'rparen' }); i++; continue; }
    if (c === ',') { t.push({ type: 'comma' }); i++; continue; }
    if ('+-*/'.includes(c)) { t.push({ type: 'op', value: c }); i++; continue; }
    throw new Fail(ERR.VALUE);
  }
  return t;
}

class Parser {
  constructor(tokens, grid, opts, stack) { this.t = tokens; this.i = 0; this.grid = grid; this.opts = opts; this.stack = stack; }
  peek() { return this.t[this.i]; }
  eat(type) { const x = this.t[this.i]; if (!x || x.type !== type) throw new Fail(ERR.VALUE); this.i++; return x; }
  isOp(v) { const x = this.peek(); return x && x.type === 'op' && x.value === v; }
  parseExpr() { let v = this.parseTerm(); while (this.isOp('+') || this.isOp('-')) { const o = this.t[this.i++].value; v = this.arith(v, this.parseTerm(), o); } return v; }
  parseTerm() { let v = this.parseFactor(); while (this.isOp('*') || this.isOp('/')) { const o = this.t[this.i++].value; v = this.arith(v, this.parseFactor(), o); } return v; }
  parseFactor() { if (this.isOp('-')) { this.i++; return -this.parseFactor(); } if (this.isOp('+')) { this.i++; return this.parseFactor(); } return this.parsePrimary(); }
  parsePrimary() {
    const x = this.peek(); if (!x) throw new Fail(ERR.VALUE);
    if (x.type === 'num') { this.i++; return x.value; }
    if (x.type === 'ref') { this.i++; const r = parseRef(x.value); if (!r) throw new Fail(ERR.NAME); return resolve(r.r, r.c, this.grid, this.opts, this.stack); }
    if (x.type === 'func') { this.i++; const name = x.value; this.eat('lparen'); const nums = []; while (!(this.peek() && this.peek().type === 'rparen')) { nums.push(...this.parseArg()); if (this.peek() && this.peek().type === 'comma') this.i++; } this.eat('rparen'); return this.applyFn(name, nums); }
    if (x.type === 'lparen') { this.i++; const v = this.parseExpr(); this.eat('rparen'); return v; }
    throw new Fail(ERR.VALUE);
  }
  parseArg() {
    if (this.peek() && this.peek().type === 'range') { const { a, b } = this.t[this.i++]; const p = parseRef(a), q = parseRef(b); if (!p || !q) throw new Fail(ERR.NAME); const out = []; for (let r = Math.min(p.r, q.r); r <= Math.max(p.r, q.r); r++) for (let c = Math.min(p.c, q.c); c <= Math.max(p.c, q.c); c++) out.push(resolve(r, c, this.grid, this.opts, this.stack)); return out; }
    return [this.parseExpr()];
  }
  applyFn(name, nums) {
    if (name === 'COUNT') return nums.length;
    if (!nums.length) throw new Fail(ERR.DIV0);
    const sum = nums.reduce((a, b) => a + b, 0);
    if (name === 'SUM') return sum;
    if (name === 'AVERAGE') return sum / nums.length;
    if (name === 'MIN') return Math.min(...nums);
    if (name === 'MAX') return Math.max(...nums);
    throw new Fail(ERR.NAME);
  }
  arith(a, b, op) {
    if (op === '/' && b === 0) throw new Fail(ERR.DIV0);
    const x = Number(a), y = Number(b);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Fail(ERR.VALUE);
    return op === '+' ? x + y : op === '-' ? x - y : op === '*' ? x * y : x / y;
  }
}

export function evaluate(formula, grid, opts = {}, stack = new Set()) {
  try {
    const f = String(formula ?? '').trim();
    if (!f.startsWith('=')) return toNumber(f, grid, opts, stack);
    const p = new Parser(tokenize(f.slice(1)), grid, opts, stack);
    const v = p.parseExpr();
    if (p.i < p.t.length) throw new Fail(ERR.VALUE); // trailing tokens -> malformed
    return v;
  } catch (e) { return e instanceof Fail ? e.error : ERR.VALUE; }
}

// ---------- reference shifting ----------

const isRowOp = (op) => /Row$/.test(op.type);
function mapIndex(idx, op) {
  if (op.type === 'insertRow' || op.type === 'insertCol') return idx >= op.index ? idx + 1 : idx;
  if (op.type === 'deleteRow' || op.type === 'deleteCol') return idx === op.index ? null : (idx > op.index ? idx - 1 : idx);
  if (op.type === 'moveRow' || op.type === 'moveCol') {
    const { from, to } = op;
    if (idx === from) return to;
    if (from < to && idx > from && idx <= to) return idx - 1;
    if (from > to && idx >= to && idx < from) return idx + 1;
    return idx;
  }
  return idx;
}

const SHIFT_TOKEN = /\$?[A-Za-z]+\$?[0-9]+(?::\$?[A-Za-z]+\$?[0-9]+)?/g;

export function shiftReferences(formula, op) {
  return String(formula ?? '').replace(SHIFT_TOKEN, (token) => {
    const parts = token.split(':');
    const out = parts.map((p) => {
      const ref = parseRef(p); if (!ref) return p;
      const idx = isRowOp(op) ? ref.r : ref.c;
      const moved = mapIndex(idx, op);
      if (moved === null) return ERR.REF;
      return isRowOp(op) ? indexToCol(ref.c) + (moved + 1) : indexToCol(moved) + (ref.r + 1);
    });
    return out.join(':');
  });
}
