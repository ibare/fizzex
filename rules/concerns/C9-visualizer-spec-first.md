---
version: 1
last_verified: 2026-04-29
---

# Visualizer Spec-First 규칙 (C9)

## When to Apply
새 visualizer를 추가하거나, `registries/default/**` 또는 `src/visualizer/**`를 수정할 때.

## 파이프라인

```
registries/default/<id>/spec.json (단일 진실의 원천)
    ↓ manifest.json 등록
registries/default/manifest.json
    ↓ 빌드 시 복사
dist/visualizers/ (publish 산출물, 직접 수정 금지)
    ↓ 호스트 fetch
src/visualizer/runtime (단일 런타임이 spec을 해석)
```

## MUST
- 새 visualizer는 `registries/default/<id>/spec.json` 작성 + `registries/default/manifest.json` 등록만으로 추가한다
- 모든 visualizer는 `src/visualizer/runtime`의 단일 런타임이 해석한다 (`createVisualizer`, `createVisualizerRegistry`, `compileSpec`)
- `registries/default/`는 viz spec의 단일 진실의 원천이다 — `dist/visualizers/`는 빌드 산출물이며 직접 편집하지 않는다
- `manifest.json`의 visualizer id는 카탈로그(`src/analyzer/semantic/data/catalog/**`)의 참조 id와 일치해야 한다 (Formula Immutability)
- viz spec 객체(VisualizerSpec, SceneSpec)는 불변이다 — 런타임에서 새 객체를 생성해 반환

## MUST NOT
- `mount(container, ...) / update(...)` 함수를 export하는 코드 기반 visualizer를 추가하지 않는다
- `dist/visualizers/`의 자산을 직접 수정하지 않는다 (`registries/default`를 수정 후 `pnpm build`로 재생성)
- `src/visualizer/built-in/`, `BUILT_IN_LOADERS`, `loader.ts` 같은 코드 기반 viz 진입점을 부활시키지 않는다 (No Back Compat — 옛 흔적은 즉시 제거)
- viz id를 변경하거나 카탈로그 매핑을 깨뜨리지 않는다 (id는 역사적 진리, 마이그레이션 훅 도입 금지)

## PREFER
- 그래픽 프리미티브는 호스트(adapter2d/adapter3d)가 제공하고 visualizer는 spec scenes로 조립만 한다 (Host-First Viz)
- 새 시각 표현이 필요하면 spec scene 추가가 아닌 프리미티브 확장을 우선 고려한다
- spec.json 필드명은 편집기 사용자 관점 어휘를 따른다 (CS 디폴트·코드 상속 명명 지양)
