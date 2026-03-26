import { describe, it, expect } from 'vitest';
import {
  getCommandHandler,
  hasCommand,
  getCommandNames,
  commandStats,
} from './command-registry';

describe('Command Registry', () => {
  describe('getCommandHandler', () => {
    it('frac 명령어 핸들러를 반환한다', () => {
      const handler = getCommandHandler('frac');
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('sqrt 명령어 핸들러를 반환한다', () => {
      const handler = getCommandHandler('sqrt');
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('alpha 명령어 핸들러를 반환한다', () => {
      const handler = getCommandHandler('alpha');
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('sin 명령어 핸들러를 반환한다', () => {
      const handler = getCommandHandler('sin');
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('미등록 명령어는 undefined를 반환한다', () => {
      const handler = getCommandHandler('nonexistent_command_xyz');
      expect(handler).toBeUndefined();
    });
  });

  describe('hasCommand', () => {
    it('등록된 명령어는 true를 반환한다', () => {
      expect(hasCommand('frac')).toBe(true);
      expect(hasCommand('sqrt')).toBe(true);
      expect(hasCommand('alpha')).toBe(true);
      expect(hasCommand('sin')).toBe(true);
      expect(hasCommand('int')).toBe(true);
      expect(hasCommand('sum')).toBe(true);
      expect(hasCommand('hat')).toBe(true);
      expect(hasCommand('times')).toBe(true);
      expect(hasCommand('quad')).toBe(true);
    });

    it('미등록 명령어는 false를 반환한다', () => {
      expect(hasCommand('nonexistent_command_xyz')).toBe(false);
      expect(hasCommand('')).toBe(false);
      expect(hasCommand('FRAC')).toBe(false);
    });
  });

  describe('getCommandNames', () => {
    it('모든 명령어 이름을 배열로 반환한다', () => {
      const names = getCommandNames();
      expect(Array.isArray(names)).toBe(true);
    });

    it('배열이 비어있지 않다', () => {
      const names = getCommandNames();
      expect(names.length).toBeGreaterThan(0);
    });

    it('frac, sqrt, alpha, sin 등 주요 명령어가 포함된다', () => {
      const names = getCommandNames();
      expect(names).toContain('frac');
      expect(names).toContain('sqrt');
      expect(names).toContain('alpha');
      expect(names).toContain('sin');
      expect(names).toContain('int');
      expect(names).toContain('sum');
      expect(names).toContain('lim');
      expect(names).toContain('prod');
      expect(names).toContain('overline');
      expect(names).toContain('hat');
      expect(names).toContain('times');
      expect(names).toContain('quad');
    });
  });

  describe('commandStats', () => {
    it('total이 0보다 크다', () => {
      expect(commandStats.total).toBeGreaterThan(0);
    });

    it('각 카테고리 개수가 0 이상이다', () => {
      expect(commandStats.basic).toBeGreaterThanOrEqual(0);
      expect(commandStats.bigOps).toBeGreaterThanOrEqual(0);
      expect(commandStats.functions).toBeGreaterThanOrEqual(0);
      expect(commandStats.accents).toBeGreaterThanOrEqual(0);
      expect(commandStats.greek).toBeGreaterThanOrEqual(0);
      expect(commandStats.operators).toBeGreaterThanOrEqual(0);
      expect(commandStats.spaces).toBeGreaterThanOrEqual(0);
    });

    it('total이 getCommandNames 길이와 같다', () => {
      const names = getCommandNames();
      expect(commandStats.total).toBe(names.length);
    });
  });
});
