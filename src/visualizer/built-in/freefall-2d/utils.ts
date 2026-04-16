/**
 * freefall-2d 공용 유틸 + 공통 타입
 */

/** #RRGGBB 헥스 색상을 alpha 투명도 포함 rgba 문자열로 변환 */
export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 둥근 모서리 사각형 경로 생성 (fill/stroke는 호출자 책임) */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** 높이/시간 값 표시용 포맷 */
export function formatMeter(n: number): string {
  if (!Number.isFinite(n)) return '-';
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toFixed(2)}km`;
  if (abs >= 100) return `${n.toFixed(0)}m`;
  if (abs >= 10) return `${n.toFixed(1)}m`;
  return `${n.toFixed(2)}m`;
}

export function formatSecond(n: number): string {
  if (!Number.isFinite(n)) return '-';
  if (n >= 10) return `${n.toFixed(1)}s`;
  return `${n.toFixed(2)}s`;
}

/** 프리셋별 이정표 (높이 m, 라벨) */
export interface Milestone {
  h: number;
  label: string;
}

/** 장면 그리기 공통 인자 */
export interface SceneDrawArgs {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 현재(current) 포물선 상수 g (m/s²) */
  g: number;
  /** 시간 t (s) */
  t: number;
  /** 현재 수식 기반 낙하거리 (m) */
  h_cur: number;
  /** 원본 수식(= 카탈로그 표준) 기반 낙하거리 (m). 구조 변경 없으면 동일 */
  h_std: number;
  /** 프리셋의 표준 g (m/s²) - 비교 기준선 */
  g_std: number;
  color: string;
  isDark: boolean;
  alpha?: number;
  /** current vs standard가 구조적으로 다른가 */
  isStandard: boolean;
}
