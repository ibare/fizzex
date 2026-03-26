import { describe, it, expect, beforeEach } from 'vitest';
import { MockRenderBackend } from './render-backend';

describe('MockRenderBackend', () => {
  let backend: MockRenderBackend;

  beforeEach(() => {
    backend = new MockRenderBackend();
  });

  describe('호출 기록', () => {
    it('메서드 호출을 기록한다', () => {
      backend.setFillStyle('#ff0000');
      backend.fillRect(10, 20, 100, 50);

      expect(backend.calls).toHaveLength(2);
      expect(backend.calls[0]).toEqual({ method: 'setFillStyle', args: ['#ff0000'] });
      expect(backend.calls[1]).toEqual({ method: 'fillRect', args: [10, 20, 100, 50] });
    });

    it('hasCalled로 호출 여부를 확인할 수 있다', () => {
      backend.beginPath();
      backend.moveTo(0, 0);

      expect(backend.hasCalled('beginPath')).toBe(true);
      expect(backend.hasCalled('stroke')).toBe(false);
    });

    it('countCalls로 호출 횟수를 확인할 수 있다', () => {
      backend.lineTo(10, 10);
      backend.lineTo(20, 20);
      backend.lineTo(30, 30);

      expect(backend.countCalls('lineTo')).toBe(3);
      expect(backend.countCalls('moveTo')).toBe(0);
    });

    it('getLastCallArgs로 마지막 호출 인자를 가져올 수 있다', () => {
      backend.setFont('16px serif');
      backend.setFont('24px sans-serif');

      expect(backend.getLastCallArgs('setFont')).toEqual(['24px sans-serif']);
    });

    it('clear로 호출 기록을 초기화할 수 있다', () => {
      backend.beginPath();
      backend.moveTo(0, 0);
      backend.clear();

      expect(backend.calls).toHaveLength(0);
    });
  });

  describe('상태 관리', () => {
    it('스타일 속성이 상태에 반영된다', () => {
      backend.setFillStyle('#ff0000');
      backend.setStrokeStyle('#00ff00');
      backend.setLineWidth(2);

      const state = backend.getState();
      expect(state.fillStyle).toBe('#ff0000');
      expect(state.strokeStyle).toBe('#00ff00');
      expect(state.lineWidth).toBe(2);
    });

    it('save/restore로 상태를 저장/복원한다', () => {
      backend.setFillStyle('#ff0000');
      backend.save();

      backend.setFillStyle('#00ff00');
      expect(backend.getState().fillStyle).toBe('#00ff00');

      backend.restore();
      expect(backend.getState().fillStyle).toBe('#ff0000');
    });

    it('globalAlpha를 설정하고 조회할 수 있다', () => {
      expect(backend.getGlobalAlpha()).toBe(1);

      backend.setGlobalAlpha(0.5);
      expect(backend.getGlobalAlpha()).toBe(0.5);
    });

    it('lineDash를 설정할 수 있다', () => {
      backend.setLineDash([5, 3]);

      const state = backend.getState();
      expect(state.lineDash).toEqual([5, 3]);
    });
  });

  describe('렌더링 메서드', () => {
    it('경로 메서드가 올바르게 호출된다', () => {
      backend.beginPath();
      backend.moveTo(0, 0);
      backend.lineTo(100, 100);
      backend.quadraticCurveTo(50, 50, 100, 0);
      backend.closePath();
      backend.stroke();

      expect(backend.hasCalled('beginPath')).toBe(true);
      expect(backend.hasCalled('moveTo')).toBe(true);
      expect(backend.hasCalled('lineTo')).toBe(true);
      expect(backend.hasCalled('quadraticCurveTo')).toBe(true);
      expect(backend.hasCalled('closePath')).toBe(true);
      expect(backend.hasCalled('stroke')).toBe(true);
    });

    it('텍스트 렌더링이 올바르게 호출된다', () => {
      backend.setFont('16px serif');
      backend.setTextBaseline('alphabetic');
      backend.fillText('Hello', 10, 20);

      expect(backend.getLastCallArgs('fillText')).toEqual(['Hello', 10, 20]);
    });

    it('도형 렌더링이 올바르게 호출된다', () => {
      backend.fillRect(10, 20, 100, 50);
      backend.strokeRect(10, 20, 100, 50);

      expect(backend.hasCalled('fillRect')).toBe(true);
      expect(backend.hasCalled('strokeRect')).toBe(true);
    });

    it('변환 메서드가 올바르게 호출된다', () => {
      backend.transform(1, 0, 0.21, 1, 0, 0);

      expect(backend.getLastCallArgs('transform')).toEqual([1, 0, 0.21, 1, 0, 0]);
    });
  });
});
