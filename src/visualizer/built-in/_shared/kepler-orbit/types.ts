/**
 * 케플러 궤도 공용 타입.
 */

/** 별 배경을 이루는 점 하나 */
export interface Star {
  /** 0..1 정규화 x */
  x: number;
  /** 0..1 정규화 y */
  y: number;
  /** px 크기 */
  size: number;
  /** 0..1 밝기 */
  brightness: number;
}
