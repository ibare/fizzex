/**
 * compound-interest-2d 공용 유틸 + 공통 타입
 */

export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 만원 단위 한국식 포맷. 1234.5 → "1,235만원" */
export function formatKrw(manWon: number): string {
  const rounded = Math.round(manWon);
  return `${rounded.toLocaleString('ko-KR')}만원`;
}

/** 72의 법칙: 2배 되는 시간 ≈ 72 / (r * 100) */
export function doubleTime(r: number): number {
  if (r <= 0) return Infinity;
  return Math.log(2) / Math.log(1 + r);
}

/** 복리 공식: A = P (1 + r/n)^(n t) */
export function compoundA(P: number, r: number, n: number, t: number): number {
  if (n <= 0) n = 1;
  return P * Math.pow(1 + r / n, n * t);
}

/** 장면 그리기 공통 인자 */
export interface SceneDrawArgs {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 원금 (만원) */
  P: number;
  /** 연이율 (0.03 = 3%) */
  r: number;
  /** 연복리 횟수 */
  n: number;
  /** 경과 연 */
  t: number;
  /** 현재 금액 A (만원) */
  A: number;
  /** 편집 전 표준 A (만원) — 프리셋 대비 비교용 */
  A_std: number;
  /** 편집되지 않음 */
  isStandard: boolean;
  /** 표시할 최대 년 */
  tMax: number;
  /** 애니메이션 시각 */
  animT: number;
  color: string;
  isDark: boolean;
  alpha?: number;
}
