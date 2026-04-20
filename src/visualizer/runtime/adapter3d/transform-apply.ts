/**
 * 3D Transform 적용 (설계 §12.4).
 *
 * 2D adapter의 `TransformSpec` 구조를 3D에서도 재사용한다 (translate + rotate + scale).
 * - translate: 2D는 [x,y], 3D는 x/y만 사용 (z는 그대로). 3D 고유 transform은 향후 확장.
 * - rotate: 단일 스칼라 → Z축 회전으로 해석 (2D 호환).
 * - scale: 스칼라 또는 [x,y] → [x,y,1].
 *
 * 완전한 3D transform(translate3D, rotate3D with axis, scale3D)은 §12.4 전용
 * 스키마 확장이 필요. MVP에서는 2D 호환 경로만 제공한다.
 */

import type { Object3D } from 'three';
import type { TransformSpec } from '../types/style';
import type { RenderContext3D } from './render-context';
import { evalNumOr3D } from './render-context';

export function applyTransform3D(
  obj: Object3D,
  transform: TransformSpec | undefined,
  rc: RenderContext3D,
): void {
  if (!transform) return;
  if (transform.translate) {
    const tx = evalNumOr3D(transform.translate[0], rc);
    const ty = evalNumOr3D(transform.translate[1], rc);
    obj.position.x += tx;
    obj.position.y += ty;
  }
  if (transform.rotate !== undefined) {
    const rz = evalNumOr3D(transform.rotate, rc);
    obj.rotation.z += rz;
  }
  if (transform.scale !== undefined) {
    if (Array.isArray(transform.scale)) {
      obj.scale.x *= evalNumOr3D(transform.scale[0], rc);
      obj.scale.y *= evalNumOr3D(transform.scale[1], rc);
    } else {
      const s = evalNumOr3D(transform.scale, rc);
      obj.scale.multiplyScalar(s);
    }
  }
}
