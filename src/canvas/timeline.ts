/**
 * Timeline — Tween 조합 시스템
 *
 * 여러 Tween을 시퀀스(then) 또는 병렬(with)로 조합하여
 * 복합 애니메이션을 구성한다.
 */

import { Tween } from './tween';
import type { TweenConfig } from './tween';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TimelineEntry {
  tween: Tween<any>;
  startTime: number;
}

export class Timeline {
  private entries: TimelineEntry[] = [];
  private elapsed = 0;
  private _completed = false;
  private cursor = 0;

  get completed(): boolean {
    return this._completed;
  }

  /** 전체 Timeline 길이 (ms) */
  get duration(): number {
    let max = 0;
    for (const entry of this.entries) {
      const end = entry.startTime + entry.tween.duration;
      if (end > max) max = end;
    }
    return max;
  }

  /**
   * 순차 추가 — 이전 Tween이 끝나는 시점에 시작
   */
  then<T>(config: TweenConfig<T>): this {
    const tween = new Tween(config);
    this.entries.push({ tween, startTime: this.cursor });
    this.cursor += (config.delay ?? 0) + config.duration;
    return this;
  }

  /**
   * 병렬 추가 — 마지막 then()과 동시에 시작
   */
  with<T>(config: TweenConfig<T>): this {
    const lastStart = this.entries.length > 0
      ? this.entries[this.entries.length - 1].startTime
      : 0;
    const tween = new Tween(config);
    this.entries.push({ tween, startTime: lastStart });

    const end = lastStart + (config.delay ?? 0) + config.duration;
    if (end > this.cursor) {
      this.cursor = end;
    }
    return this;
  }

  /**
   * 절대 시점에 추가
   */
  at<T>(time: number, config: TweenConfig<T>): this {
    const tween = new Tween(config);
    this.entries.push({ tween, startTime: time });

    const end = time + (config.delay ?? 0) + config.duration;
    if (end > this.cursor) {
      this.cursor = end;
    }
    return this;
  }

  /** dt(ms) 만큼 진행 */
  update(dt: number): void {
    if (this._completed) return;

    this.elapsed += dt;
    let allDone = true;

    for (const entry of this.entries) {
      if (entry.tween.completed) continue;

      const localTime = this.elapsed - entry.startTime;
      if (localTime <= 0) {
        allDone = false;
        continue;
      }

      // Tween에는 누적 dt를 전달하되, 이전 프레임에서의 localTime을 빼서
      // 이번 프레임의 dt만큼만 진행시킨다.
      const prevLocal = this.elapsed - dt - entry.startTime;
      const tweenDt = prevLocal < 0 ? localTime : dt;
      entry.tween.update(tweenDt);

      if (!entry.tween.completed) {
        allDone = false;
      }
    }

    if (allDone && this.entries.length > 0) {
      this._completed = true;
    }
  }

  /** 처음부터 다시 시작 */
  reset(): void {
    this.elapsed = 0;
    this._completed = false;
    // Tween은 재생성이 필요하므로, reset은 Timeline의 elapsed만 초기화
    // 실제 사용에서는 새 Timeline을 만드는 것을 권장
  }
}
