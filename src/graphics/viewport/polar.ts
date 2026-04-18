/**
 * 극좌표 뷰포트.
 *
 * 사용처: kepler-orbit-*-2d 류(중심에서 각도·반지름으로 위성/궤도 배치).
 * 입력 시그니처가 (radius, angle)이라 Viewport2D 공통 계약에는 속하지 않고,
 * 자체 toScreen/toWorld 쌍을 제공한다.
 */

export interface PolarCenter {
  x: number;
  y: number;
}

export interface PolarViewportOptions {
  center: PolarCenter;
  /** 월드 반지름 1단위 → 스크린 픽셀 배율. */
  scale: number;
}

export interface PolarViewport {
  readonly center: PolarCenter;
  readonly scale: number;
  toScreen(radius: number, angle: number): { x: number; y: number };
  toWorld(sx: number, sy: number): { radius: number; angle: number };
}

export function createPolarViewport(opts: PolarViewportOptions): PolarViewport {
  const center = opts.center;
  const scale = opts.scale;

  return {
    center,
    scale,
    toScreen(radius, angle) {
      return {
        x: center.x + Math.cos(angle) * radius * scale,
        y: center.y + Math.sin(angle) * radius * scale,
      };
    },
    toWorld(sx, sy) {
      const dx = (sx - center.x) / scale;
      const dy = (sy - center.y) / scale;
      return { radius: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) };
    },
  };
}
