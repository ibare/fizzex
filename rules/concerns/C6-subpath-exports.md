---
version: 1
last_verified: 2026-03-26
---

# Subpath Export 규칙 (C6)

## When to Apply
package.json의 exports를 변경하거나, 새 subpath를 추가할 때.

## MUST
- 각 subpath export는 독립적으로 import 가능해야 한다 (다른 subpath를 암묵적으로 로드하지 않음)
- `fizzex/headless`는 React, Tiptap 코드를 포함하지 않는다
- `fizzex/tiptap`는 React 코드를 포함하지 않는다
- `fizzex/react`는 Tiptap 코드를 포함하지 않는다
- 새 optional peerDependency 추가 시 `peerDependenciesMeta`에 `optional: true`를 명시한다

## MUST NOT
- 기존 subpath export 경로를 변경하거나 제거하지 않는다 (추가만 허용)
- subpath 간 순환 의존을 만들지 않는다

## PREFER
- tree-shaking이 가능하도록 sideEffects: false를 유지한다
- 각 subpath의 index.ts는 명시적 re-export만 포함한다 (export * 지양)
- 정적 자산은 와일드카드 매핑(`./<자산명>/*: ./dist/<자산명>/*`)으로 노출하고, 호스트가 `new URL('fizzex/<자산명>/', import.meta.url).href`로 baseUrl을 잡는 패턴을 가이드한다 — source layout이 아닌 dist 산출물 경로를 안정 인터페이스로 유지
