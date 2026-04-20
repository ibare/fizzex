/**
 * THREE.Scene 자식 전체 dispose.
 *
 * adapter3d는 매 프레임 scene을 비우고 재구축한다 (D2). 이때 geometry와
 * material을 명시적으로 dispose하지 않으면 GPU 메모리가 누적된다.
 */

import type { Object3D } from 'three';

export function disposeChildren(root: Object3D): void {
  for (let i = root.children.length - 1; i >= 0; i -= 1) {
    const child = root.children[i];
    disposeSubtree(child);
    root.remove(child);
  }
}

function disposeSubtree(obj: Object3D): void {
  obj.traverse((o) => {
    const anyObj = o as { geometry?: { dispose?: () => void }; material?: unknown };
    if (anyObj.geometry?.dispose) anyObj.geometry.dispose();
    const mat = anyObj.material;
    if (!mat) return;
    if (Array.isArray(mat)) {
      for (const m of mat) disposeMaterial(m);
    } else {
      disposeMaterial(mat);
    }
  });
}

function disposeMaterial(mat: unknown): void {
  if (mat && typeof mat === 'object' && 'dispose' in mat) {
    const d = (mat as { dispose?: () => void }).dispose;
    if (typeof d === 'function') d.call(mat);
  }
}
