/**
 * Tween — 속성 보간 애니메이션
 *
 * 대상 객체의 숫자 속성을 시간에 따라 보간한다.
 * DisplayObject의 x, y, scaleX, scaleY, alpha 등을 애니메이션할 때 사용.
 */

import type { EasingFn } from './easing';
import { Easing } from './easing';

export interface TweenConfig<T> {
  target: T;
  props: Partial<{ [K in keyof T]: T[K] extends number ? number : never }>;
  duration: number;
  easing?: EasingFn;
  delay?: number;
  onComplete?: () => void;
}

export class Tween<T = Record<string, number>> {
  readonly target: T;
  readonly duration: number;

  private startValues = new Map<string, number>();
  private endValues = new Map<string, number>();
  private elapsed = 0;
  private readonly delay: number;
  private readonly easing: EasingFn;
  private readonly onCompleteCb?: () => void;
  private _completed = false;
  private initialized = false;

  constructor(config: TweenConfig<T>) {
    this.target = config.target;
    this.duration = config.duration;
    this.delay = config.delay ?? 0;
    this.easing = config.easing ?? Easing.easeInOutCubic;
    this.onCompleteCb = config.onComplete;

    for (const [key, value] of Object.entries(config.props)) {
      if (typeof value === 'number') {
        this.endValues.set(key, value);
      }
    }
  }

  get completed(): boolean {
    return this._completed;
  }

  /** dt(ms) 만큼 진행 */
  update(dt: number): void {
    if (this._completed) return;

    this.elapsed += dt;
    if (this.elapsed < this.delay) return;

    // 첫 업데이트 시 시작 값 캡처 (delay 이후)
    if (!this.initialized) {
      for (const key of this.endValues.keys()) {
        const current = (this.target as Record<string, number>)[key];
        this.startValues.set(key, typeof current === 'number' ? current : 0);
      }
      this.initialized = true;
    }

    const active = this.elapsed - this.delay;
    const progress = Math.min(active / this.duration, 1);
    const eased = this.easing(progress);

    for (const [key, start] of this.startValues) {
      const end = this.endValues.get(key)!;
      (this.target as Record<string, number>)[key] = start + (end - start) * eased;
    }

    if (progress >= 1) {
      this._completed = true;
      this.onCompleteCb?.();
    }
  }
}
