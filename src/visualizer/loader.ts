/**
 * Visualizer 런타임 로딩
 *
 * 빌트인 Visualizer는 dynamic import로 코드 스플리팅.
 * 로드된 Visualizer는 캐시하고 레지스트리에 등록.
 */

import type { FizzexVisualizer } from './types';
import { registerVisualizer, getVisualizer } from './registry';
import { getCatalogIndex } from '../analyzer/semantic/loader';

/** 빌트인 Visualizer 로더 매핑 */
const BUILT_IN_LOADERS: Record<string, () => Promise<{ default: FizzexVisualizer }>> = {
  'kepler-orbit': () => import(
    /* webpackChunkName: "viz-kepler-orbit" */
    './built-in/kepler-orbit'
  ),
};

/** Visualizer를 ID로 로드 (비동기) */
export async function loadVisualizer(id: string): Promise<FizzexVisualizer | null> {
  // 1. 이미 로드되어 있으면 캐시에서 반환
  const cached = getVisualizer(id);
  if (cached) return cached;

  // 2. 빌트인이면 dynamic import
  const loader = BUILT_IN_LOADERS[id];
  if (loader) {
    const mod = await loader();
    registerVisualizer(mod.default);
    return mod.default;
  }

  // 3. 없으면 null
  return null;
}

/** 카탈로그 ID에서 visualizerId를 찾아 로드 */
export async function getVisualizerForCatalog(
  catalogId: string,
): Promise<FizzexVisualizer | null> {
  const entries = getCatalogIndex();
  const entry = entries.find((e) => e.id === catalogId);
  if (!entry?.visualizerId) return null;
  return loadVisualizer(entry.visualizerId);
}
