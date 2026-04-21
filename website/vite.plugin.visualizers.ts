import { promises as fs } from 'node:fs';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/**
 * Fizzex 비주얼라이저 registry 정적 서빙.
 *
 * dev: `${base}visualizers/*` 요청을 repo root 의 `registries/default/` 에서
 *      직접 서빙 (파일 수정 즉시 반영).
 * build: `registries/default/**` 전체를 `dist/visualizers/` 로 복사.
 *
 * base 는 vite config 의 base (예: '/fizzex/') 를 따라간다.
 */
export function visualizersPlugin(): Plugin {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sourceDir = path.resolve(here, '..', 'registries', 'default');
  let outDir = path.resolve(here, 'dist');
  let base = '/';

  return {
    name: 'fizzex-visualizers',
    apply: () => true,

    configResolved(config) {
      outDir = path.resolve(here, config.build.outDir);
      base = config.base;
    },

    configureServer(server) {
      const prefix = base.replace(/\/$/, '') + '/visualizers/';
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const [urlPath] = req.url.split('?');
        if (!urlPath.startsWith(prefix)) return next();

        const rel = urlPath.slice(prefix.length);
        const filePath = path.join(sourceDir, rel);

        if (!filePath.startsWith(sourceDir)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        if (!existsSync(filePath)) {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }

        res.setHeader('Content-Type', contentTypeFor(filePath));
        res.setHeader('Cache-Control', 'no-cache');
        createReadStream(filePath).pipe(res);
      });
    },

    async closeBundle() {
      const target = path.join(outDir, 'visualizers');
      await fs.rm(target, { recursive: true, force: true });
      await fs.cp(sourceDir, target, {
        recursive: true,
        filter: (src) => !src.endsWith('.test.ts') && !src.endsWith('.test.js'),
      });
    },
  };
}

function contentTypeFor(filePath: string): string {
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}
