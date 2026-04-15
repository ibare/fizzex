/**
 * 이징 함수 — 애니메이션 보간 곡선
 */

/** 0~1 입력을 받아 0~1 출력을 반환하는 이징 함수 */
export type EasingFn = (t: number) => number;

export const Easing = {
  linear: (t: number): number => t,

  easeInQuad: (t: number): number => t * t,

  easeOutQuad: (t: number): number => t * (2 - t),

  easeInOutQuad: (t: number): number =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  easeInCubic: (t: number): number => t * t * t,

  easeOutCubic: (t: number): number => {
    const t1 = t - 1;
    return t1 * t1 * t1 + 1;
  },

  easeInOutCubic: (t: number): number =>
    t < 0.5
      ? 4 * t * t * t
      : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  /** 목표를 살짝 넘었다가 돌아오는 효과 */
  easeOutBack: (t: number): number => {
    const c = 1.70158;
    const t1 = t - 1;
    return 1 + (c + 1) * t1 * t1 * t1 + c * t1 * t1;
  },

  /** 스프링처럼 진동하며 안착 */
  spring: (t: number): number =>
    1 - Math.cos(t * Math.PI * 2.5) * Math.exp(-t * 6),
} as const;
