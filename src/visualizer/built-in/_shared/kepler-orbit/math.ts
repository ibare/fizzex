/**
 * 케플러 궤도 공용 수학 유틸.
 *
 * Visualizer는 AST 파생값을 우선 사용하므로 여기의 함수는 fallback 용도.
 */

import { GM } from './constants';

/** 공전 주기 (s). a는 km 단위. */
export function computePeriod(a_km: number): number {
  const a_m = a_km * 1000;
  return 2 * Math.PI * Math.sqrt((a_m ** 3) / GM);
}

/** 궤도 속도 (km/s). a는 km 단위, T는 s. */
export function computeVelocity(a_km: number, T_s: number): number {
  if (!(T_s > 0)) return 0;
  const a_m = a_km * 1000;
  return ((2 * Math.PI * a_m) / T_s) / 1000;
}

/** 유한 양수만 통과, 그 외(NaN, Infinity, 0, 음수)는 0 */
export function sanitizePositive(value: unknown): number {
  return (typeof value === 'number' && Number.isFinite(value) && value > 0) ? value : 0;
}

/** 초를 사람이 읽기 쉬운 한국어 표기로 */
export function formatTime(seconds: number): string {
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}분`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}시간`;
  return `${(seconds / 86400).toFixed(1)}일`;
}
