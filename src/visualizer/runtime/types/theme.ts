import type { ExprString } from './expr.js';

/**
 * 테마 팔레트 오버라이드 (설계 §7.3). 호스트 기본 팔레트를 부분 대체.
 */
export interface ThemeSpec {
  brand?: ExprString;
  background?: ExprString;
  gridLine?: ExprString;
  axis?: ExprString;
  text?: ExprString;
  divider?: ExprString;
}
