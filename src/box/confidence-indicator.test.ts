import { describe, it, expect, beforeEach } from 'vitest';
import { ConfidenceIndicator, DEFAULT_CONFIDENCE_CONFIG } from './confidence-indicator';
import type { ConfidenceRegion } from './confidence-indicator';
import { MockSurface } from './surface';

describe('ConfidenceIndicator', () => {
  let backend: MockSurface;
  let indicator: ConfidenceIndicator;

  beforeEach(() => {
    backend = new MockSurface();
    indicator = new ConfidenceIndicator(backend);
  });

  describe('clean 영역', () => {
    it('clean 레벨에서 아무것도 그리지 않는다', () => {
      const regions: ConfidenceRegion[] = [
        { level: 'clean', x: 0, y: 20, width: 100, height: 15, depth: 5 },
      ];
      indicator.renderOverlays(regions);
      expect(backend.calls).toHaveLength(0);
    });

    it('너비 0인 영역을 건너뛴다', () => {
      const regions: ConfidenceRegion[] = [
        { level: 'normalized', x: 10, y: 20, width: 0, height: 15, depth: 5 },
      ];
      indicator.renderOverlays(regions);
      expect(backend.calls).toHaveLength(0);
    });
  });

  describe('normalized 영역 (주황 단일 물결선)', () => {
    it('단일 물결선을 그린다', () => {
      const regions: ConfidenceRegion[] = [
        { level: 'normalized', x: 10, y: 20, width: 50, height: 15, depth: 5 },
      ];
      indicator.renderOverlays(regions);

      // save, setStrokeStyle, setLineWidth, setLineCap, setLineJoin, beginPath, moveTo, ...curves, stroke, restore
      const strokeCalls = backend.calls.filter(c => c.method === 'setStrokeStyle');
      expect(strokeCalls).toHaveLength(1);
      expect(strokeCalls[0].args[0]).toBe(DEFAULT_CONFIDENCE_CONFIG.normalizedColor);

      // 물결선은 1번만 그려야 한다 (단일)
      const beginPathCalls = backend.calls.filter(c => c.method === 'beginPath');
      expect(beginPathCalls).toHaveLength(1);
    });

    it('물결선이 baseline + offset 위치에 시작한다', () => {
      const regions: ConfidenceRegion[] = [
        { level: 'normalized', x: 5, y: 30, width: 20, height: 10, depth: 5 },
      ];
      indicator.renderOverlays(regions);

      const moveToCalls = backend.calls.filter(c => c.method === 'moveTo');
      expect(moveToCalls).toHaveLength(1);
      // y = baseline(30) + offsetFromBaseline(3) = 33
      expect(moveToCalls[0].args).toEqual([5, 33]);
    });
  });

  describe('uncertain 영역 (빨강 이중 물결선)', () => {
    it('이중 물결선을 그린다', () => {
      const regions: ConfidenceRegion[] = [
        { level: 'uncertain', x: 0, y: 20, width: 30, height: 12, depth: 4 },
      ];
      indicator.renderOverlays(regions);

      // 이중 물결선: beginPath 2번, stroke 2번
      const beginPathCalls = backend.calls.filter(c => c.method === 'beginPath');
      expect(beginPathCalls).toHaveLength(2);

      const strokeStyleCalls = backend.calls.filter(c => c.method === 'setStrokeStyle');
      expect(strokeStyleCalls).toHaveLength(2);
      expect(strokeStyleCalls[0].args[0]).toBe(DEFAULT_CONFIDENCE_CONFIG.uncertainColor);
      expect(strokeStyleCalls[1].args[0]).toBe(DEFAULT_CONFIDENCE_CONFIG.uncertainColor);
    });

    it('이중 물결선의 y 좌표가 1.5px 간격으로 분리된다', () => {
      const regions: ConfidenceRegion[] = [
        { level: 'uncertain', x: 0, y: 20, width: 12, height: 10, depth: 5 },
      ];
      indicator.renderOverlays(regions);

      const moveToCalls = backend.calls.filter(c => c.method === 'moveTo');
      expect(moveToCalls).toHaveLength(2);
      // wavyY = 20 + 3 = 23
      // 첫 번째: wavyY - 1.5 = 21.5
      // 두 번째: wavyY + 1.5 = 24.5
      expect(moveToCalls[0].args[1]).toBe(21.5);
      expect(moveToCalls[1].args[1]).toBe(24.5);
    });
  });

  describe('failed 영역 (배경 + 이중 물결선)', () => {
    it('배경과 이중 물결선을 모두 그린다', () => {
      const regions: ConfidenceRegion[] = [
        { level: 'failed', x: 0, y: 20, width: 40, height: 15, depth: 5 },
      ];
      indicator.renderOverlays(regions);

      // 배경: fillRect 1번
      const fillRectCalls = backend.calls.filter(c => c.method === 'fillRect');
      expect(fillRectCalls).toHaveLength(1);

      // 배경색
      const fillStyleCalls = backend.calls.filter(c => c.method === 'setFillStyle');
      expect(fillStyleCalls).toHaveLength(1);
      expect(fillStyleCalls[0].args[0]).toBe(DEFAULT_CONFIDENCE_CONFIG.failedBgColor);

      // 이중 물결선: beginPath 2번
      const beginPathCalls = backend.calls.filter(c => c.method === 'beginPath');
      expect(beginPathCalls).toHaveLength(2);
    });

    it('배경이 Box 전체 영역을 덮는다 (baseline 기준)', () => {
      const regions: ConfidenceRegion[] = [
        { level: 'failed', x: 10, y: 30, width: 50, height: 20, depth: 8 },
      ];
      indicator.renderOverlays(regions);

      const fillRectCalls = backend.calls.filter(c => c.method === 'fillRect');
      expect(fillRectCalls).toHaveLength(1);
      // fillRect(x, y - height, width, height + depth)
      expect(fillRectCalls[0].args).toEqual([10, 10, 50, 28]);
    });
  });

  describe('다중 영역', () => {
    it('여러 영역을 순서대로 렌더링한다', () => {
      const regions: ConfidenceRegion[] = [
        { level: 'clean', x: 0, y: 20, width: 30, height: 15, depth: 5 },
        { level: 'normalized', x: 30, y: 20, width: 40, height: 15, depth: 5 },
        { level: 'uncertain', x: 70, y: 20, width: 30, height: 15, depth: 5 },
      ];
      indicator.renderOverlays(regions);

      // clean 건너뜀, normalized 1번, uncertain 2번 = 총 3번 beginPath
      const beginPathCalls = backend.calls.filter(c => c.method === 'beginPath');
      expect(beginPathCalls).toHaveLength(3);
    });
  });

  describe('물결선 곡선 정확성', () => {
    it('quadraticCurveTo로 물결을 그린다', () => {
      const regions: ConfidenceRegion[] = [
        { level: 'normalized', x: 0, y: 10, width: 12, height: 8, depth: 2 },
      ];
      indicator.renderOverlays(regions);

      const curveCalls = backend.calls.filter(c => c.method === 'quadraticCurveTo');
      expect(curveCalls.length).toBeGreaterThan(0);

      // 첫 번째 곡선: cp는 위로 (y - amplitude)
      const firstCurve = curveCalls[0];
      // wavyY = 10 + 3 = 13
      // cpX = 0 + wavelength/4 = 1.5, cpY = 13 - 2 = 11
      expect(firstCurve.args[0]).toBe(1.5);  // cpX
      expect(firstCurve.args[1]).toBe(11);    // cpY = wavyY - amplitude
    });
  });

  describe('커스텀 설정', () => {
    it('사용자 정의 색상을 적용한다', () => {
      const customIndicator = new ConfidenceIndicator(backend, {
        normalizedColor: '#FF0000',
      });
      const regions: ConfidenceRegion[] = [
        { level: 'normalized', x: 0, y: 10, width: 20, height: 8, depth: 2 },
      ];
      customIndicator.renderOverlays(regions);

      const strokeCalls = backend.calls.filter(c => c.method === 'setStrokeStyle');
      expect(strokeCalls[0].args[0]).toBe('#FF0000');
    });
  });

  describe('상태 보존', () => {
    it('렌더링 전후로 save/restore를 호출한다', () => {
      const regions: ConfidenceRegion[] = [
        { level: 'normalized', x: 0, y: 10, width: 20, height: 8, depth: 2 },
      ];
      indicator.renderOverlays(regions);

      const saveCalls = backend.calls.filter(c => c.method === 'save');
      const restoreCalls = backend.calls.filter(c => c.method === 'restore');
      expect(saveCalls.length).toBeGreaterThan(0);
      expect(saveCalls.length).toBe(restoreCalls.length);
    });
  });
});
