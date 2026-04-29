---
version: 1
last_verified: 2026-04-29
---

# Build Artifact Cleanliness 규칙 (C10)

## When to Apply
`package.json`(scripts/files/exports), `tsconfig.build.json`, `vite.lib.config.ts`를 수정하거나, 빌드/패키징 산출물 형태를 바꿀 때.

## MUST
- `build` 스크립트는 prebuild clean(`rm -rf dist`)으로 시작한다 — `tsc`는 outDir을 자동 비우지 않으므로 stale 산출물 누적 방지
- `dist/`는 단일 publish artifact 디렉터리로 유지한다 (별도 임시 산출물은 별도 디렉터리 + `.gitignore` 등록)
- `package.json` `exports`의 source target은 `./dist/` 하위 경로만 가리킨다 (source layout 직접 노출 금지)
- 정적 자산을 publish 대상에 포함시킬 때는 빌드 단계에서 `dist/<자산명>/`로 복사해 dist 단일 root를 유지한다

## MUST NOT
- repo root나 source 디렉터리에 tarball(`*.tgz`)·번들·빌드 산출물을 떨어뜨리지 않는다
- `package.json` `files` 배열에 source 디렉터리(`registries/`, `src/` 등)를 직접 추가하지 않는다
- outDir 청소 단계를 생략하지 않는다 — stale 파일이 호스트 `node_modules/`로 흘러가 잘못된 시스템 분기 추정을 유발

## PREFER
- 임시 산출물(pack tarball 등)은 `pack/`처럼 명확히 구분된 디렉터리에 떨어뜨리고 `.gitignore`에 등록한다
- pnpm 빌트인 명령(`pack`, `publish` 등)과 동명인 사용자 스크립트는 충돌 회피를 위해 접미사를 붙인다 (`pack:tgz`)
- exports의 정적 자산 매핑은 와일드카드를 사용해 디렉터리 단위로 노출한다 (C6 PREFER 참고)
