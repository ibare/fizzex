/**
 * 테마 기본 팔레트.
 *
 * 기존 7개 2D Visualizer가 수렴해서 쓰고 있던 값들을 그대로 이관했다.
 * Visualizer는 이 함수를 써도 되고, 자기 도메인 색상이 필요하면 무시해도 된다.
 */

export function background(isDark: boolean): string {
  return isDark ? '#0b1220' : '#f8fafc';
}

export function gridLine(isDark: boolean): string {
  return isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.16)';
}

export function axis(isDark: boolean): string {
  return isDark ? 'rgba(203,213,225,0.55)' : 'rgba(30,41,59,0.55)';
}

export function text(isDark: boolean): string {
  return isDark ? '#cbd5e1' : '#1e293b';
}

export function divider(isDark: boolean): string {
  return isDark ? 'rgba(120,140,170,0.25)' : 'rgba(100,115,140,0.25)';
}
