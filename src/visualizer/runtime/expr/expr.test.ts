import { describe, it, expect } from 'vitest';
import { parseExpr, evalNode, evalNumber, rootContext, ExprEvalError, ExprParseError } from './index';

function evalStr(source: string, locals: Record<string, unknown> = {}): unknown {
  return evalNode(parseExpr(source), rootContext(locals));
}

describe('literals & identifiers', () => {
  it('numbers', () => expect(evalStr('1.5')).toBe(1.5));
  it('negative', () => expect(evalStr('-3')).toBe(-3));
  it('scientific', () => expect(evalStr('6.5e-11')).toBeCloseTo(6.5e-11));
  it('bool true', () => expect(evalStr('true')).toBe(true));
  it('bool false', () => expect(evalStr('false')).toBe(false));
  it('null', () => expect(evalStr('null')).toBe(null));
  it('string single', () => expect(evalStr("'hi'")).toBe('hi'));
  it('string double', () => expect(evalStr('"hi"')).toBe('hi'));
  it('identifier from locals', () => expect(evalStr('a', { a: 42 })).toBe(42));
  it('PI constant', () => expect(evalNumber(parseExpr('pi'), rootContext({}))).toBeCloseTo(Math.PI));
  it('e constant', () => expect(evalNumber(parseExpr('e'), rootContext({}))).toBeCloseTo(Math.E));
});

describe('arithmetic', () => {
  it('add', () => expect(evalStr('2 + 3')).toBe(5));
  it('sub', () => expect(evalStr('10 - 4')).toBe(6));
  it('mul', () => expect(evalStr('6 * 7')).toBe(42));
  it('div', () => expect(evalStr('20 / 4')).toBe(5));
  it('mod', () => expect(evalStr('10 % 3')).toBe(1));
  it('pow', () => expect(evalStr('2 ** 10')).toBe(1024));
  it('unary minus', () => expect(evalStr('-(3 + 2)')).toBe(-5));
  it('precedence', () => expect(evalStr('2 + 3 * 4')).toBe(14));
  it('parens', () => expect(evalStr('(2 + 3) * 4')).toBe(20));
});

describe('comparison & logic', () => {
  it('eq', () => expect(evalStr('1 == 1')).toBe(true));
  it('neq', () => expect(evalStr('1 != 2')).toBe(true));
  it('lt', () => expect(evalStr('1 < 2')).toBe(true));
  it('ge', () => expect(evalStr('5 >= 5')).toBe(true));
  it('and short-circuit', () => expect(evalStr('false && (1/0)')).toBe(false));
  it('or short-circuit', () => expect(evalStr('true || (1/0)')).toBe(true));
  it('not', () => expect(evalStr('!true')).toBe(false));
  it('ternary', () => expect(evalStr('1 > 0 ? "yes" : "no"')).toBe('yes'));
});

describe('builtins — numeric', () => {
  it('sin(0)', () => expect(evalStr('sin(0)')).toBeCloseTo(0));
  it('sin(pi/2)', () => expect(evalStr('sin(pi/2)')).toBeCloseTo(1));
  it('cos(pi)', () => expect(evalStr('cos(pi)')).toBeCloseTo(-1));
  it('sqrt', () => expect(evalStr('sqrt(16)')).toBe(4));
  it('clamp lo', () => expect(evalStr('clamp(-5, 0, 10)')).toBe(0));
  it('clamp hi', () => expect(evalStr('clamp(20, 0, 10)')).toBe(10));
  it('clamp mid', () => expect(evalStr('clamp(5, 0, 10)')).toBe(5));
  it('lerp', () => expect(evalStr('lerp(0, 10, 0.3)')).toBeCloseTo(3));
  it('smoothstep', () => expect(evalStr('smoothstep(0, 1, 0.5)')).toBeCloseTo(0.5));
  it('mod positive', () => expect(evalStr('mod(7, 3)')).toBe(1));
  it('mod negative', () => expect(evalStr('mod(-1, 3)')).toBe(2));
  it('abs', () => expect(evalStr('abs(-7)')).toBe(7));
  it('min', () => expect(evalStr('min(3, 1, 2)')).toBe(1));
  it('max', () => expect(evalStr('max(3, 1, 2)')).toBe(3));
  it('floor', () => expect(evalStr('floor(3.7)')).toBe(3));
  it('sign neg', () => expect(evalStr('sign(-5)')).toBe(-1));
  it('sign zero', () => expect(evalStr('sign(0)')).toBe(0));
  it('hypot', () => expect(evalStr('hypot(3, 4)')).toBe(5));
});

describe('builtins — vec', () => {
  it('vec2.x', () => expect(evalStr('vec2(3, 4).x')).toBe(3));
  it('vec2.y', () => expect(evalStr('vec2(3, 4).y')).toBe(4));
  it('length', () => expect(evalStr('length(vec2(3, 4))')).toBe(5));
  it('dot', () => expect(evalStr('dot(vec2(1, 2), vec2(3, 4))')).toBe(11));
});

describe('builtins — conditional', () => {
  it('if true', () => expect(evalStr('if(1 > 0, "yes", "no")')).toBe('yes'));
  it('if false', () => expect(evalStr('if(1 < 0, "yes", "no")')).toBe('no'));
  it('switch hit', () => expect(evalStr('switch(a, {x: 1, y: 2, _default: 0})', { a: 'y' })).toBe(2));
  it('switch default', () => expect(evalStr('switch(a, {x: 1, _default: 99})', { a: 'z' })).toBe(99));
});

describe('builtins — string & color', () => {
  it('format d', () => expect(evalStr('format("x={:d}", 3.7)')).toBe('x=3'));
  it('format f', () => expect(evalStr('format("y={:.2f}", 3.14159)')).toBe('y=3.14'));
  it('formatN small', () => expect(evalStr('formatN(3.14159)')).toBe('3.14'));
  it('formatN big', () => expect(evalStr('formatN(1234.5)')).toBe('1235'));
  it('hexAlpha', () => expect(evalStr('hexAlpha("#7C3AED", 0.5)')).toBe('rgba(124,58,237,0.5)'));
  it('mixColor midpoint', () => expect(evalStr('mixColor("#000000", "#ffffff", 0.5)')).toBe('#808080'));
});

describe('LaTeX identifiers', () => {
  it('\\omega', () => expect(evalStr('\\omega + 1', { '\\omega': 4 })).toBe(5));
  it('\\varphi', () => expect(evalStr('sin(\\varphi)', { '\\varphi': 0 })).toBeCloseTo(0));
  it('member on namespace', () => expect(evalStr('params.\\omega', { params: { '\\omega': 7 } })).toBe(7));
});

describe('member access', () => {
  it('dot', () => expect(evalStr('obj.a', { obj: { a: 1 } })).toBe(1));
  it('nested', () => expect(evalStr('obj.a.b', { obj: { a: { b: 2 } } })).toBe(2));
  it('bound method', () => {
    const locals = { v: { x: 3, y: 4 }, viewport: { toScreen: (x: number, y: number) => ({ sx: x + 1, sy: y + 2 }) } };
    expect(evalStr('viewport.toScreen(v.x, v.y).sx', locals)).toBe(4);
  });
});

describe('errors', () => {
  it('undefined identifier throws', () => {
    expect(() => evalStr('nonexistent')).toThrow(ExprEvalError);
  });
  it('parse error throws', () => {
    expect(() => parseExpr('1 +')).toThrow(ExprParseError);
  });
});

describe('array literal', () => {
  it('numeric array', () => expect(evalStr('[1, 2, 3]')).toEqual([1, 2, 3]));
});

describe('context chaining', () => {
  it('inner overrides outer', () => {
    const outer = rootContext({ a: 1, b: 2 });
    const inner = outer.extend({ a: 10 });
    expect(evalNode(parseExpr('a'), inner)).toBe(10);
    expect(evalNode(parseExpr('b'), inner)).toBe(2);
  });
  it('three-deep chain', () => {
    const c = rootContext({ a: 1 }).extend({ b: 2 }).extend({ c: 3 });
    expect(evalNode(parseExpr('a + b + c'), c)).toBe(6);
  });
  it('has respects chain', () => {
    const ctx = rootContext({ x: 1 }).extend({ y: 2 });
    expect(ctx.has('x')).toBe(true);
    expect(ctx.has('y')).toBe(true);
    expect(ctx.has('z')).toBe(false);
  });
});

describe('builtins — numeric extras', () => {
  it('tan(0)', () => expect(evalStr('tan(0)')).toBeCloseTo(0));
  it('asin(1)', () => expect(evalStr('asin(1)')).toBeCloseTo(Math.PI / 2));
  it('acos(0)', () => expect(evalStr('acos(0)')).toBeCloseTo(Math.PI / 2));
  it('atan(1)', () => expect(evalStr('atan(1)')).toBeCloseTo(Math.PI / 4));
  it('atan2(1,1)', () => expect(evalStr('atan2(1, 1)')).toBeCloseTo(Math.PI / 4));
  it('sinh(0)', () => expect(evalStr('sinh(0)')).toBe(0));
  it('cosh(0)', () => expect(evalStr('cosh(0)')).toBe(1));
  it('tanh(0)', () => expect(evalStr('tanh(0)')).toBe(0));
  it('exp(0)', () => expect(evalStr('exp(0)')).toBe(1));
  it('exp(1)', () => expect(evalStr('exp(1)')).toBeCloseTo(Math.E));
  it('log(e)', () => expect(evalStr('log(e)')).toBeCloseTo(1));
  it('log2(8)', () => expect(evalStr('log2(8)')).toBe(3));
  it('log10(100)', () => expect(evalStr('log10(100)')).toBe(2));
  it('pow fn', () => expect(evalStr('pow(2, 8)')).toBe(256));
  it('cbrt', () => expect(evalStr('cbrt(27)')).toBe(3));
  it('ceil', () => expect(evalStr('ceil(1.2)')).toBe(2));
  it('round up', () => expect(evalStr('round(1.5)')).toBe(2));
  it('round down', () => expect(evalStr('round(1.4)')).toBe(1));
  it('isFinite true', () => expect(evalStr('isFinite(1)')).toBe(true));
  it('isFinite inf', () => expect(evalStr('isFinite(Infinity)')).toBe(false));
  it('isNaN', () => expect(evalStr('isNaN(NaN)')).toBe(true));
  it('sign pos', () => expect(evalStr('sign(42)')).toBe(1));
  it('hypot 3-arg', () => expect(evalStr('hypot(2, 3, 6)')).toBe(7));
});

describe('builtins — vec extras', () => {
  it('normalize', () => {
    const v = evalStr('normalize(vec2(3, 0))') as { x: number; y: number };
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
  });
  it('normalize zero', () => {
    const v = evalStr('normalize(vec2(0, 0))') as { x: number; y: number };
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });
  it('rotate 90deg', () => {
    const v = evalStr('rotate(vec2(1, 0), pi/2)') as { x: number; y: number };
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(1);
  });
});

describe('builtins — format & color extras', () => {
  it('format {} default', () => expect(evalStr('format("v={}", 42)')).toBe('v=42'));
  it('format multi', () => expect(evalStr('format("{}+{}", 1, 2)')).toBe('1+2'));
  it('format no placeholder', () => expect(evalStr('format("plain")')).toBe('plain'));
  it('formatN infinity', () => expect(evalStr('formatN(Infinity)')).toBe('–'));
  it('formatN custom digits', () => expect(evalStr('formatN(3.14159, 4)')).toBe('3.1416'));
  it('toLocaleInt', () => expect(evalStr('toLocaleInt(1234567)')).toBe('1,234,567'));
  it('rgba', () => expect(evalStr('rgba(1, 2, 3, 0.5)')).toBe('rgba(1,2,3,0.5)'));
  it('hexAlpha 3-digit hex', () => expect(evalStr('hexAlpha("#f0a", 1)')).toBe('rgba(255,0,170,1)'));
  it('mixColor at 0', () => expect(evalStr('mixColor("#112233", "#ffffff", 0)')).toBe('#112233'));
});

describe('object literal', () => {
  it('numeric values', () => expect(evalStr('{a: 1, b: 2}')).toEqual({ a: 1, b: 2 }));
  it('switch with numeric key coerced', () => expect(evalStr('switch(k, {"1": "one", _default: "other"})', { k: 1 })).toBe('one'));
});

describe('complex expressions', () => {
  it('quadratic formula', () => {
    // -b/(2a) for a=1,b=-4,c=3 → 2
    expect(evalStr('-b / (2 * a)', { a: 1, b: -4 })).toBe(2);
  });
  it('ternary chained', () => expect(evalStr('x > 0 ? "pos" : x < 0 ? "neg" : "zero"', { x: -5 })).toBe('neg'));
  it('nested calls', () => expect(evalStr('sqrt(pow(3, 2) + pow(4, 2))')).toBe(5));
  it('member + call chain', () => expect(evalStr('length(normalize(vec2(5, 0)))')).toBeCloseTo(1));
});
