import { describe, it, expect, beforeAll } from 'vitest';
import { parseLatex } from '../latex/index.js';
import { isExplorable, judgeExplorable } from './explorability.js';
import type { SemanticResult } from '../analyzer/semantic/types.js';
import { loadLocale, setLocale } from '../locales/registry.js';

// 이 파일은 한국어 설명을 기대한다. 기본 언어는 영어이므로 명시적으로 받아 둔다 —
// 덤으로 로케일 로딩이 실제로 동작하는지도 함께 검증된다.
beforeAll(async () => {
  await loadLocale('ko');
  setLocale('ko');
});


const judge = (latex: string) => judgeExplorable(parseLatex(latex).ast);

describe('탐색 진입 자격 판정', () => {
  describe('isExplorable — 술어', () => {
    it('확정 매칭만 자격을 갖는다', () => {
      const confirmed: SemanticResult = { role: '이차함수 표준형', description: '', layer: 'catalog', tier: 'confirmed' };
      expect(isExplorable(confirmed)).toBe(true);
    });

    it('미확정 매칭은 자격이 없다', () => {
      const approximate: SemanticResult = { role: '판별식', description: '', layer: 'catalog', tier: 'approximate', score: 0.8 };
      expect(isExplorable(approximate)).toBe(false);
    });

    it('매칭 결과가 없으면 자격이 없다', () => {
      expect(isExplorable(undefined)).toBe(false);
      expect(isExplorable({ role: '수식 전체', description: '', layer: 'fallback' })).toBe(false);
    });
  });

  describe('judgeExplorable — 콘텐츠 본문에 섞이는 수식', () => {
    it('단위 딸린 수치에 진입점을 주지 않는다', () => {
      // 스샷에서 본문 글자를 가리던 그 수식.
      expect(judge('2\\,\\mathrm{L}')).toBe(false);
      expect(judge('5\\,\\mathrm{L} - 3\\,\\mathrm{L} = 2\\,\\mathrm{L}')).toBe(false);
    });

    it('단일 변수·숫자·단순 식에 진입점을 주지 않는다', () => {
      expect(judge('x')).toBe(false);
      expect(judge('3')).toBe(false);
      expect(judge('x + 1')).toBe(false);
    });
  });

  describe('judgeExplorable — 확정 매칭', () => {
    it('형식이 확정된 수식에 진입점을 준다', () => {
      expect(judge('y = ax^2 + bx + c')).toBe(true);
      expect(judge('a^2 + b^2 = c^2')).toBe(true);
      expect(judge('T^2 = \\frac{4\\pi^2}{GM} a^3')).toBe(true);
    });

    it('이름 없는 사례도 형식이 확정되면 진입점을 받는다', () => {
      expect(judge('3^2 + 4^2 = 5^2')).toBe(true);
      expect(judge('y = 2x^2 + 3x + 1')).toBe(true);
    });
  });

  describe('judgeExplorable — 미확정 매칭은 탈락한다', () => {
    // 폴백 스코어러는 시그니처 멀티셋 recall 만 보므로 엉뚱한 이름을 붙인다.
    // 이 이름들을 본문에 광고하면 진입점 낭비가 아니라 오정보다.
    it('폴백 스코어러가 붙인 이름으로는 진입점을 주지 않는다', () => {
      expect(judge('\\sin^2\\theta + \\cos^2\\theta = 1')).toBe(false); // → "하디-바인베르크 법칙"
      expect(judge('A = P(1 + r)^t')).toBe(false); // → "이차함수 꼭짓점형"
      expect(judge('y = 3 \\sin(2t)')).toBe(false); // → "직사각형의 둘레"
    });

    it('이름이 맞더라도 확정이 아니면 진입점을 주지 않는다', () => {
      // 질량-에너지 등가는 이름은 맞지만 형식 유니피케이션을 거치지 않았다.
      expect(judge('E = mc^2')).toBe(false);
    });
  });
});
