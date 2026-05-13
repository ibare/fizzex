/**
 * E9 행렬·벡터 평가자 — 별도 표면
 *
 * 메인 evaluator 의 number 계약(`number | undefined`)을 보호하기 위해 별도 진입점으로 분리.
 *   evaluateMatrixSync(ast, bindings) → Matrix | number | undefined   (핫패스)
 *   evaluateMatrix    (ast, bindings) → MatrixResult                   (콜드패스)
 *
 * 지원:
 *   - 행렬 ± 행렬, 스칼라 · 행렬, 행렬 · 행렬, 전치 (M^T), 역행렬 (M^{-1}, LU), |M| 행렬식
 *   - 양의 정수 거듭제곱 (M^k)
 * 미지원:
 *   - 행렬과 스칼라의 덧/뺄셈, 행렬을 지수로 한 거듭제곱, 비정수/음의 거듭제곱(-1 제외)
 * 도메인:
 *   - 차원 불일치, 특이행렬, 비정사각 행렬식/역행렬 → domain
 * 발산:
 *   - 산술 도중 비유한값 발생 → divergent
 */
import type {
  MathNode,
  MatrixNode,
  ParenNode,
  RowNode,
  RootNode,
  PowerNode,
  AbsNode,
  OperatorNode,
  VariableNode,
} from '../types';
import { evaluate as evaluateScalar } from './evaluate';
import type { Bindings, EvalDetail, EvalStatus } from './types';

export interface Matrix {
  readonly rows: number;
  readonly cols: number;
  readonly data: ReadonlyArray<ReadonlyArray<number>>;
}

export type MatrixValue = Matrix | number;

export type MatrixResult =
  | { ok: true; value: MatrixValue }
  | { ok: false; status: EvalStatus; detail?: EvalDetail };

type MatrixOutcome =
  | { kind: 'value'; value: MatrixValue }
  | { kind: 'fail'; status: EvalStatus; detail?: EvalDetail };

const v = (val: MatrixValue): MatrixOutcome => ({ kind: 'value', value: val });
const f = (status: EvalStatus, detail?: EvalDetail): MatrixOutcome => ({ kind: 'fail', status, detail });

function isMatrix(x: MatrixValue): x is Matrix {
  return typeof x !== 'number';
}

function identity(n: number): Matrix {
  const data: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) row.push(i === j ? 1 : 0);
    data.push(row);
  }
  return { rows: n, cols: n, data };
}

function evalMatrixNode(node: MatrixNode, bindings: Bindings): MatrixOutcome {
  const rows = node.rows;
  if (rows.length === 0) return f('unsupported', { nodeType: 'matrix', reason: 'empty' });
  const cols = rows[0].length;
  if (cols === 0) return f('unsupported', { nodeType: 'matrix', reason: 'empty-row' });
  const data: number[][] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length !== cols) {
      return f('domain', { nodeType: 'matrix', reason: 'ragged-rows' });
    }
    const row: number[] = [];
    for (let j = 0; j < cols; j++) {
      const cell = rows[i][j];
      const r = evaluateScalar(cell, bindings);
      if (!r.ok) return f(r.status, r.detail);
      if (!Number.isFinite(r.value)) {
        return f('divergent', { nodeType: 'matrix', reason: 'non-finite-cell' });
      }
      row.push(r.value);
    }
    data.push(row);
  }
  return v({ rows: rows.length, cols, data });
}

function addMatrix(a: Matrix, b: Matrix): MatrixOutcome {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    return f('domain', { nodeType: 'matrix', reason: 'dim-mismatch-add' });
  }
  const data = a.data.map((row, i) => row.map((x, j) => x + b.data[i][j]));
  return v({ rows: a.rows, cols: a.cols, data });
}

function subMatrix(a: Matrix, b: Matrix): MatrixOutcome {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    return f('domain', { nodeType: 'matrix', reason: 'dim-mismatch-sub' });
  }
  const data = a.data.map((row, i) => row.map((x, j) => x - b.data[i][j]));
  return v({ rows: a.rows, cols: a.cols, data });
}

function scaleMatrix(a: Matrix, s: number): Matrix {
  const data = a.data.map((row) => row.map((x) => x * s));
  return { rows: a.rows, cols: a.cols, data };
}

function mulMatrix(a: Matrix, b: Matrix): MatrixOutcome {
  if (a.cols !== b.rows) {
    return f('domain', { nodeType: 'matrix', reason: 'dim-mismatch-mul' });
  }
  const data: number[][] = [];
  for (let i = 0; i < a.rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < b.cols; j++) {
      let s = 0;
      for (let k = 0; k < a.cols; k++) s += a.data[i][k] * b.data[k][j];
      if (!Number.isFinite(s)) return f('divergent', { nodeType: 'matrix', reason: 'non-finite-mul' });
      row.push(s);
    }
    data.push(row);
  }
  return v({ rows: a.rows, cols: b.cols, data });
}

function transposeMatrix(a: Matrix): Matrix {
  const data: number[][] = [];
  for (let i = 0; i < a.cols; i++) {
    const row: number[] = [];
    for (let j = 0; j < a.rows; j++) row.push(a.data[j][i]);
    data.push(row);
  }
  return { rows: a.cols, cols: a.rows, data };
}

interface LU {
  readonly L: ReadonlyArray<number[]>;
  readonly U: ReadonlyArray<number[]>;
  readonly P: ReadonlyArray<number>;
  readonly sign: number;
}

function luDecompose(a: Matrix): LU | null {
  const n = a.rows;
  if (a.cols !== n) return null;
  const U: number[][] = a.data.map((row) => row.slice());
  const L: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  const P: number[] = Array.from({ length: n }, (_, i) => i);
  let sign = 1;
  for (let k = 0; k < n; k++) {
    let pivot = k;
    let pivotVal = Math.abs(U[k][k]);
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(U[i][k]) > pivotVal) {
        pivot = i;
        pivotVal = Math.abs(U[i][k]);
      }
    }
    if (pivotVal < 1e-14) return null;
    if (pivot !== k) {
      const tmpU = U[k];
      U[k] = U[pivot];
      U[pivot] = tmpU;
      const tmpP = P[k];
      P[k] = P[pivot];
      P[pivot] = tmpP;
      for (let j = 0; j < k; j++) {
        const t = L[k][j];
        L[k][j] = L[pivot][j];
        L[pivot][j] = t;
      }
      sign *= -1;
    }
    for (let i = k + 1; i < n; i++) {
      const factor = U[i][k] / U[k][k];
      L[i][k] = factor;
      for (let j = k; j < n; j++) U[i][j] -= factor * U[k][j];
    }
  }
  return { L, U, P, sign };
}

function determinant(a: Matrix): MatrixOutcome {
  if (a.rows !== a.cols) return f('domain', { nodeType: 'matrix', reason: 'det-non-square' });
  const lu = luDecompose(a);
  if (!lu) return v(0);
  let d = lu.sign;
  for (let i = 0; i < a.rows; i++) d *= lu.U[i][i];
  if (!Number.isFinite(d)) return f('divergent', { nodeType: 'matrix', reason: 'non-finite-det' });
  return v(d);
}

function inverseMatrix(a: Matrix): MatrixOutcome {
  if (a.rows !== a.cols) return f('domain', { nodeType: 'matrix', reason: 'inv-non-square' });
  const n = a.rows;
  const lu = luDecompose(a);
  if (!lu) return f('domain', { nodeType: 'matrix', reason: 'singular' });
  const data: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    const b: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) if (lu.P[i] === j) b[i] = 1;
    const y: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let k = 0; k < i; k++) s -= lu.L[i][k] * y[k];
      y[i] = s;
    }
    const x: number[] = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i];
      for (let k = i + 1; k < n; k++) s -= lu.U[i][k] * x[k];
      x[i] = s / lu.U[i][i];
    }
    for (let i = 0; i < n; i++) data[i][j] = x[i];
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (!Number.isFinite(data[i][j])) {
        return f('divergent', { nodeType: 'matrix', reason: 'non-finite-inv' });
      }
    }
  }
  return v({ rows: n, cols: n, data });
}

function powerMatrix(a: Matrix, exp: number): MatrixOutcome {
  if (a.rows !== a.cols) return f('domain', { nodeType: 'matrix', reason: 'pow-non-square' });
  if (!Number.isInteger(exp) || exp < 0) {
    return f('unsupported', { nodeType: 'matrix', reason: 'pow-non-natural' });
  }
  let result: Matrix = identity(a.rows);
  if (exp === 0) return v(result);
  let base: Matrix = a;
  let e = exp;
  while (e > 0) {
    if (e & 1) {
      const r = mulMatrix(result, base);
      if (r.kind === 'fail') return r;
      result = r.value as Matrix;
    }
    e >>= 1;
    if (e > 0) {
      const r = mulMatrix(base, base);
      if (r.kind === 'fail') return r;
      base = r.value as Matrix;
    }
  }
  return v(result);
}

function isTransposeMarker(nodes: MathNode[]): boolean {
  let arr = nodes;
  if (arr.length === 1 && arr[0].type === 'row') arr = (arr[0] as RowNode).children;
  if (arr.length === 1 && arr[0].type === 'variable') {
    const n = (arr[0] as VariableNode).name;
    return n === 'T' || n === 't';
  }
  return false;
}

function evalPowerNode(node: PowerNode, bindings: Bindings): MatrixOutcome {
  const baseOut = dispatchSequence(node.base, bindings);
  if (baseOut.kind === 'fail') return baseOut;
  const base = baseOut.value;
  if (isMatrix(base) && isTransposeMarker(node.exponent)) {
    return v(transposeMatrix(base));
  }
  const expOut = dispatchSequence(node.exponent, bindings);
  if (expOut.kind === 'fail') return expOut;
  const exp = expOut.value;
  if (isMatrix(base)) {
    if (typeof exp !== 'number') {
      return f('unsupported', { nodeType: 'power', reason: 'matrix-exp-of-matrix' });
    }
    if (exp === -1) return inverseMatrix(base);
    return powerMatrix(base, exp);
  }
  if (typeof exp !== 'number') {
    return f('unsupported', { nodeType: 'power', reason: 'matrix-exp-of-scalar' });
  }
  const r = Math.pow(base, exp);
  if (!Number.isFinite(r)) return f('divergent', { nodeType: 'power', reason: 'non-finite' });
  return v(r);
}

function evalAbsNode(node: AbsNode, bindings: Bindings): MatrixOutcome {
  const inner = dispatchSequence(node.content, bindings);
  if (inner.kind === 'fail') return inner;
  const val = inner.value;
  if (isMatrix(val)) return determinant(val);
  return v(Math.abs(val));
}

function applyBinop(op: '+' | '-' | '·', a: MatrixValue, b: MatrixValue): MatrixOutcome {
  const aIsM = isMatrix(a);
  const bIsM = isMatrix(b);
  if (op === '+') {
    if (aIsM && bIsM) return addMatrix(a, b);
    if (!aIsM && !bIsM) {
      const r = a + b;
      if (!Number.isFinite(r)) return f('divergent', { reason: 'non-finite-add' });
      return v(r);
    }
    return f('unsupported', { reason: 'add-scalar-matrix' });
  }
  if (op === '-') {
    if (aIsM && bIsM) return subMatrix(a, b);
    if (!aIsM && !bIsM) {
      const r = a - b;
      if (!Number.isFinite(r)) return f('divergent', { reason: 'non-finite-sub' });
      return v(r);
    }
    return f('unsupported', { reason: 'sub-scalar-matrix' });
  }
  if (aIsM && bIsM) return mulMatrix(a, b);
  if (aIsM && !bIsM) return v(scaleMatrix(a, b));
  if (!aIsM && bIsM) return v(scaleMatrix(b, a));
  const r = (a as number) * (b as number);
  if (!Number.isFinite(r)) return f('divergent', { reason: 'non-finite-mul' });
  return v(r);
}

type SeqTok =
  | { kind: 'op'; op: '+' | '-' | '·'; prec: number }
  | { kind: 'oper'; node: MathNode }
  | { kind: 'unary' };

function dispatchSequence(children: MathNode[], bindings: Bindings): MatrixOutcome {
  if (children.length === 0) return f('unsupported', { nodeType: 'row', reason: 'empty' });
  if (children.length === 1) return dispatchMatrix(children[0], bindings);
  const toks: SeqTok[] = [];
  let expectOperand = true;
  for (const c of children) {
    if (c.type === 'operator') {
      const op = (c as OperatorNode).operator;
      if (op === '-' && expectOperand) {
        toks.push({ kind: 'unary' });
        continue;
      }
      if (op === '+' || op === '-') {
        toks.push({ kind: 'op', op, prec: 1 });
        expectOperand = true;
        continue;
      }
      if (op === '×' || op === '·' || op === '*') {
        toks.push({ kind: 'op', op: '·', prec: 2 });
        expectOperand = true;
        continue;
      }
      return f('unsupported', { nodeType: 'operator', reason: op });
    }
    if (!expectOperand) {
      toks.push({ kind: 'op', op: '·', prec: 2 });
    }
    toks.push({ kind: 'oper', node: c });
    expectOperand = false;
  }
  const out: SeqTok[] = [];
  const opStack: SeqTok[] = [];
  for (const t of toks) {
    if (t.kind === 'oper') {
      out.push(t);
      continue;
    }
    if (t.kind === 'unary') {
      opStack.push(t);
      continue;
    }
    while (opStack.length > 0) {
      const top = opStack[opStack.length - 1];
      if (top.kind === 'unary') {
        out.push(opStack.pop() as SeqTok);
        continue;
      }
      if (top.kind === 'op' && top.prec >= t.prec) {
        out.push(opStack.pop() as SeqTok);
        continue;
      }
      break;
    }
    opStack.push(t);
  }
  while (opStack.length > 0) out.push(opStack.pop() as SeqTok);
  const stack: MatrixValue[] = [];
  for (const t of out) {
    if (t.kind === 'oper') {
      const r = dispatchMatrix(t.node, bindings);
      if (r.kind === 'fail') return r;
      stack.push(r.value);
      continue;
    }
    if (t.kind === 'unary') {
      const x = stack.pop();
      if (x === undefined) return f('unsupported', { nodeType: 'row', reason: 'bad-unary' });
      stack.push(isMatrix(x) ? scaleMatrix(x, -1) : -x);
      continue;
    }
    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) {
      return f('unsupported', { nodeType: 'row', reason: 'bad-binop' });
    }
    const r = applyBinop(t.op, left, right);
    if (r.kind === 'fail') return r;
    stack.push(r.value);
  }
  if (stack.length !== 1) return f('unsupported', { nodeType: 'row', reason: 'stack-non-singleton' });
  return v(stack[0]);
}

function dispatchMatrix(node: MathNode, bindings: Bindings): MatrixOutcome {
  switch (node.type) {
    case 'matrix':
      return evalMatrixNode(node as MatrixNode, bindings);
    case 'paren':
      return dispatchSequence((node as ParenNode).content, bindings);
    case 'root':
    case 'row':
      return dispatchSequence((node as RootNode | RowNode).children, bindings);
    case 'power':
      return evalPowerNode(node as PowerNode, bindings);
    case 'abs':
      return evalAbsNode(node as AbsNode, bindings);
    default: {
      const r = evaluateScalar(node, bindings);
      if (!r.ok) return f(r.status, r.detail);
      return v(r.value);
    }
  }
}

const EMPTY_BINDINGS: Bindings = Object.freeze({});

export function evaluateMatrixSync(
  node: MathNode,
  bindings: Bindings = EMPTY_BINDINGS,
): MatrixValue | undefined {
  try {
    const out = dispatchMatrix(node, bindings);
    if (out.kind !== 'value') return undefined;
    if (!isMatrix(out.value) && !Number.isFinite(out.value)) return undefined;
    return out.value;
  } catch {
    return undefined;
  }
}

export function evaluateMatrix(
  node: MathNode,
  bindings: Bindings = EMPTY_BINDINGS,
): MatrixResult {
  try {
    const out = dispatchMatrix(node, bindings);
    if (out.kind === 'value') {
      if (!isMatrix(out.value) && !Number.isFinite(out.value)) {
        return { ok: false, status: 'divergent', detail: { reason: 'non-finite-result' } };
      }
      return { ok: true, value: out.value };
    }
    return { ok: false, status: out.status, detail: out.detail };
  } catch {
    return { ok: false, status: 'divergent', detail: { reason: 'internal-error' } };
  }
}
