/**
 * Visualizer Registry — 호스트 주입형 spec 로더.
 *
 * `baseUrl`을 기준으로 `manifest.json`을 fetch하고, id → spec URL을 해석해
 * spec JSON을 가져온다. Fizzex 자체는 default CDN을 운영하지 않으며,
 * 호스트(학습 플랫폼)가 registry 자산을 배포·주입한다.
 *
 * 의사코드:
 *   const registry = createVisualizerRegistry({ baseUrl: 'https://cdn/.../default/' });
 *   const raw = await registry.load('sine-wave-2d', { signal });
 *
 * 캐시:
 * - manifest는 인스턴스당 한 번만 fetch (inflight promise 공유)
 * - spec은 id별로 한 번만 fetch (같은 id 연속 요청 시 inflight 공유)
 *
 * 실패 시 throw — 호스트가 fallback·재시도 정책을 결정.
 */
export interface VisualizerRegistryManifestEntry {
  readonly spec: string;
  readonly renderer: '2d' | '3d';
}

export interface VisualizerRegistryManifest {
  readonly version: string;
  readonly visualizers: Readonly<Record<string, VisualizerRegistryManifestEntry>>;
}

export interface VisualizerRegistryOptions {
  /** Registry 루트 URL. 끝에 '/' 권장. 상대 경로(`spec`)는 이 URL 기준으로 해석. */
  readonly baseUrl: string;
  /**
   * fetch 구현 주입. 기본값은 전역 `fetch`.
   * 테스트에서 로컬 파일시스템/모의 응답을 주입할 때 사용.
   */
  readonly fetch?: typeof fetch;
  /** manifest 파일 이름. 기본 `manifest.json`. */
  readonly manifestFileName?: string;
}

export interface VisualizerRegistryLoadOptions {
  readonly signal?: AbortSignal;
}

export interface VisualizerRegistry {
  /** Manifest에서 id 엔트리를 해석 (필요 시 manifest를 fetch·캐시). */
  resolve(id: string, opts?: VisualizerRegistryLoadOptions): Promise<VisualizerRegistryManifestEntry>;
  /** spec 원본 JSON을 가져온다. 이후 `compileSpec`에 넘길 값. */
  load(id: string, opts?: VisualizerRegistryLoadOptions): Promise<unknown>;
  /** 모든 엔트리 열람 — 호스트 측 도구가 registry 자산 카탈로그를 살펴볼 때. */
  listIds(opts?: VisualizerRegistryLoadOptions): Promise<readonly string[]>;
}

export function createVisualizerRegistry(opts: VisualizerRegistryOptions): VisualizerRegistry {
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('createVisualizerRegistry: fetch is not available. Provide opts.fetch explicitly.');
  }
  const baseUrl = opts.baseUrl.endsWith('/') ? opts.baseUrl : `${opts.baseUrl}/`;
  const manifestFileName = opts.manifestFileName ?? 'manifest.json';

  let manifestPromise: Promise<VisualizerRegistryManifest> | null = null;
  const specPromises = new Map<string, Promise<unknown>>();

  async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
    const res = await fetchImpl(url, signal ? { signal } : undefined);
    if (!res.ok) {
      throw new Error(`registry: fetch failed ${res.status} ${url}`);
    }
    return res.json();
  }

  async function loadManifest(signal?: AbortSignal): Promise<VisualizerRegistryManifest> {
    if (!manifestPromise) {
      manifestPromise = fetchJson(baseUrl + manifestFileName, signal).then((raw) => {
        if (!isManifest(raw)) {
          throw new Error('registry: manifest.json shape invalid');
        }
        return raw;
      });
    }
    try {
      return await manifestPromise;
    } catch (err) {
      manifestPromise = null;
      throw err;
    }
  }

  async function resolve(
    id: string,
    loadOpts?: VisualizerRegistryLoadOptions,
  ): Promise<VisualizerRegistryManifestEntry> {
    const manifest = await loadManifest(loadOpts?.signal);
    const entry = manifest.visualizers[id];
    if (!entry) {
      throw new Error(`registry: unknown visualizer id "${id}"`);
    }
    return entry;
  }

  async function load(id: string, loadOpts?: VisualizerRegistryLoadOptions): Promise<unknown> {
    const existing = specPromises.get(id);
    if (existing) return existing;

    const pending = (async () => {
      const entry = await resolve(id, loadOpts);
      return fetchJson(baseUrl + entry.spec, loadOpts?.signal);
    })().catch((err) => {
      specPromises.delete(id);
      throw err;
    });

    specPromises.set(id, pending);
    return pending;
  }

  async function listIds(loadOpts?: VisualizerRegistryLoadOptions): Promise<readonly string[]> {
    const manifest = await loadManifest(loadOpts?.signal);
    return Object.keys(manifest.visualizers);
  }

  return { resolve, load, listIds };
}

function isManifest(raw: unknown): raw is VisualizerRegistryManifest {
  if (!raw || typeof raw !== 'object') return false;
  const m = raw as Record<string, unknown>;
  if (typeof m.version !== 'string') return false;
  if (!m.visualizers || typeof m.visualizers !== 'object') return false;
  for (const v of Object.values(m.visualizers as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') return false;
    const e = v as Record<string, unknown>;
    if (typeof e.spec !== 'string') return false;
    if (e.renderer !== '2d' && e.renderer !== '3d') return false;
  }
  return true;
}
