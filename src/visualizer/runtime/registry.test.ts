/**
 * registry 계약 테스트.
 *
 * 1. `createVisualizerRegistry`의 manifest/spec fetch·캐시·에러 처리
 * 2. `registries/default/manifest.json`과 실제 spec 파일들의 정합성:
 *    - manifest에 선언된 모든 id가 spec 파일을 갖고
 *    - spec 파일이 compileSpec을 통과하며 id/renderer가 manifest와 일치
 */

import { describe, it, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';
import { createVisualizerRegistry, type VisualizerRegistryManifest } from './registry.js';
import { compileSpec } from './compile.js';

const here = dirname(fileURLToPath(import.meta.url));
const defaultRegistryDir = resolvePath(here, '../../../registries/default');

async function readJson(path: string): Promise<unknown> {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

function makeFsFetch(rootDir: string): typeof fetch {
  return async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const u = new URL(url);
    if (u.protocol !== 'fizzex-test:') {
      throw new Error(`test fetch: unexpected protocol ${u.protocol}`);
    }
    const rel = u.pathname.replace(/^\//, '');
    const path = resolvePath(rootDir, rel);
    try {
      const body = await readFile(path, 'utf8');
      return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
    } catch {
      return new Response('not found', { status: 404 });
    }
  };
}

describe('createVisualizerRegistry', () => {
  it('manifest + spec fetch 성공 경로', async () => {
    const registry = createVisualizerRegistry({
      baseUrl: 'fizzex-test:///',
      fetch: makeFsFetch(defaultRegistryDir),
    });
    const raw = await registry.load('sine-wave-2d');
    const compiled = compileSpec(raw);
    expect(compiled.spec.id).toBe('sine-wave-2d');
  });

  it('알 수 없는 id → throw', async () => {
    const registry = createVisualizerRegistry({
      baseUrl: 'fizzex-test:///',
      fetch: makeFsFetch(defaultRegistryDir),
    });
    await expect(registry.load('does-not-exist')).rejects.toThrow(/unknown visualizer id/);
  });

  it('manifest는 한 번만 fetch (캐시됨)', async () => {
    const baseFetch = makeFsFetch(defaultRegistryDir);
    const spy = vi.fn(baseFetch);
    const registry = createVisualizerRegistry({
      baseUrl: 'fizzex-test:///',
      fetch: spy,
    });
    await registry.load('sine-wave-2d');
    await registry.load('kepler-orbit-2d');
    const manifestCalls = spy.mock.calls.filter((c) => String(c[0]).endsWith('manifest.json'));
    expect(manifestCalls.length).toBe(1);
  });

  it('같은 id 중복 load는 spec fetch가 한 번만 발생', async () => {
    const baseFetch = makeFsFetch(defaultRegistryDir);
    const spy = vi.fn(baseFetch);
    const registry = createVisualizerRegistry({
      baseUrl: 'fizzex-test:///',
      fetch: spy,
    });
    await registry.load('sine-wave-2d');
    await registry.load('sine-wave-2d');
    const specCalls = spy.mock.calls.filter((c) => String(c[0]).endsWith('sine-wave-2d/spec.json'));
    expect(specCalls.length).toBe(1);
  });

  it('manifest fetch 실패 시 throw + 캐시 무효화되어 재시도 가능', async () => {
    let fail = true;
    const fetchImpl: typeof fetch = async () => {
      if (fail) return new Response('err', { status: 500 });
      return new Response(
        JSON.stringify({
          version: '1',
          visualizers: { 'x-2d': { spec: 'x-2d/spec.json', renderer: '2d' } },
        }),
        { status: 200 },
      );
    };
    const registry = createVisualizerRegistry({ baseUrl: 'x:///', fetch: fetchImpl });
    await expect(registry.resolve('x-2d')).rejects.toThrow(/fetch failed 500/);
    fail = false;
    const entry = await registry.resolve('x-2d');
    expect(entry.renderer).toBe('2d');
  });

  it('잘못된 manifest 스키마 → throw', async () => {
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ version: 1 }), { status: 200 });
    const registry = createVisualizerRegistry({ baseUrl: 'x:///', fetch: fetchImpl });
    await expect(registry.listIds()).rejects.toThrow(/manifest.json shape invalid/);
  });
});

describe('registries/default manifest 무결성', () => {
  it('manifest.json에 나열된 모든 visualizer의 spec.json이 compileSpec을 통과하고 id/renderer가 일치', async () => {
    const manifest = (await readJson(resolvePath(defaultRegistryDir, 'manifest.json'))) as VisualizerRegistryManifest;
    expect(manifest.version).toBe('1');
    const ids = Object.keys(manifest.visualizers);
    expect(ids.length).toBeGreaterThan(0);

    for (const id of ids) {
      const entry = manifest.visualizers[id];
      const raw = await readJson(resolvePath(defaultRegistryDir, entry.spec));
      const compiled = compileSpec(raw);
      expect(compiled.spec.id, `id mismatch for ${id}`).toBe(id);
      expect(compiled.spec.renderer, `renderer mismatch for ${id}`).toBe(entry.renderer);
    }
  });
});
