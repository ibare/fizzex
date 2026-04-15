/**
 * Visualizer 레지스트리 — 등록/조회
 */

import type { FizzexVisualizer } from './types';

const registry = new Map<string, FizzexVisualizer>();

/** Visualizer를 레지스트리에 등록 */
export function registerVisualizer(visualizer: FizzexVisualizer): void {
  registry.set(visualizer.id, visualizer);
}

/** ID로 등록된 Visualizer 조회 (동기 — 이미 로드된 것) */
export function getVisualizer(id: string): FizzexVisualizer | null {
  return registry.get(id) ?? null;
}

/** 등록된 모든 Visualizer ID 목록 */
export function getAllVisualizerIds(): string[] {
  return Array.from(registry.keys());
}
