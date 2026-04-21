import { createVisualizerRegistry } from 'fizzex';

/**
 * 웹사이트 전역에서 공유하는 VisualizerRegistry 싱글턴.
 *
 * manifest/spec 캐시를 공유하므로 같은 visualizer 를 여러 페이지에서 열어도
 * 네트워크 요청은 한 번만 발생한다.
 *
 * Vite plugin(`vite.plugin.visualizers.ts`)이 `${BASE_URL}visualizers/` 경로에
 * 레포 루트의 `registries/default/` 를 서빙한다.
 */
export const visualizerRegistry = createVisualizerRegistry({
  baseUrl: import.meta.env.BASE_URL + 'visualizers/',
});
