/**
 * exponential-decay-2d 공용 유틸 + 공통 타입
 */

export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 장면 그리기 공통 인자 */
export interface SceneDrawArgs {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 초기량 N₀ */
  N0: number;
  /** 증가율 r (감소면 음수). 반감기 = ln(2)/|r| */
  r: number;
  /** 현재 시간 */
  t: number;
  /** 잔량 비율 N/N₀ ∈ [0,1] */
  ratio: number;
  /** 표준(프리셋) 비율 — 편집 비교용 */
  ratio_std: number;
  /** 편집되지 않음 */
  isStandard: boolean;
  /** 반감기 (t 단위) */
  halfLife: number;
  /** 애니메이션 시각 */
  animT: number;
  color: string;
  isDark: boolean;
  alpha?: number;
}
