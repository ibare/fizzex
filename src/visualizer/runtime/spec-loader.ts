/**
 * 빌트인 Visualizer 스펙 로더.
 *
 * visualizerId → `built-in/<id>/spec.json` dynamic import 매핑.
 * 반환 타입은 `unknown` — 이후 `compileSpec(raw)`의 zod 검증이 유일한 타입 관문이다.
 * 번들러(Vite/tsc)의 정적 분석과 호환되도록 엔트리를 명시적으로 나열한다.
 */

type SpecModule = { default: unknown };

const SPEC_LOADERS: Record<string, () => Promise<SpecModule>> = {
  'sine-wave-2d': () => import('../built-in/sine-wave-2d/spec.json'),
  'kepler-orbit-2d': () => import('../built-in/kepler-orbit-2d/spec.json'),
  'kepler-orbit-3d': () => import('../built-in/kepler-orbit-3d/spec.json'),
  'freefall-2d': () => import('../built-in/freefall-2d/spec.json'),
  'exponential-decay-2d': () => import('../built-in/exponential-decay-2d/spec.json'),
  'compound-interest-2d': () => import('../built-in/compound-interest-2d/spec.json'),
  'pythagorean-explore-2d': () => import('../built-in/pythagorean-explore-2d/spec.json'),
  'pythagorean-ladder-2d': () => import('../built-in/pythagorean-ladder-2d/spec.json'),
  'pythagorean-shortcut-2d': () => import('../built-in/pythagorean-shortcut-2d/spec.json'),
  'pythagorean-tv-2d': () => import('../built-in/pythagorean-tv-2d/spec.json'),
  'quadratic-basketball-2d': () => import('../built-in/quadratic-basketball-2d/spec.json'),
  'quadratic-bridge-2d': () => import('../built-in/quadratic-bridge-2d/spec.json'),
  'quadratic-fountain-2d': () => import('../built-in/quadratic-fountain-2d/spec.json'),
  'quadratic-sandbox-2d': () => import('../built-in/quadratic-sandbox-2d/spec.json'),
};

export function hasBuiltInSpec(id: string): boolean {
  return id in SPEC_LOADERS;
}

export async function loadVisualizerSpec(id: string): Promise<unknown> {
  const loader = SPEC_LOADERS[id];
  if (!loader) throw new Error(`loadVisualizerSpec: unknown visualizer id "${id}"`);
  const mod = await loader();
  return mod.default;
}

export function listBuiltInVisualizerIds(): string[] {
  return Object.keys(SPEC_LOADERS);
}
