/**
 * 3D 카메라 스펙 (설계 §12.1).
 *
 * 최상위 `camera` 필드. renderer === '3d'일 때 필수. 초기 카메라 pose만 선언하고,
 * 이후 줌·회전·팬은 호스트(Graphics3D)의 OrbitControls가 관장한다. 즉 mount-3d는
 * 최초 1회만 `distance/theta/phi/lookAt`을 평가해 카메라를 배치하며, 이후 매 프레임
 * 덮어쓰지 않는다.
 *
 * 구면좌표 규약:
 *   x = distance * sin(phi) * cos(theta)
 *   y = distance * cos(phi)
 *   z = distance * sin(phi) * sin(theta)
 * (y-up, theta는 수평각, phi는 수직각; 둘 다 radian)
 */

import type { ExprString } from './expr';

export interface CameraControlsSpec {
  /** 자동 회전 여부 (OrbitControls.autoRotate). */
  autoRotate?: boolean;
  /** 자동 회전 속도 (rad/frame * ≈2π/60 기본 스케일, OrbitControls 기준). */
  autoRotateSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  enableZoom?: boolean;
  enableRotate?: boolean;
  enablePan?: boolean;
  /** 관성 계수. 0~1, 기본 0.08. */
  dampingFactor?: number;
}

export interface PerspectiveCameraSpec {
  kind: 'perspective';
  fov?: number;
  near?: number;
  far?: number;
  /** 초기 반경 (원점 기준). */
  distance: ExprString | number;
  /** 초기 수평각 (rad). */
  theta: ExprString | number;
  /** 초기 수직각 (rad). */
  phi: ExprString | number;
  /** 카메라가 바라보는 목표점. 기본 [0,0,0]. */
  lookAt?: readonly [ExprString | number, ExprString | number, ExprString | number];
  /** OrbitControls 옵션. */
  controls?: CameraControlsSpec;
}

export type CameraSpec = PerspectiveCameraSpec;

export type CameraKind = CameraSpec['kind'];
