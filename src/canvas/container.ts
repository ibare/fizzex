/**
 * Container — 자식을 관리하는 DisplayObject
 *
 * 씬 그래프의 그룹 노드. 자식을 추가/제거하고,
 * draw() 시 자식들을 순서대로 렌더링한다.
 */

import { DisplayObject } from './display-object.js';
import type { SceneSurface } from './scene-surface.js';

export class Container extends DisplayObject {
  readonly children: DisplayObject[] = [];

  addChild(child: DisplayObject): void {
    this.children.push(child);
  }

  removeChild(child: DisplayObject): void {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
    }
  }

  removeAllChildren(): void {
    this.children.length = 0;
  }

  protected draw(surface: SceneSurface): void {
    for (const child of this.children) {
      child.renderWith(surface, this.alpha);
    }
  }
}
