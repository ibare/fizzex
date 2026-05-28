import { describe, it, expect } from 'vitest';
import { resolveBoxRenderConfig } from './types.js';
import type { FizzexConfig } from './types.js';

describe('Headless Types', () => {
  describe('resolveBoxRenderConfig', () => {
    it('기본 설정을 올바르게 반환한다', () => {
      const config = resolveBoxRenderConfig({}, false);

      expect(config.baseFontSize).toBe(20);
      expect(config.fontFamily).toBe('"Latin Modern Math", "Computer Modern", "Times New Roman", serif');
      expect(config.color).toBe('#1a1a1a');
      expect(config.cursorColor).toBe('#3b82f6');
      expect(config.showPlaceholders).toBe(false);
      expect(config.placeholder).toBeUndefined();
    });

    it('light 테마에 올바른 색상을 사용한다', () => {
      const config = resolveBoxRenderConfig({ theme: 'light' }, false);

      expect(config.color).toBe('#1a1a1a');
      expect(config.cursorColor).toBe('#3b82f6');
    });

    it('dark 테마에 올바른 색상을 사용한다', () => {
      const config = resolveBoxRenderConfig({ theme: 'dark' }, false);

      expect(config.color).toBe('#e0e0e0');
      expect(config.cursorColor).toBe('#60a5fa');
    });

    it('사용자 설정을 기본값에 병합한다', () => {
      const userConfig: FizzexConfig = {
        baseFontSize: 32,
        fontFamily: 'Arial, sans-serif',
        color: '#ff0000',
      };
      const config = resolveBoxRenderConfig(userConfig, false);

      expect(config.baseFontSize).toBe(32);
      expect(config.fontFamily).toBe('Arial, sans-serif');
      expect(config.color).toBe('#ff0000');
      // cursorColor should still use theme default (light)
      expect(config.cursorColor).toBe('#3b82f6');
    });

    it('editor 모드에서 placeholder 설정을 포함한다', () => {
      const config = resolveBoxRenderConfig({}, true);

      expect(config.showPlaceholders).toBe(true);
      expect(config.placeholder).toBeDefined();
      expect(config.placeholder!.backgroundColor).toBe('rgba(0,0,0,0.05)');
      expect(config.placeholder!.borderColor).toBe('rgba(0,0,0,0.15)');
      expect(config.placeholder!.borderWidth).toBe(1);
      expect(config.placeholder!.borderRadius).toBe(2);
      expect(config.placeholder!.opacity).toBe(0.8);
    });
  });
});
