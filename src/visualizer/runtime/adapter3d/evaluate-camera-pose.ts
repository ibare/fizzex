/**
 * 초기 카메라 pose 평가 (설계 §12.1).
 *
 * mount-3d가 setup 단계에서 1회 호출. spec의 구면좌표(distance/theta/phi)와
 * lookAt을 평가해 직교 좌표로 변환한 뒤 호스트(Graphics3D)의 camera.position과
 * controls.target에 세팅한다. 이후 프레임에선 카메라를 덮어쓰지 않는다
 * (OrbitControls가 관장).
 *
 * 좌표 규약 (y-up):
 *   x = target.x + distance * sin(phi) * cos(theta)
 *   y = target.y + distance * cos(phi)
 *   z = target.z + distance * sin(phi) * sin(theta)
 */

import type { CameraSpec } from '../types/camera.js';
import type { RenderContext3D } from './render-context.js';
import { evalNumOr3D } from './render-context.js';

export interface CameraPose {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
}

export function evaluateInitialCameraPose(spec: CameraSpec, rc: RenderContext3D): CameraPose {
  if (spec.kind !== 'perspective') {
    const never: never = spec.kind;
    throw new Error(`adapter3d: unsupported camera kind ${never as string}`);
  }

  const distance = evalNumOr3D(spec.distance, rc);
  const theta = evalNumOr3D(spec.theta, rc);
  const phi = evalNumOr3D(spec.phi, rc);

  const target: readonly [number, number, number] = spec.lookAt
    ? [
        evalNumOr3D(spec.lookAt[0], rc),
        evalNumOr3D(spec.lookAt[1], rc),
        evalNumOr3D(spec.lookAt[2], rc),
      ]
    : [0, 0, 0];

  const sinPhi = Math.sin(phi);
  const position: readonly [number, number, number] = [
    target[0] + distance * sinPhi * Math.cos(theta),
    target[1] + distance * Math.cos(phi),
    target[2] + distance * sinPhi * Math.sin(theta),
  ];

  return { position, target };
}
