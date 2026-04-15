/**
 * DisplayObject — 씬 그래프 기본 단위
 *
 * 위치, 스케일, 회전, 투명도 등 애니메이션 가능한 속성을 가진
 * 렌더링 단위. 모든 씬 요소의 기반 클래스.
 */

import type { SceneSurface } from './scene-surface';

export abstract class DisplayObject {
  x = 0;
  y = 0;
  scaleX = 1;
  scaleY = 1;
  rotation = 0;
  alpha = 1;
  visible = true;
  pivotX = 0;
  pivotY = 0;

  /**
   * 로컬 변환을 적용하고 draw()를 호출한다.
   * 부모의 alpha를 곱하여 계층적 투명도를 지원.
   */
  renderWith(surface: SceneSurface, parentAlpha: number): void {
    if (!this.visible || this.alpha <= 0) return;

    const combinedAlpha = parentAlpha * this.alpha;

    surface.save();

    // 위치 이동
    surface.translate(this.x, this.y);

    // 회전 (pivot 중심)
    if (this.rotation !== 0) {
      surface.translate(this.pivotX, this.pivotY);
      const cos = Math.cos(this.rotation);
      const sin = Math.sin(this.rotation);
      surface.transform(cos, sin, -sin, cos, 0, 0);
      surface.translate(-this.pivotX, -this.pivotY);
    }

    // 스케일
    if (this.scaleX !== 1 || this.scaleY !== 1) {
      surface.scale(this.scaleX, this.scaleY);
    }

    // 투명도
    surface.setGlobalAlpha(combinedAlpha);

    this.draw(surface);

    surface.restore();
  }

  /** 서브클래스가 구현 — 로컬 좌표계에서 그리기 */
  protected abstract draw(surface: SceneSurface): void;
}

/**
 * CustomShape — 함수를 DisplayObject로 래핑하는 어댑터
 *
 * 프리미티브 함수를 씬 그래프에 편입시킬 때 사용.
 */
export class CustomShape extends DisplayObject {
  constructor(private drawFn: (surface: SceneSurface) => void) {
    super();
  }

  protected draw(surface: SceneSurface): void {
    this.drawFn(surface);
  }
}
