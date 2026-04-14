import { describe, it, expect, beforeEach } from 'vitest';
import {
  ParseErrorCollector,
  createErrorCollector,
  getErrorCollector,
  clearErrorCollector,
  reportError,
  reportWarning,
} from './parse-errors';

describe('Parse Errors', () => {
  describe('ParseErrorCollector', () => {
    let collector: ParseErrorCollector;

    beforeEach(() => {
      collector = new ParseErrorCollector();
    });

    it('에러를 추가하고 조회할 수 있다', () => {
      collector.addError('syntax', '문법 오류', 5, 'test input', '\\bad');

      const errors = collector.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('syntax');
      expect(errors[0].severity).toBe('error');
      expect(errors[0].message).toBe('문법 오류');
      expect(errors[0].position).toBe(5);
      expect(errors[0].token).toBe('\\bad');
    });

    it('경고를 추가하고 조회할 수 있다', () => {
      collector.addWarning('unsupported', '지원하지 않음', 10, 'test input');

      const warnings = collector.getWarnings();
      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe('warning');
    });

    it('정보를 추가하고 조회할 수 있다', () => {
      collector.addInfo('unknown_command', '알 수 없는 명령어', 0, 'test');

      const all = collector.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].severity).toBe('info');
    });

    it('hasErrors로 에러 존재 여부를 확인할 수 있다', () => {
      expect(collector.hasErrors()).toBe(false);

      collector.addWarning('unsupported', '경고만', 0, '');
      expect(collector.hasErrors()).toBe(false);

      collector.addError('syntax', '에러', 0, '');
      expect(collector.hasErrors()).toBe(true);
    });

    it('clear로 모든 에러를 초기화할 수 있다', () => {
      collector.addError('syntax', '에러 1', 0, '');
      collector.addWarning('unsupported', '경고 1', 0, '');

      collector.clear();

      expect(collector.getAll()).toHaveLength(0);
      expect(collector.hasErrors()).toBe(false);
    });

    it('context가 위치 주변을 추출한다', () => {
      const longInput = 'prefix...error here...suffix';
      collector.addError('syntax', '테스트', 10, longInput);

      const error = collector.getErrors()[0];
      expect(error.context).toContain('error');
      expect(error.context).toContain('^'); // 위치 표시
    });

    it('getAll은 모든 에러/경고/정보를 반환한다', () => {
      collector.addError('syntax', '에러', 0, '');
      collector.addWarning('unsupported', '경고', 0, '');
      collector.addInfo('unknown_command', '정보', 0, '');

      expect(collector.getAll()).toHaveLength(3);
    });
  });

  describe('전역 에러 수집기', () => {
    beforeEach(() => {
      clearErrorCollector();
    });

    it('createErrorCollector로 새 수집기를 생성한다', () => {
      const collector = createErrorCollector();

      expect(collector).toBeInstanceOf(ParseErrorCollector);
      expect(getErrorCollector()).toBe(collector);
    });

    it('getErrorCollector로 현재 수집기를 조회한다', () => {
      expect(getErrorCollector()).toBeNull();

      createErrorCollector();

      expect(getErrorCollector()).not.toBeNull();
    });

    it('clearErrorCollector로 수집기를 정리한다', () => {
      createErrorCollector();
      clearErrorCollector();

      expect(getErrorCollector()).toBeNull();
    });

    it('reportError로 에러를 추가한다', () => {
      const collector = createErrorCollector();

      reportError('syntax', '에러 메시지', 5, 'test input', '\\cmd');

      expect(collector.getErrors()).toHaveLength(1);
    });

    it('reportWarning으로 경고를 추가한다', () => {
      const collector = createErrorCollector();

      reportWarning('unsupported', '경고 메시지', 5, 'test input');

      expect(collector.getWarnings()).toHaveLength(1);
    });

    it('수집기가 없으면 report 함수는 조용히 실패한다', () => {
      clearErrorCollector();

      // 에러 발생하지 않아야 함
      expect(() => {
        reportError('syntax', '에러', 0, '');
        reportWarning('syntax', '경고', 0, '');
      }).not.toThrow();
    });
  });

  describe('expected 필드', () => {
    let collector: ParseErrorCollector;

    beforeEach(() => {
      collector = new ParseErrorCollector();
    });

    it('expected 필드를 설정할 수 있다', () => {
      collector.addError('syntax', '문법 오류', 5, 'test input', '\\bad', ['}', '\\right']);
      const error = collector.getErrors()[0];
      expect(error.expected).toEqual(['}', '\\right']);
    });

    it('expected 필드가 없으면 에러 객체에 포함되지 않는다', () => {
      collector.addError('syntax', '문법 오류', 5, 'test input');
      const error = collector.getErrors()[0];
      expect(error.expected).toBeUndefined();
    });

    it('경고에도 expected를 설정할 수 있다', () => {
      collector.addWarning('syntax', '경고', 5, 'test input', undefined, ['\\left']);
      const warning = collector.getWarnings()[0];
      expect(warning.expected).toEqual(['\\left']);
    });

    it('정보에도 expected를 설정할 수 있다', () => {
      collector.addInfo('syntax', '정보', 5, 'test input', undefined, ['token']);
      const info = collector.getAll()[0];
      expect(info.expected).toEqual(['token']);
    });

    it('token 없이 expected만 설정할 수 있다', () => {
      collector.addError('syntax', '문법 오류', 5, 'test input', undefined, ['{']);
      const error = collector.getErrors()[0];
      expect(error.token).toBeUndefined();
      expect(error.expected).toEqual(['{']);
    });
  });
});
