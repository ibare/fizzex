/**
 * Graphics Host 공통 타입.
 *
 * Canvas 2D·Three.js 3D 두 호스트가 공유하는 소형 원시 타입만 모은다.
 * Visualizer 런타임(VisualizerSpec 등)과는 독립.
 */

export type Theme = 'light' | 'dark';

/**
 * rAF 프레임 한 틱의 정보.
 *
 * dt: 이번 틱 경과 초.
 * now: ms(performance.now 기준).
 * elapsed: 호스트 시작 이후 누적 초 — Visualizer가 애니메이션용으로 자기 타이머를 유지하지 않도록 제공.
 * width/height: 논리 픽셀(CSS 픽셀).
 * isDark: 현재 테마가 dark인지 — `theme === 'dark'` 재계산을 막기 위한 캐시.
 */
export interface FrameInfo {
  dt: number;
  now: number;
  elapsed: number;
  width: number;
  height: number;
  isDark: boolean;
}

/**
 * 월드 좌표 ↔ 스크린 좌표 매핑 계약.
 * TimeValueViewport·BBoxViewport가 이 계약을 따른다.
 * PolarViewport는 입력 시그니처가 radius·angle이라 별도 타입.
 */
export interface Viewport2D {
  toScreen(wx: number, wy: number): { x: number; y: number };
  toWorld(sx: number, sy: number): { x: number; y: number };
}
