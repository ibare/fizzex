/**
 * exponential-decay 계열 순수 함수.
 */

export const LN2 = Math.log(2);

export function decayRatio(r: number, t: number): number {
  return Math.exp(r * t);
}

export function halfLifeFromR(r: number): number {
  if (r >= 0) return Infinity;
  return LN2 / -r;
}

export function formatT(t: number): string {
  if (Math.abs(t) >= 100) return t.toFixed(0);
  if (Math.abs(t) >= 10) return t.toFixed(1);
  return t.toFixed(2);
}
