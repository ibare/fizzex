/**
 * Visualizer 런타임 로딩
 *
 * 빌트인 Visualizer는 dynamic import로 코드 스플리팅된다.
 * 같은 수식에 대해 서로 다른 Visualizer(2D/3D 등)가 등록될 수 있으며,
 * 각 Visualizer는 독립 청크로 분리되어 사용자가 실제로 연 것만 로드된다.
 */

import type { FizzexVisualizer } from './types';
import type { VisualizerRef } from '../analyzer/semantic/types';
import { registerVisualizer, getVisualizer } from './registry';
import { getVisualizersForCatalog } from '../analyzer/semantic/loader';

/** 빌트인 Visualizer 로더 매핑 */
const BUILT_IN_LOADERS: Record<string, () => Promise<{ default: FizzexVisualizer }>> = {
  'kepler-orbit-2d': () => import(
    /* webpackChunkName: "viz-kepler-orbit-2d" */
    './built-in/kepler-orbit-2d'
  ),
  'kepler-orbit-3d': () => import(
    /* webpackChunkName: "viz-kepler-orbit-3d" */
    './built-in/kepler-orbit-3d'
  ),
  'pythagorean-2d': () => import(
    /* webpackChunkName: "viz-pythagorean-2d" */
    './built-in/pythagorean-2d'
  ),
  'freefall-2d': () => import(
    /* webpackChunkName: "viz-freefall-2d" */
    './built-in/freefall-2d'
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

/**
 * 카탈로그 ID에서 연결된 Visualizer 참조 목록을 얻는다.
 * 로딩은 참조별 사용자 조작 시점까지 지연된다 (모두 미리 import하지 않음).
 */
export function getVisualizersForCatalogId(catalogId: string): VisualizerRef[] {
  return getVisualizersForCatalog(catalogId);
}
