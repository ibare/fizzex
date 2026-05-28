import { describe, it, expect, vi } from 'vitest';
import * as draw from './draw.js';
import * as theme from './theme.js';

/**
 * Node 환경에서 CanvasRenderingContext2D 타입 전체를 만족시키는 mock은
 * 비용 대비 효과가 낮다. 여기선 "함수가 export되고, 경로 호출 패턴이 올바른가"만 검증한다.
 * 실 렌더 검증은 Phase 3 Playwright 골든 이미지(D6)에서 수행.
 *
 * 기법: `Proxy`로 모든 속성 접근을 vi.fn 으로 잡아 호출 기록을 남긴 뒤,
 * 함수 파라미터 부분은 `CanvasRenderingContext2D` 타입으로 단일 cast(불필요 unknown 경유 없음).
 */

interface Recorder {
  calls: Array<[string, unknown[]]>;
  gradients: { linear: number; radial: number };
}

function makeCtx(): { ctx: CanvasRenderingContext2D; rec: Recorder } {
  const calls: Array<[string, unknown[]]> = [];
  const gradients = { linear: 0, radial: 0 };
  const gradient: CanvasGradient = { addColorStop: () => {} };
  const target = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (prop === 'createLinearGradient') {
          return (...a: unknown[]) => {
            calls.push(['createLinearGradient', a]);
            gradients.linear++;
            return gradient;
          };
        }
        if (prop === 'createRadialGradient') {
          return (...a: unknown[]) => {
            calls.push(['createRadialGradient', a]);
            gradients.radial++;
            return gradient;
          };
        }
        return vi.fn((...a: unknown[]) => {
          calls.push([prop, a]);
        });
      },
    },
  );
  return { ctx: target as CanvasRenderingContext2D, rec: { calls, gradients } };
}

describe('기존 시그니처 불변', () => {
  it('hexAlpha', () => expect(draw.hexAlpha('#7C3AED', 0.5)).toBe('rgba(124,58,237,0.5)'));
  it('formatN >= 100', () => expect(draw.formatN(123.4)).toBe('123'));
  it('formatN [10,100)', () => expect(draw.formatN(12.34)).toBe('12.3'));
  it('formatN < 10', () => expect(draw.formatN(1.234)).toBe('1.23'));
  it('formatN non-finite', () => expect(draw.formatN(Number.NaN)).toBe('-'));
  it('roundRect 존재', () => expect(typeof draw.roundRect).toBe('function'));
});

describe('신규 프리미티브 — export & path 이벤트', () => {
  it('drawCircle → beginPath + arc + closePath', () => {
    const { ctx, rec } = makeCtx();
    draw.drawCircle(ctx, 5, 5, 3);
    const names = rec.calls.filter((c) => c[0] !== 'then').map((c) => c[0]);
    expect(names).toEqual(['beginPath', 'arc', 'closePath']);
  });
  it('drawEllipse', () => {
    const { ctx, rec } = makeCtx();
    draw.drawEllipse(ctx, 0, 0, 5, 3, 0.1);
    expect(rec.calls.map((c) => c[0])).toEqual(['beginPath', 'ellipse', 'closePath']);
  });
  it('drawArc (열림)', () => {
    const { ctx, rec } = makeCtx();
    draw.drawArc(ctx, 0, 0, 1, 0, Math.PI);
    expect(rec.calls.map((c) => c[0])).toEqual(['beginPath', 'arc']);
  });
  it('drawFilledArc (wedge)', () => {
    const { ctx, rec } = makeCtx();
    draw.drawFilledArc(ctx, 0, 0, 1, 0, Math.PI / 2);
    expect(rec.calls.map((c) => c[0])).toEqual(['beginPath', 'moveTo', 'arc', 'closePath']);
  });
  it('drawLine', () => {
    const { ctx, rec } = makeCtx();
    draw.drawLine(ctx, 0, 0, 10, 10);
    expect(rec.calls.map((c) => c[0])).toEqual(['beginPath', 'moveTo', 'lineTo']);
  });
  it('drawPolyline 3점', () => {
    const { ctx, rec } = makeCtx();
    draw.drawPolyline(ctx, [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ]);
    expect(rec.calls.map((c) => c[0])).toEqual(['beginPath', 'moveTo', 'lineTo', 'lineTo']);
  });
  it('drawPolyline 1점 no-op', () => {
    const { ctx, rec } = makeCtx();
    draw.drawPolyline(ctx, [{ x: 0, y: 0 }]);
    expect(rec.calls).toEqual([]);
  });
  it('drawPolygon 3점 close', () => {
    const { ctx, rec } = makeCtx();
    draw.drawPolygon(ctx, [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);
    const names = rec.calls.map((c) => c[0]);
    expect(names[0]).toBe('beginPath');
    expect(names[names.length - 1]).toBe('closePath');
  });
  it('drawPolygon 2점 no-op', () => {
    const { ctx, rec } = makeCtx();
    draw.drawPolygon(ctx, [{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    expect(rec.calls).toEqual([]);
  });
});

describe('drawPath SVG 서브셋', () => {
  it('M L Z', () => {
    const { ctx, rec } = makeCtx();
    draw.drawPath(ctx, 'M 0 0 L 10 10 Z');
    expect(rec.calls.map((c) => c[0])).toEqual(['beginPath', 'moveTo', 'lineTo', 'closePath']);
  });
  it('C cubic', () => {
    const { ctx, rec } = makeCtx();
    draw.drawPath(ctx, 'M 0 0 C 1 1 2 2 3 3');
    const bz = rec.calls.find((c) => c[0] === 'bezierCurveTo');
    expect(bz?.[1]).toEqual([1, 1, 2, 2, 3, 3]);
  });
  it('Q quadratic', () => {
    const { ctx, rec } = makeCtx();
    draw.drawPath(ctx, 'M 0 0 Q 1 2 3 4');
    const q = rec.calls.find((c) => c[0] === 'quadraticCurveTo');
    expect(q?.[1]).toEqual([1, 2, 3, 4]);
  });
  it('미지원 커맨드 throw', () => {
    const { ctx } = makeCtx();
    expect(() => draw.drawPath(ctx, 'M 0 0 A 1 1 0 0 0 10 10')).toThrow(/unsupported command/);
  });
  it('빈 문자열 no-op', () => {
    const { ctx, rec } = makeCtx();
    draw.drawPath(ctx, '');
    expect(rec.calls).toEqual([]);
  });
});

describe('drawImage', () => {
  it('dw/dh 생략', () => {
    const { ctx, rec } = makeCtx();
    const img = { width: 10, height: 10 } as HTMLImageElement;
    draw.drawImage(ctx, img, 5, 10);
    expect(rec.calls[0]).toEqual(['drawImage', [img, 5, 10]]);
  });
  it('dw/dh 지정', () => {
    const { ctx, rec } = makeCtx();
    const img = { width: 10, height: 10 } as HTMLImageElement;
    draw.drawImage(ctx, img, 5, 10, 100, 50);
    expect(rec.calls[0]).toEqual(['drawImage', [img, 5, 10, 100, 50]]);
  });
});

describe('gradients', () => {
  it('createLinearGradientFill', () => {
    const { ctx, rec } = makeCtx();
    const g = draw.createLinearGradientFill(ctx, 0, 0, 10, 0, [
      { offset: 0, color: '#000' },
      { offset: 1, color: '#fff' },
    ]);
    expect(g).toBeDefined();
    expect(rec.gradients.linear).toBe(1);
  });
  it('createRadialGradientFill', () => {
    const { ctx, rec } = makeCtx();
    const g = draw.createRadialGradientFill(ctx, 0, 0, 5, [{ offset: 0.5, color: '#0f0' }]);
    expect(g).toBeDefined();
    expect(rec.gradients.radial).toBe(1);
  });
});

describe('theme', () => {
  it('brand light & dark 다름', () => {
    expect(theme.brand(false)).not.toBe(theme.brand(true));
  });
  it('brand hex 형식', () => {
    expect(theme.brand(false)).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(theme.brand(true)).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
  it('기존 팔레트 값 불변', () => {
    expect(theme.background(false)).toBe('#f8fafc');
    expect(theme.background(true)).toBe('#0b1220');
    expect(typeof theme.gridLine(false)).toBe('string');
    expect(typeof theme.axis(true)).toBe('string');
    expect(typeof theme.text(false)).toBe('string');
    expect(typeof theme.divider(true)).toBe('string');
  });
});
