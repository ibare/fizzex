/**
 * 내장 함수·상수 (설계 §3.3).
 *
 * Expression에서 네임스페이스 없이 호출 가능한 함수.
 * 평가기는 `ctx.lookup(name)`이 실패할 때 여기서 해소.
 */

const { PI, E } = Math;

export const CONSTANTS: Readonly<Record<string, number>> = Object.freeze({
  pi: PI,
  PI,
  e: E,
  E,
  Infinity,
  NaN,
});

type Fn = (...args: unknown[]) => unknown;

function num(v: unknown, label: string): number {
  if (typeof v === 'number') return v;
  throw new Error(`${label}: number expected, got ${typeof v}`);
}

function str(v: unknown, label: string): string {
  if (typeof v === 'string') return v;
  throw new Error(`${label}: string expected, got ${typeof v}`);
}

function vec2(x: unknown, y: unknown): { x: number; y: number } {
  return { x: num(x, 'vec2.x'), y: num(y, 'vec2.y') };
}

function isVec(v: unknown): v is { x: number; y: number } {
  return !!v && typeof v === 'object' && 'x' in v && 'y' in v;
}

function clamp(x: unknown, lo: unknown, hi: unknown): number {
  const xv = num(x, 'clamp.x'), lov = num(lo, 'clamp.lo'), hiv = num(hi, 'clamp.hi');
  return Math.min(Math.max(xv, lov), hiv);
}

function lerp(a: unknown, b: unknown, t: unknown): number {
  return num(a, 'lerp.a') + (num(b, 'lerp.b') - num(a, 'lerp.a')) * num(t, 'lerp.t');
}

function smoothstep(e0: unknown, e1: unknown, x: unknown): number {
  const e0n = num(e0, 'smoothstep.e0'), e1n = num(e1, 'smoothstep.e1'), xn = num(x, 'smoothstep.x');
  const t = Math.min(Math.max((xn - e0n) / (e1n - e0n), 0), 1);
  return t * t * (3 - 2 * t);
}

function mod(a: unknown, b: unknown): number {
  const an = num(a, 'mod.a'), bn = num(b, 'mod.b');
  return ((an % bn) + bn) % bn;
}

function sign(x: unknown): number {
  const n = num(x, 'sign');
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

function hypot(...args: unknown[]): number {
  return Math.hypot(...args.map((a, i) => num(a, `hypot[${i}]`)));
}

function length(v: unknown): number {
  if (isVec(v)) return Math.hypot(v.x, v.y);
  throw new Error('length: vec expected');
}

function dot(a: unknown, b: unknown): number {
  if (isVec(a) && isVec(b)) return a.x * b.x + a.y * b.y;
  throw new Error('dot: two vecs expected');
}

function normalize(v: unknown): { x: number; y: number } {
  if (!isVec(v)) throw new Error('normalize: vec expected');
  const l = Math.hypot(v.x, v.y);
  return l === 0 ? { x: 0, y: 0 } : { x: v.x / l, y: v.y / l };
}

function rotate(v: unknown, rad: unknown): { x: number; y: number } {
  if (!isVec(v)) throw new Error('rotate: vec expected');
  const r = num(rad, 'rotate.rad');
  const c = Math.cos(r), s = Math.sin(r);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function ifFn(cond: unknown, then: unknown, els: unknown): unknown {
  return cond ? then : els;
}

function switchFn(value: unknown, cases: unknown): unknown {
  if (!cases || typeof cases !== 'object') throw new Error('switch: object expected');
  const rec = cases as Record<string, unknown>;
  const key = String(value);
  if (key in rec) return rec[key];
  if ('_default' in rec) return rec._default;
  return undefined;
}

// Rust 스타일 포맷: `{:.2f}` · `{:d}` · `{}` · 위치 인자 미지원(고정 순서).
function format(template: unknown, ...args: unknown[]): string {
  const t = str(template, 'format.template');
  let i = 0;
  return t.replace(/\{([^}]*)\}/g, (_, spec: string) => {
    const v = args[i++];
    if (!spec) return String(v);
    const m = /^:\.(\d+)f$/.exec(spec);
    if (m) return num(v, 'format.arg').toFixed(Number(m[1]));
    const md = /^:d$/.exec(spec);
    if (md) return String(Math.trunc(num(v, 'format.arg')));
    return String(v);
  });
}

function formatN(v: unknown, digits: unknown = 2): string {
  const n = num(v, 'formatN.v');
  const d = num(digits, 'formatN.digits');
  if (!Number.isFinite(n)) return '–';
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  return n.toFixed(d);
}

function toLocaleInt(v: unknown): string {
  return Math.trunc(num(v, 'toLocaleInt')).toLocaleString('en-US');
}

// 색상 조작 — `#RRGGBB` + alpha → rgba(...).
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) {
    const m3 = /^#([0-9a-f]{3})$/i.exec(hex);
    if (m3) {
      const [r, g, b] = m3[1].split('').map((c) => parseInt(c + c, 16));
      return [r, g, b];
    }
    throw new Error(`hexToRgb: invalid hex "${hex}"`);
  }
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function hexAlpha(hex: unknown, alpha: unknown): string {
  const [r, g, b] = hexToRgb(str(hex, 'hexAlpha.hex'));
  return `rgba(${r},${g},${b},${num(alpha, 'hexAlpha.alpha')})`;
}

function rgba(r: unknown, g: unknown, b: unknown, a: unknown): string {
  return `rgba(${num(r, 'rgba.r')},${num(g, 'rgba.g')},${num(b, 'rgba.b')},${num(a, 'rgba.a')})`;
}

function mixColor(a: unknown, b: unknown, t: unknown): string {
  const [ar, ag, ab] = hexToRgb(str(a, 'mixColor.a'));
  const [br, bg, bb] = hexToRgb(str(b, 'mixColor.b'));
  const tn = num(t, 'mixColor.t');
  const lerp255 = (x: number, y: number) => Math.round(x + (y - x) * tn);
  const hx = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hx(lerp255(ar, br))}${hx(lerp255(ag, bg))}${hx(lerp255(ab, bb))}`;
}

export const BUILTINS: Readonly<Record<string, Fn>> = Object.freeze({
  // 수치
  sin: Math.sin as Fn,
  cos: Math.cos as Fn,
  tan: Math.tan as Fn,
  asin: Math.asin as Fn,
  acos: Math.acos as Fn,
  atan: Math.atan as Fn,
  atan2: Math.atan2 as Fn,
  sinh: Math.sinh as Fn,
  cosh: Math.cosh as Fn,
  tanh: Math.tanh as Fn,
  exp: Math.exp as Fn,
  log: Math.log as Fn,
  log2: Math.log2 as Fn,
  log10: Math.log10 as Fn,
  pow: Math.pow as Fn,
  sqrt: Math.sqrt as Fn,
  cbrt: Math.cbrt as Fn,
  hypot: hypot as Fn,
  abs: Math.abs as Fn,
  min: Math.min as Fn,
  max: Math.max as Fn,
  clamp: clamp as Fn,
  lerp: lerp as Fn,
  smoothstep: smoothstep as Fn,
  floor: Math.floor as Fn,
  ceil: Math.ceil as Fn,
  round: Math.round as Fn,
  mod: mod as Fn,
  sign: sign as Fn,
  isFinite: Number.isFinite as Fn,
  isNaN: Number.isNaN as Fn,

  // 벡터
  vec2: vec2 as Fn,
  length: length as Fn,
  dot: dot as Fn,
  normalize: normalize as Fn,
  rotate: rotate as Fn,

  // 조건
  if: ifFn as Fn,
  switch: switchFn as Fn,

  // 문자열
  format: format as Fn,
  formatN: formatN as Fn,
  toLocaleInt: toLocaleInt as Fn,

  // 색상
  hexAlpha: hexAlpha as Fn,
  rgba: rgba as Fn,
  mixColor: mixColor as Fn,
});
