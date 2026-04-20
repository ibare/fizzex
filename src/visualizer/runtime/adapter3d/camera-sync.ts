/**
 * 구면좌표 카메라 상태 동기화 (설계 §12.1).
 *
 * camera.state.{theta,phi,distance}는 spec.state[]의 id. StateStore에서 현재
 * 값을 읽어 카메라 position·lookAt을 갱신한다.
 *
 * 좌표 변환:
 *   x = d * sin(phi) * cos(theta)
 *   y = d * cos(phi)                  // y-up
 *   z = d * sin(phi) * sin(theta)
 */

import type * as THREE from 'three';
import type { CameraSpec } from '../types/camera';
import type { StateStore } from '../state';
import type { RenderContext3D } from './render-context';
import { evalNumOr3D } from './render-context';

export function syncCamera(
  camera: THREE.PerspectiveCamera,
  spec: CameraSpec,
  store: StateStore,
  rc: RenderContext3D,
): void {
  if (spec.kind !== 'perspective') {
    const never: never = spec.kind;
    throw new Error(`adapter3d: unsupported camera kind ${never as string}`);
  }

  if (spec.fov !== undefined && camera.fov !== spec.fov) {
    camera.fov = spec.fov;
    camera.updateProjectionMatrix();
  }
  if (spec.near !== undefined) camera.near = spec.near;
  if (spec.far !== undefined) camera.far = spec.far;

  const snap = store.snapshot().state;
  const theta = readNumber(snap, spec.state.theta);
  const phi = readNumber(snap, spec.state.phi);
  const d = readNumber(snap, spec.state.distance);

  const target = spec.state.target
    ? ([
        evalNumOr3D(spec.state.target[0], rc),
        evalNumOr3D(spec.state.target[1], rc),
        evalNumOr3D(spec.state.target[2], rc),
      ] as const)
    : ([0, 0, 0] as const);

  const sinPhi = Math.sin(phi);
  camera.position.set(
    target[0] + d * sinPhi * Math.cos(theta),
    target[1] + d * Math.cos(phi),
    target[2] + d * sinPhi * Math.sin(theta),
  );
  camera.lookAt(target[0], target[1], target[2]);
}

function readNumber(state: Readonly<Record<string, unknown>>, id: string): number {
  const v = state[id];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new TypeError(`adapter3d: camera state "${id}" must be finite number, got ${typeof v}`);
  }
  return v;
}
