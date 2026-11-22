// Phase 2 locks for the table formula engine. Node 24 runner; no dependencies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, shiftReferences, ERR } from '../public/tableFormula.js';

const ev = (f, grid, rows, cols) => evaluate(f, grid, { maxRows: rows ?? grid.length, maxCols: cols ?? (grid[0]?.length || 0) });

test('arithmetic, precedence, parentheses and unary minus', () => {
  assert.equal(ev('=1+2*3', []), 7);
  assert.equal(ev('=(1+2)*3', []), 9);
  assert.equal(ev('=-4+2', []), -2);
  assert.equal(ev('=10/4', []), 2.5);
});

test('cell references resolve numbers, empty is zero, text errors', () => {
  assert.equal(ev('=A1*B1', [['5', '3']], 1, 2), 15);
  assert.equal(ev('=A1+1', [['']], 1, 1), 1);          // empty -> 0
  assert.equal(ev('=A1+1', [['x']], 1, 1), ERR.VALUE); // non-numeric -> #VALUE!
});

test('out-of-range reference is #REF!', () => {
  assert.equal(ev('=C5', [['1']], 1, 1), ERR.REF);
});

test('range functions', () => {
  const g = [['1'], ['2'], ['3']];
  assert.equal(ev('=SUM(A1:A3)', g, 3, 1), 6);
  assert.equal(ev('=AVERAGE(A1:A3)', g, 3, 1), 2);
  assert.equal(ev('=MIN(A1:A3)', g, 3, 1), 1);
  assert.equal(ev('=MAX(A1:A3)', g, 3, 1), 3);
  assert.equal(ev('=COUNT(A1:A3)', g, 3, 1), 3);
});

test('division by zero is #DIV/0!', () => {
  assert.equal(ev('=A1/A2', [['1'], ['0']], 2, 1), ERR.DIV0);
});

test('unknown function is #NAME?', () => {
  assert.equal(ev('=FOO(A1:A2)', [['1'], ['2']], 2, 1), ERR.NAME);
});

test('circular references are #CYCLE!', () => {
  assert.equal(ev('=A1', [['=A1']], 1, 1), ERR.CYCLE);
  assert.equal(ev('=A1', [['=A2'], ['=A1']], 2, 1), ERR.CYCLE);
});

test('a referenced formula cell is evaluated recursively', () => {
  const g = [['=A2*2'], ['5']];
  assert.equal(ev('=A1+1', g, 2, 1), 11);
});

test('shiftReferences on insert/delete/move of rows and columns', () => {
  assert.equal(shiftReferences('=A2', { type: 'insertRow', index: 1 }), '=A3');
  assert.equal(shiftReferences('=SUM(A1:A3)', { type: 'insertRow', index: 1 }), '=SUM(A1:A4)');
  assert.equal(shiftReferences('=A2', { type: 'deleteRow', index: 1 }), '=' + ERR.REF);
  assert.equal(shiftReferences('=A3', { type: 'deleteRow', index: 1 }), '=A2');
  assert.equal(shiftReferences('=B1', { type: 'insertCol', index: 0 }), '=C1');
  assert.equal(shiftReferences('=A1', { type: 'moveRow', from: 0, to: 2 }), '=A3');
  assert.equal(shiftReferences('=A3', { type: 'moveRow', from: 0, to: 2 }), '=A2');
});
