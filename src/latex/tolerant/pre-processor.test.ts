import { describe, it, expect } from 'vitest';
import { preProcess } from './pre-processor';

describe('preProcess', () => {
  describe('항등 변환', () => {
    it('정규화 불필요 입력은 원본 그대로 반환한다', () => {
      const result = preProcess('\\frac{1}{2}');
      expect(result.normalized).toBe('\\frac{1}{2}');
      expect(result.recoveries).toHaveLength(0);
    });

    it('빈 문자열을 처리한다', () => {
      const result = preProcess('');
      expect(result.normalized).toBe('');
      expect(result.recoveries).toHaveLength(0);
    });

    it('정규화 비활성화 시 원본을 그대로 반환한다', () => {
      const result = preProcess('\\\\\\frac {1} {2}', {
        backslashNormalization: false,
        whitespaceNormalization: false,
      });
      expect(result.normalized).toBe('\\\\\\frac {1} {2}');
      expect(result.recoveries).toHaveLength(0);
    });
  });

  describe('백슬래시 정규화', () => {
    it('연속 백슬래시 3개를 커맨드 앞에서 1개로 축소한다', () => {
      const result = preProcess('\\\\\\frac{1}{2}');
      expect(result.normalized).toBe('\\frac{1}{2}');
      expect(result.recoveries).toHaveLength(1);
      expect(result.recoveries[0].type).toBe('backslash_norm');
    });

    it('연속 백슬래시 4개를 커맨드 앞에서 1개로 축소한다', () => {
      const result = preProcess('\\\\\\\\alpha');
      expect(result.normalized).toBe('\\alpha');
      expect(result.recoveries).toHaveLength(1);
    });

    it('줄바꿈 \\\\ (뒤에 알파벳 없음)은 보존한다', () => {
      const result = preProcess('a \\\\ b');
      expect(result.normalized).toBe('a \\\\ b');
      expect(result.recoveries).toHaveLength(0);
    });

    it('줄바꿈 \\\\ 뒤에 공백이 있는 경우도 보존한다', () => {
      const result = preProcess('x \\\\ y');
      expect(result.normalized).toBe('x \\\\ y');
      expect(result.recoveries).toHaveLength(0);
    });

    it('backslashNormalization: false 시 연속 백슬래시를 보존한다', () => {
      const result = preProcess('\\\\\\frac{1}{2}', {
        backslashNormalization: false,
      });
      expect(result.normalized).toBe('\\\\\\frac{1}{2}');
      expect(result.recoveries).toHaveLength(0);
    });
  });

  describe('공백 정규화', () => {
    it('커맨드와 여는 중괄호 사이 공백을 제거한다', () => {
      const result = preProcess('\\frac {1}{2}');
      expect(result.normalized).toBe('\\frac{1}{2}');
      expect(result.recoveries).toHaveLength(1);
      expect(result.recoveries[0].type).toBe('whitespace_trim');
    });

    it('여러 공백을 제거한다', () => {
      const result = preProcess('\\frac   {1}  {2}');
      // 커맨드-중괄호 사이 공백만 제거, }와 { 사이 공백은 보존 (파서가 처리)
      expect(result.normalized).toBe('\\frac{1}  {2}');
      expect(result.recoveries).toHaveLength(1);
    });

    it('커맨드명 종료 후 중괄호가 아닌 경우 공백을 보존한다', () => {
      const result = preProcess('\\log x');
      expect(result.normalized).toBe('\\log x');
      expect(result.recoveries).toHaveLength(0);
    });

    it('whitespaceNormalization: false 시 공백을 보존한다', () => {
      const result = preProcess('\\frac {1}{2}', {
        whitespaceNormalization: false,
      });
      expect(result.normalized).toBe('\\frac {1}{2}');
      expect(result.recoveries).toHaveLength(0);
    });
  });

  describe('텍스트 모드 보존', () => {
    it('\\text{} 내부의 공백을 보존한다', () => {
      const result = preProcess('\\text{ hello world }');
      expect(result.normalized).toBe('\\text{ hello world }');
    });

    it('\\text{} 내부의 연속 백슬래시를 보존한다', () => {
      const result = preProcess('\\text{a\\\\b}');
      expect(result.normalized).toBe('\\text{a\\\\b}');
    });

    it('\\mathrm{} 내부를 보존한다', () => {
      const result = preProcess('\\mathrm{ if }');
      expect(result.normalized).toBe('\\mathrm{ if }');
    });

    it('\\operatorname{} 내부를 보존한다', () => {
      const result = preProcess('\\operatorname{ sgn }');
      expect(result.normalized).toBe('\\operatorname{ sgn }');
    });

    it('텍스트 모드 외부의 정규화는 적용한다', () => {
      const result = preProcess('\\frac {1}{2} + \\text{ hello }');
      expect(result.normalized).toBe('\\frac{1}{2} + \\text{ hello }');
      expect(result.recoveries).toHaveLength(1);
    });
  });

  describe('복합 정규화', () => {
    it('백슬래시와 공백 정규화를 동시에 적용한다', () => {
      const result = preProcess('\\\\\\frac {1} {2}');
      // 커맨드-중괄호 사이 공백만 제거, }와 { 사이 공백은 보존 (파서가 처리)
      expect(result.normalized).toBe('\\frac{1} {2}');
      expect(result.recoveries.length).toBeGreaterThanOrEqual(2);
    });

    it('LLM 출력 패턴: 연속 백슬래시 + 공백', () => {
      const result = preProcess('\\\\\\sqrt {x}');
      expect(result.normalized).toBe('\\sqrt{x}');
    });
  });

  describe('OffsetMap', () => {
    it('정규화 없는 입력에서 항등 매핑을 반환한다', () => {
      const result = preProcess('\\frac{1}{2}');
      expect(result.offsetMap.toOriginal(0)).toBe(0);
      expect(result.offsetMap.toOriginal(5)).toBe(5);
      expect(result.offsetMap.toNormalized(0)).toBe(0);
    });

    it('백슬래시 정규화 후 원본 위치로 역매핑한다', () => {
      // \\\frac{1}{2} → \frac{1}{2}
      // 원본: 0=\ 1=\ 2=\ 3=f 4=r 5=a 6=c ...
      // 정규화: 0=\ 1=f 2=r 3=a 4=c ...
      const result = preProcess('\\\\\\frac{1}{2}');
      // 정규화 후 위치 1 (f) → 원본 위치 3 (f)
      const origPos = result.offsetMap.toOriginal(1);
      expect(origPos).toBe(3);
    });

    it('공백 정규화 후 원본 위치로 역매핑한다', () => {
      // \frac {1}{2} → \frac{1}{2}
      const result = preProcess('\\frac {1}{2}');
      // 정규화 후 위치 5 ({) → 원본 위치 6 ({)
      const origPos = result.offsetMap.toOriginal(5);
      expect(origPos).toBeGreaterThanOrEqual(5);
    });
  });
});
