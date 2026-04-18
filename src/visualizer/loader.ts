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
  'kepler-orbit-iss-2d': () => import(
    /* webpackChunkName: "viz-kepler-orbit-iss-2d" */
    './built-in/kepler-orbit-iss-2d'
  ),
  'kepler-orbit-gps-2d': () => import(
    /* webpackChunkName: "viz-kepler-orbit-gps-2d" */
    './built-in/kepler-orbit-gps-2d'
  ),
  'kepler-orbit-geo-2d': () => import(
    /* webpackChunkName: "viz-kepler-orbit-geo-2d" */
    './built-in/kepler-orbit-geo-2d'
  ),
  'kepler-orbit-moon-2d': () => import(
    /* webpackChunkName: "viz-kepler-orbit-moon-2d" */
    './built-in/kepler-orbit-moon-2d'
  ),
  'kepler-orbit-iss-3d': () => import(
    /* webpackChunkName: "viz-kepler-orbit-iss-3d" */
    './built-in/kepler-orbit-iss-3d'
  ),
  'kepler-orbit-gps-3d': () => import(
    /* webpackChunkName: "viz-kepler-orbit-gps-3d" */
    './built-in/kepler-orbit-gps-3d'
  ),
  'kepler-orbit-geo-3d': () => import(
    /* webpackChunkName: "viz-kepler-orbit-geo-3d" */
    './built-in/kepler-orbit-geo-3d'
  ),
  'kepler-orbit-moon-3d': () => import(
    /* webpackChunkName: "viz-kepler-orbit-moon-3d" */
    './built-in/kepler-orbit-moon-3d'
  ),
  'pythagorean-explore-2d': () => import(
    /* webpackChunkName: "viz-pythagorean-explore-2d" */
    './built-in/pythagorean-explore-2d'
  ),
  'pythagorean-ladder-2d': () => import(
    /* webpackChunkName: "viz-pythagorean-ladder-2d" */
    './built-in/pythagorean-ladder-2d'
  ),
  'pythagorean-tv-2d': () => import(
    /* webpackChunkName: "viz-pythagorean-tv-2d" */
    './built-in/pythagorean-tv-2d'
  ),
  'pythagorean-shortcut-2d': () => import(
    /* webpackChunkName: "viz-pythagorean-shortcut-2d" */
    './built-in/pythagorean-shortcut-2d'
  ),
  'freefall-earth-2d': () => import(
    /* webpackChunkName: "viz-freefall-earth-2d" */
    './built-in/freefall-earth-2d'
  ),
  'freefall-moon-2d': () => import(
    /* webpackChunkName: "viz-freefall-moon-2d" */
    './built-in/freefall-moon-2d'
  ),
  'freefall-mars-2d': () => import(
    /* webpackChunkName: "viz-freefall-mars-2d" */
    './built-in/freefall-mars-2d'
  ),
  'freefall-jupiter-2d': () => import(
    /* webpackChunkName: "viz-freefall-jupiter-2d" */
    './built-in/freefall-jupiter-2d'
  ),
  'sine-wave-speaker-2d': () => import(
    /* webpackChunkName: "viz-sine-wave-speaker-2d" */
    './built-in/sine-wave-speaker-2d'
  ),
  'sine-wave-voltmeter-2d': () => import(
    /* webpackChunkName: "viz-sine-wave-voltmeter-2d" */
    './built-in/sine-wave-voltmeter-2d'
  ),
  'sine-wave-tide-2d': () => import(
    /* webpackChunkName: "viz-sine-wave-tide-2d" */
    './built-in/sine-wave-tide-2d'
  ),
  'sine-wave-pendulum-2d': () => import(
    /* webpackChunkName: "viz-sine-wave-pendulum-2d" */
    './built-in/sine-wave-pendulum-2d'
  ),
  'quadratic-sandbox-2d': () => import(
    /* webpackChunkName: "viz-quadratic-sandbox-2d" */
    './built-in/quadratic-sandbox-2d'
  ),
  'quadratic-bridge-2d': () => import(
    /* webpackChunkName: "viz-quadratic-bridge-2d" */
    './built-in/quadratic-bridge-2d'
  ),
  'quadratic-basketball-2d': () => import(
    /* webpackChunkName: "viz-quadratic-basketball-2d" */
    './built-in/quadratic-basketball-2d'
  ),
  'quadratic-fountain-2d': () => import(
    /* webpackChunkName: "viz-quadratic-fountain-2d" */
    './built-in/quadratic-fountain-2d'
  ),
  'exponential-decay-caffeine-2d': () => import(
    /* webpackChunkName: "viz-exponential-decay-caffeine-2d" */
    './built-in/exponential-decay-caffeine-2d'
  ),
  'exponential-decay-carbon14-2d': () => import(
    /* webpackChunkName: "viz-exponential-decay-carbon14-2d" */
    './built-in/exponential-decay-carbon14-2d'
  ),
  'exponential-decay-drug-2d': () => import(
    /* webpackChunkName: "viz-exponential-decay-drug-2d" */
    './built-in/exponential-decay-drug-2d'
  ),
  'exponential-decay-battery-2d': () => import(
    /* webpackChunkName: "viz-exponential-decay-battery-2d" */
    './built-in/exponential-decay-battery-2d'
  ),
  'compound-interest-savings-2d': () => import(
    /* webpackChunkName: "viz-compound-interest-savings-2d" */
    './built-in/compound-interest-savings-2d'
  ),
  'compound-interest-stock-2d': () => import(
    /* webpackChunkName: "viz-compound-interest-stock-2d" */
    './built-in/compound-interest-stock-2d'
  ),
  'compound-interest-deposit-2d': () => import(
    /* webpackChunkName: "viz-compound-interest-deposit-2d" */
    './built-in/compound-interest-deposit-2d'
  ),
  'compound-interest-inflation-2d': () => import(
    /* webpackChunkName: "viz-compound-interest-inflation-2d" */
    './built-in/compound-interest-inflation-2d'
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
