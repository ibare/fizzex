/**
 * 극값·한계 연산자 파싱 — `\max`, `\min`, `\sup`, `\inf`, `\limsup`, `\det`, `\gcd`, `\Pr`
 *
 * TeX 에서 이들은 함수가 아니라 limits 를 받는 `\mathop` 이다. 함수로 다루면
 * 뒤따르는 식을 인자로 삼켜 의미가 바뀌므로, 그러지 않는다는 것이 이 파일의 계약이다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex-parser.js';
import { astToLatex } from '../ast-to-latex.js';
import { resetLatexIdCounter } from '../../utils/id-generator.js';
import type { MathNode, ScriptsNode, MathOpNode } from '../../types.js';

beforeEach(() => {
  resetLatexIdCounter();
});

function children(src: string): MathNode[] {
  return parseLatex(src).ast.children;
}

function roundTrip(src: string): string {
  return astToLatex(parseLatex(src).ast);
}

describe('노드 종류', () => {
  it('함수가 아니라 mathop 으로 파싱한다', () => {
    const [head] = children('\\max');
    expect(head.type).toBe('mathop');
    expect((head as MathOpNode).name).toBe('max');
  });

  it('뒤따르는 식을 인자로 삼키지 않는다', () => {
    const nodes = children('\\max f(x)');
    expect(nodes[0].type).toBe('mathop');
    // f 와 (x) 는 형제로 남는다 — mathop 의 자식이 아니다.
    expect(nodes.length).toBeGreaterThan(1);
    expect(nodes.some((n) => n.type === 'paren')).toBe(true);
  });

  it('중괄호 집합을 인자로 삼키지 않는다', () => {
    const nodes = children('\\max\\{1, 2\\}');
    expect(nodes[0].type).toBe('mathop');
  });

  it('sin 같은 진짜 함수는 여전히 func 다', () => {
    expect(children('\\sin x')[0].type).toBe('func');
  });
});

describe('첨자', () => {
  it('첨자는 scripts 가 감싸고 base 가 mathop 이다', () => {
    const [head] = children('\\max_{x \\in S}');
    expect(head.type).toBe('scripts');
    const scripts = head as ScriptsNode;
    expect(scripts.base).toHaveLength(1);
    expect(scripts.base[0].type).toBe('mathop');
    expect(scripts.subscript).toBeDefined();
  });

  it('상하한을 모두 받는다', () => {
    const scripts = children('\\max_{i=1}^{n} a_i')[0] as ScriptsNode;
    expect(scripts.subscript).toBeDefined();
    expect(scripts.superscript).toBeDefined();
  });
});

describe('상한극한·하한극한', () => {
  it('limsup 과 liminf 를 구별해 보존한다', () => {
    expect((children('\\limsup')[0] as MathOpNode).name).toBe('limsup');
    expect((children('\\liminf')[0] as MathOpNode).name).toBe('liminf');
  });

  it('lim 으로 퇴화하지 않는다', () => {
    expect(roundTrip('\\limsup_{n \\to \\infty} a_n')).not.toContain('\\lim_');
    expect(roundTrip('\\limsup_{n \\to \\infty} a_n')).toContain('\\limsup');
    expect(roundTrip('\\liminf_{n \\to \\infty} a_n')).toContain('\\liminf');
  });
});

describe('왕복', () => {
  it('명령 뒤 글자가 붙어 다른 명령이 되지 않는다', () => {
    expect(roundTrip('\\max f(x)')).toBe('\\max f(x)');
    expect(roundTrip('\\det A')).toBe('\\det A');
  });

  it('첨자 붙은 연산자를 중괄호로 감싸지 않는다', () => {
    // `{\max}_x` 는 Ord atom 이라 밖으로 내보내면 limits 의미를 잃는다.
    expect(roundTrip('\\max_{x \\in S} f(x)')).not.toContain('{\\max}');
    expect(roundTrip('\\max_{x \\in S} f(x)')).toContain('\\max_{x \\in S}');
  });

  it('인자 목록을 이중 괄호로 만들지 않는다', () => {
    expect(roundTrip('\\gcd(a,b)')).toBe('\\gcd(a,b)');
  });

  it('왕복해도 노드 종류가 유지된다', () => {
    const once = roundTrip('\\max_{i=1}^{n} a_i');
    const twice = astToLatex(parseLatex(once).ast);
    expect(twice).toBe(once);
    expect(children(once)[0].type).toBe('scripts');
  });
});

describe('파싱 오류 없음', () => {
  it('아홉 연산자 모두 오류·경고 없이 읽힌다', () => {
    for (const name of ['max', 'min', 'sup', 'inf', 'limsup', 'liminf', 'det', 'gcd', 'Pr']) {
      const result = parseLatex(`\\${name}`);
      expect(result.hasErrors, name).toBe(false);
      expect(result.warnings, name).toHaveLength(0);
    }
  });
});
