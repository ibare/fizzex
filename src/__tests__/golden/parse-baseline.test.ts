/**
 * P0 골든 마스터 — parseLatex 현재 동작 스냅샷
 *
 * 이 파일은 lexer 도입(P1) 및 NumberNode 원자화(P2)의 회귀 베이스라인이다.
 * 테스트 이름의 [OK] 표시는 P1 이후 전 구간에서 유지되어야 하는 불변이다.
 * (P2 시점의 [BUG] 항목들은 원자화 도입과 함께 [OK]로 전환되어 잔존하지 않는다.)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser';
import { astToLatex } from '../../latex/ast-to-latex';
import { resetLatexIdCounter } from '../../utils/id-generator';
import type { MathNode } from '../../types';

beforeEach(() => {
  resetLatexIdCounter();
});

/** AST를 비교 가능한 단순 형태로 변환 (id·sourceRange 제외) */
function shape(node: MathNode): unknown {
  if (!node || typeof node !== 'object') return node;
  const out: Record<string, unknown> = { type: (node as { type: string }).type };
  for (const [k, v] of Object.entries(node)) {
    if (k === 'id' || k === 'sourceRange') continue;
    if (Array.isArray(v)) {
      out[k] = v.map((c) => (typeof c === 'object' && c !== null ? shape(c as MathNode) : c));
    } else if (typeof v === 'object' && v !== null) {
      out[k] = shape(v as MathNode);
    } else if (k !== 'type') {
      out[k] = v;
    }
  }
  return out;
}

describe('P0 골든 — 숫자 리터럴', () => {
  it('[OK] 두 자리 정수는 단일 NumberNode("10")', () => {
    const { ast } = parseLatex('10');
    expect(ast.children.length).toBe(1);
    expect(shape(ast.children[0])).toEqual({ type: 'number', value: '10' });
  });

  it('[OK] 세 자리 정수는 단일 NumberNode("123")', () => {
    const { ast } = parseLatex('123');
    expect(ast.children.length).toBe(1);
    expect(shape(ast.children[0])).toEqual({ type: 'number', value: '123' });
  });

  it('[OK] 소수 3.14는 단일 NumberNode("3.14")', () => {
    const { ast } = parseLatex('3.14');
    expect(ast.children.length).toBe(1);
    expect(shape(ast.children[0])).toEqual({ type: 'number', value: '3.14' });
  });

  it('[OK] 단일 자릿수는 단일 NumberNode', () => {
    const { ast } = parseLatex('7');
    expect(ast.children.length).toBe(1);
    expect(shape(ast.children[0])).toEqual({ type: 'number', value: '7' });
  });
});

describe('P0 골든 — 곱셈 ASCII *', () => {
  it('[OK] a*b*c 입력은 [var,×,var,×,var]로 파싱됨 (lexer가 ASCII *을 ×로 인지)', () => {
    const { ast } = parseLatex('a*b*c');
    expect(ast.children.length).toBe(5);
    expect(shape(ast.children[0])).toEqual({ type: 'variable', name: 'a' });
    expect(shape(ast.children[1])).toEqual({ type: 'operator', operator: '×' });
    expect(shape(ast.children[2])).toEqual({ type: 'variable', name: 'b' });
    expect(shape(ast.children[3])).toEqual({ type: 'operator', operator: '×' });
    expect(shape(ast.children[4])).toEqual({ type: 'variable', name: 'c' });
  });

  it('[OK] 2*3 입력은 [num 2, ×, num 3]으로 파싱됨', () => {
    const { ast } = parseLatex('2*3');
    expect(ast.children.length).toBe(3);
    expect(shape(ast.children[0])).toEqual({ type: 'number', value: '2' });
    expect(shape(ast.children[1])).toEqual({ type: 'operator', operator: '×' });
    expect(shape(ast.children[2])).toEqual({ type: 'number', value: '3' });
  });

  it('[OK] \\times 명령어는 × 연산자로 정확히 파싱', () => {
    const { ast } = parseLatex('a \\times b');
    expect(ast.children.length).toBe(3);
    expect(shape(ast.children[1])).toEqual({ type: 'operator', operator: '×' });
  });

  it('[OK] \\cdot 명령어는 · 연산자로 정확히 파싱', () => {
    const { ast } = parseLatex('a \\cdot b');
    expect(ast.children.length).toBe(3);
    expect(shape(ast.children[1])).toEqual({ type: 'operator', operator: '·' });
  });
});

describe('P0 골든 — 기본 식 구조 (모두 OK, 전 구간 유지)', () => {
  it('[OK] x + y', () => {
    const { ast } = parseLatex('x + y');
    expect(ast.children.length).toBe(3);
    expect(shape(ast.children[0])).toEqual({ type: 'variable', name: 'x' });
    expect(shape(ast.children[1])).toEqual({ type: 'operator', operator: '+' });
    expect(shape(ast.children[2])).toEqual({ type: 'variable', name: 'y' });
  });

  it('[OK] x^2 (단일자리 지수)', () => {
    const { ast } = parseLatex('x^2');
    expect(ast.children.length).toBe(1);
    expect(ast.children[0].type).toBe('power');
  });

  it('[OK] x^{12} 지수는 단일 NumberNode("12")로 파싱됨', () => {
    const { ast } = parseLatex('x^{12}');
    expect(ast.children.length).toBe(1);
    expect(ast.children[0].type).toBe('power');
    const power = ast.children[0] as { exponent: MathNode[] };
    expect(power.exponent.length).toBe(1);
    expect(shape(power.exponent[0])).toEqual({
      type: 'row',
      children: [{ type: 'number', value: '12' }],
    });
  });

  it('[OK] \\frac{1}{2}', () => {
    const { ast } = parseLatex('\\frac{1}{2}');
    expect(ast.children.length).toBe(1);
    expect(ast.children[0].type).toBe('frac');
  });
});

describe('P0 골든 — 라운드트립 (전 구간 불변)', () => {
  // parseLatex(s) → astToLatex 결과가 의미적으로 동치여야 함.
  // 자릿수 분리는 row가 join하므로 라운드트립에 영향 없음.
  // \sin(x) 등 함수+괄호 조합은 본 패치 범위 밖의 별도 라운드트립 결함이 있어 제외.
  const cases = [
    '7',
    '10',
    '123',
    '3.14',
    'x',
    'x + y',
    'x + 10',
    'x^2',
    'x^{12}',
    '\\frac{1}{2}',
    '\\frac{10}{20}',
    'a \\times b',
    'a \\cdot b',
    '|x - 1|',
    '\\sqrt{2}',
  ];
  it.each(cases)('[OK] roundtrip: %s', (src) => {
    const { ast } = parseLatex(src);
    const out = astToLatex(ast);
    // 정확한 문자열 동치까진 보장 안 되지만, 재파싱 후 다시 출력해도 안정점이어야 함.
    const { ast: ast2 } = parseLatex(out);
    expect(astToLatex(ast2)).toBe(out);
  });
});

describe('P0 골든 — ASCII * 정상 인지 (P2 lexer)', () => {
  it('[OK] *를 OP×로 인지하여 경고/에러 없이 정상 파싱함', () => {
    const result = parseLatex('a*b');
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.ast.children.length).toBe(3);
    expect((result.ast.children[1] as { operator: string }).operator).toBe('×');
  });
});
