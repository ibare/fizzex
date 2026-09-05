import { describe, it, expect } from 'vitest';
import { parseLatex } from '../latex/index.js';
import { getControlType, buildInlineControlConfig } from './inline-control-types.js';
import type { MathNode } from '../types.js';
import type { CatalogDetail } from '../analyzer/semantic/types.js';

/** 식의 첫 variable 노드를 꺼낸다. */
function firstVariable(latex: string): MathNode {
  const found: MathNode[] = [];
  const walk = (n: MathNode): void => {
    if (n.type === 'variable') found.push(n);
    for (const v of Object.values(n)) {
      if (Array.isArray(v)) for (const c of v) if (c && typeof c === 'object' && 'type' in c) walk(c as MathNode);
    }
  };
  walk(parseLatex(latex).ast);
  if (found.length === 0) throw new Error(`variable 없음: ${latex}`);
  return found[0];
}

describe('인라인 컨트롤 종류', () => {
  describe('상수 이름이라는 이유로 편집을 막지 않는다', () => {
    it.each([
      ['\\pi', 'π'],
      ['e', 'e'],
      ['\\varphi', 'φ'],
      ['\\gamma', 'γ'],
      ['\\tau', 'τ'],
    ])('%s 는 조절 가능하다', (latex) => {
      expect(getControlType(firstVariable(latex))).toBe('slider');
    });

    it('∞ 만 예외 — 무한대는 슬라이더로 조절할 수 없다', () => {
      expect(getControlType(firstVariable('\\infty'))).toBe('readonly');
    });
  });

  describe('카탈로그가 말하면 그것을 따른다', () => {
    const detail = (kind: 'constant' | 'input' | 'structural'): CatalogDetail => ({
      name: '테스트',
      oneLiner: '테스트용',
      description: '테스트용 카탈로그 상세',
      field: '물리학',
      elementMeanings: { c: { kind, role: '광속', description: '진공 중 빛의 속도', value: 299792458, unit: 'm/s' } },
    });

    it('kind: constant 면 readonly', () => {
      expect(getControlType(firstVariable('c'), detail('constant'))).toBe('readonly');
    });

    it('kind: input 이면 slider', () => {
      expect(getControlType(firstVariable('c'), detail('input'))).toBe('slider');
    });

    it('kind: structural 이면 컨트롤 없음', () => {
      expect(getControlType(firstVariable('c'), detail('structural'))).toBe('none');
    });
  });

  describe('슬라이더 초기값', () => {
    it('이름으로 상수 표준값을 시드하지 않는다', () => {
      // γ 를 로런츠 인자로 쓰는 사용자에게 0.577 을 보여주지 않는다.
      // 판정에서 이름 단정을 거부해 놓고 값에서 단정하면 앞뒤가 맞지 않는다.
      expect(buildInlineControlConfig(firstVariable('\\gamma'), undefined).currentValue).toBe(1);
      expect(buildInlineControlConfig(firstVariable('\\pi'), undefined).currentValue).toBe(1);
    });

    it('카탈로그 default 가 있으면 그것을 쓴다', () => {
      const detail: CatalogDetail = {
        name: '테스트',
        oneLiner: '테스트용',
        description: '테스트용',
        field: '기하학',
        elementMeanings: {},
        parameterConfig: [{ id: 'r', name: 'r', role: '반지름', min: 0, max: 10, step: 0.1, default: 5 }],
      };
      expect(buildInlineControlConfig(firstVariable('r'), undefined, detail).currentValue).toBe(5);
    });
  });

  it('숫자는 스테퍼다', () => {
    const root = parseLatex('42').ast;
    const num = root.children[0];
    expect(num).toBeDefined();
    expect(getControlType(num as MathNode)).toBe('stepper');
  });
});
