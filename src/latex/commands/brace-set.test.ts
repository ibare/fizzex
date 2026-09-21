/**
 * 중괄호 구분자 — `\{...\}`, `\left\{...\right\}`, `\lbrace`/`\rbrace`
 *
 * 세 표기 모두 중괄호를 잃고 있었다. 집합을 구조로 묶되, 짝이 없는 중괄호는
 * 예전처럼 글리프로 남겨 기존 수식을 깨지 않는다는 것이 이 파일의 계약이다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex-parser.js';
import { astToLatex } from '../ast-to-latex.js';
import { resetLatexIdCounter } from '../../utils/id-generator.js';
import type { MathNode, ParenNode, RowNode } from '../../types.js';

beforeEach(() => {
  resetLatexIdCounter();
});

function children(src: string): MathNode[] {
  return parseLatex(src).ast.children;
}

function asParen(node: MathNode): ParenNode {
  expect(node.type).toBe('paren');
  return node as ParenNode;
}

/** paren 내용의 자식들 — content 는 RowNode 하나로 감싸여 온다 */
function contentOf(paren: ParenNode): MathNode[] {
  const head = paren.content[0];
  return head?.type === 'row' ? (head as RowNode).children : paren.content;
}

describe('짝이 맞는 중괄호', () => {
  it('\\{...\\} 를 집합으로 묶는다', () => {
    const nodes = children('\\{1,2\\}');
    expect(nodes).toHaveLength(1);
    expect(asParen(nodes[0]).parenType).toBe('{');
  });

  it('\\left\\{...\\right\\} 가 오류 없이 읽힌다', () => {
    const result = parseLatex('\\left\\{1,2,3\\right\\}');
    expect(result.errors).toHaveLength(0);
    expect(result.hasErrors).toBe(false);
    const paren = asParen(result.ast.children[0]);
    expect(paren.parenType).toBe('{');
    expect(paren.autoSize).toBe(true);
  });

  it('\\lbrace ... \\rbrace 가 경고 없이 읽힌다', () => {
    const result = parseLatex('\\lbrace 1,2 \\rbrace');
    expect(result.warnings).toHaveLength(0);
    expect(astToLatex(result.ast)).toContain('\\{');
  });

  it('중첩된 집합을 안쪽까지 묶는다', () => {
    const outer = asParen(children('\\{ \\{1\\}, 2 \\}')[0]);
    const inner = contentOf(outer).find((n) => n.type === 'paren');
    expect(inner).toBeDefined();
    expect((inner as ParenNode).parenType).toBe('{');
  });

  it('안에 든 괄호를 집합의 끝으로 오해하지 않는다', () => {
    const nodes = children('\\{ (1,2) \\}');
    expect(nodes).toHaveLength(1);
    expect(asParen(nodes[0]).parenType).toBe('{');
  });
});

describe('짝이 없는 중괄호', () => {
  it('여는 쪽 단독은 글리프로 남는다', () => {
    const nodes = children('\\{');
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe('number');
  });

  it('닫는 쪽 단독도 글리프로 남는다', () => {
    const nodes = children('a \\} b');
    expect(nodes.some((n) => n.type === 'paren')).toBe(false);
  });

  it('sourceRange 를 명령 전체로 잡는다', () => {
    const [head] = children('\\{');
    expect(head.sourceRange).toEqual({ start: 0, end: 2 });
  });
});

describe('왕복', () => {
  it('집합 표기를 유지한다', () => {
    expect(astToLatex(parseLatex('\\{1,2\\}').ast)).toBe('\\{1,2\\}');
  });

  it('짝 없는 중괄호를 그룹 기호로 내보내지 않는다', () => {
    // 맨 `{` 로 나가면 LaTeX 에서 그룹 시작이 되어 의미가 달라진다.
    expect(astToLatex(parseLatex('\\{').ast)).toBe('\\{');
    expect(astToLatex(parseLatex('a \\} b').ast)).not.toContain('a}');
  });

  it('왕복한 결과를 다시 읽어도 오류가 없다', () => {
    for (const src of ['\\{1,2\\}', '\\left\\{1,2\\right\\}', '\\lbrace 1,2 \\rbrace', '\\{ \\{1\\}, 2 \\}']) {
      const once = astToLatex(parseLatex(src).ast);
      expect(parseLatex(once).errors, src).toHaveLength(0);
    }
  });
});
