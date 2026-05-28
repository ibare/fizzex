/**
 * Graphics Host 모듈 배럴.
 *
 * 2D 전용 Visualizer는 이 배럴이 아닌 `./Graphics2D` 직접 경로로 import해야
 * Three.js 번들이 딸려오지 않는다. 이 배럴은 2D/3D 모두 가져가도 되는 소비처
 * (Explorer 등 상위 프레임워크)에서 쓴다.
 */

export { Graphics2D } from './Graphics2D.js';
export type { Graphics2DOptions } from './Graphics2D.js';

export { Graphics3D } from './Graphics3D.js';
export type {
  Graphics3DOptions,
  Graphics3DContext,
  Graphics3DCameraOptions,
  Graphics3DRendererOptions,
} from './Graphics3D.js';

export * as theme from './theme.js';
export * from './viewport/index.js';
export * from './draw.js';
export * from './curves.js';

export type { Theme, FrameInfo, Viewport2D } from './types.js';
