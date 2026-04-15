---
version: 1
last_verified: 2026-03-26
---

# Headless Adapter 계약 규칙 (C5)

## When to Apply
headless/ 또는 integrations/ 모듈을 수정할 때. 플러그인 인터페이스를 변경할 때.

## MUST
- `DOMRendererView`와 `DOMEditorView`의 public API(constructor, render, setLatex, getLatex, onChange, destroy)는 하위 호환성을 유지한다
- deprecated alias(`FizzexRenderer`, `FizzexEditor`, `FizzexStreamRenderer`, `StreamRendererConfig`)를 headless/index.ts와 src/index.ts에서 유지한다
- `FizzexConfig` 인터페이스의 기존 필드를 제거하거나 타입을 변경하지 않는다 (추가는 허용)
- `destroy()`는 모든 DOM 요소, 이벤트 리스너, 타이머를 정리한다
- 폰트 로딩은 비동기이므로 `render()`는 폰트 미로드 상태에서도 fallback 폰트로 동작한다

## MUST NOT
- headless adapter에서 React, Tiptap 등 특정 프레임워크를 import하지 않는다
- `DOMRendererView.render()`가 예외를 throw하지 않는다 (잘못된 LaTeX도 silent fail)
- deprecated alias를 제거하지 않는다 (외부 사용자가 이전 이름에 의존할 수 있음)

## PREFER
- 플러그인 개발자가 20~30줄로 통합할 수 있는 수준의 API 단순성을 유지한다
- 내부 상태 변경 시 re-render를 자동으로 트리거한다
