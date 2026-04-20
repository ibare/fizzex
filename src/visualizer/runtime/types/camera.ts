/**
 * 3D 카메라 스펙 (설계 §12.1).
 *
 * 최상위 `camera` 필드. renderer === '3d' 일 때 필수.
 * 현재는 perspective + 구면좌표 state만 지원. orthographic·cinematic 경로는
 * 필요 시 확장한다.
 *
 * state.{theta,phi,distance}는 spec.state[]에 선언된 id여야 한다 (validator는
 * 구조만 검증하고 id 존재 여부는 mount-3d에서 확인).
 */

import type { ExprString } from './expr';

export interface CameraStateRefs {
  /** 수평각 state id (rad) */
  theta: string;
  /** 수직각 state id (rad) */
  phi: string;
  /** 반경 state id */
  distance: string;
  /** 타겟 좌표. 기본 [0,0,0]. ExprString 또는 number 허용. */
  target?: readonly [ExprString | number, ExprString | number, ExprString | number];
}

export interface PerspectiveCameraSpec {
  kind: 'perspective';
  fov?: number;
  near?: number;
  far?: number;
  state: CameraStateRefs;
}

export type CameraSpec = PerspectiveCameraSpec;

export type CameraKind = CameraSpec['kind'];
