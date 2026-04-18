/**
 * 복리 공식과 관련 수치 유틸.
 */

export function compoundA(P: number, r: number, n: number, t: number): number {
  const nn = n <= 0 ? 1 : n;
  return P * Math.pow(1 + r / nn, nn * t);
}

export function doubleTime(r: number): number {
  if (r <= 0) return Infinity;
  return Math.log(2) / Math.log(1 + r);
}

export function formatKrw(manWon: number): string {
  const rounded = Math.round(manWon);
  return `${rounded.toLocaleString('ko-KR')}만원`;
}

export function formatShortKrw(manWon: number): string {
  if (!Number.isFinite(manWon)) return '';
  const abs = Math.abs(manWon);
  if (abs >= 10000) return `${(manWon / 10000).toFixed(1)}억`;
  if (abs >= 1000) return `${Math.round(manWon / 100) / 10}천만`;
  return `${Math.round(manWon)}만`;
}
