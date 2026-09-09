---
version: 3
last_verified: 2026-09-09
---

# Subpath Export 규칙 (C6)

## When to Apply
package.json의 exports를 변경하거나, 새 subpath를 추가하거나, subpath 배럴(src/index.ts, src/compute/index.ts, src/semantic/index.ts, src/svg/index.ts, src/headless/index.ts, src/react/index.ts, src/integrations/tiptap/index.ts)을 수정할 때.

## MUST
- 각 subpath export는 독립적으로 import 가능해야 한다
  - 루트(`.`)는 전체 표면을 집약하는 자리이므로 하위 subpath 배럴을 재수출해도 된다
  - 그 반대는 금지 — 루트를 제외한 어떤 subpath도 자기보다 무거운 다른 subpath를 로드하지 않는다
- `fizzex/compute`는 React, DOM/Canvas API, three, 그리고 semantic 카탈로그를 포함하지 않는다
  (`analyzer/semantic` 의 설명 JSON 은 500KB 를 넘는다 — 계산만 하는 워커가 물 비용이 아니다)
- `fizzex/semantic`은 `fizzex/compute` 배럴을 경유하지 않는다
- `fizzex/svg`는 DOM·Canvas·프레임워크를 포함하지 않고, 외부 패키지에도 의존하지 않는다
  (폰트는 구조적 타입으로 주입받는다 — 호스트가 쓰는 폰트 라이브러리를 강제하지 않는다)
- `fizzex/headless`는 React, Tiptap 코드를 포함하지 않는다
- `fizzex/tiptap`는 React 코드를 포함하지 않는다
- `fizzex/react`는 Tiptap 코드를 포함하지 않는다
- 새 optional peerDependency 추가 시 `peerDependenciesMeta`에 `optional: true`를 명시한다
- 위 격리 계약은 `src/__tests__/subpath-isolation.test.ts` 가 import 그래프를 정적으로 훑어 강제한다.
  새 subpath를 추가하면 이 테스트에도 등재한다

## MUST NOT
- 기존 subpath export 경로를 변경하거나 제거하지 않는다 (추가만 허용)
- subpath 간 순환 의존을 만들지 않는다

## PREFER
- tree-shaking이 가능하도록 sideEffects: false를 유지한다
- 각 subpath의 index.ts는 명시적 re-export만 포함한다 (export * 지양)
- 정적 자산은 와일드카드 매핑(`./<자산명>/*: ./dist/<자산명>/*`)으로 노출하고, 호스트가 `new URL('fizzex/<자산명>/', import.meta.url).href`로 baseUrl을 잡는 패턴을 가이드한다 — source layout이 아닌 dist 산출물 경로를 안정 인터페이스로 유지
