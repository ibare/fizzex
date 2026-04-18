/**
 * Graphics Host 공통 타입.
 *
 * Canvas 2D·Three.js 3D 두 호스트가 공유하는 소형 원시 타입만 모은다.
 * Visualizer 쪽 타입(FizzexVisualizer 등)과는 독립.
 */

export type Theme = 'light' | 'dark';

/**
 * rAF 프레임 한 틱의 정보.
 * dt: 초. now: ms(performance.now 기준). width/height: 논리 픽셀(CSS 픽셀).
 * Visualizer는 width/height로 좌표 매핑을 구성한다.
 */
export interface FrameInfo {
  dt: number;
  now: number;
  width: number;
  height: number;
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
