---
version: 1
last_verified: 2026-03-26
---

# Principles

모든 코드에 항상 적용되는 핵심 원칙.

## 1. AST가 진실의 원천
- 모든 연산(편집, 렌더링, 분석, 직렬화)은 AST를 중심으로 동작한다
- AST 외의 상태에서 수식 정보를 파생하지 않는다
- 상태 변경은 항상 AST를 통해 이루어진다

## 2. 파이프라인 단계 독립
- LaTeX → AST → Box → Canvas 각 단계는 독립적으로 테스트/교체 가능해야 한다
- 단계 간 의존은 인터페이스를 통해서만 발생한다
- 하위 단계가 상위 단계를 참조하지 않는다

## 3. 프레임워크 격리
- core 모듈(box/, latex/, types.ts, editor.ts, analyzer/, cas/, utils/, canvas/)은 React 등 프레임워크에 의존하지 않는다
- 프레임워크 의존 코드는 react/, visualizer/, headless/, integrations/ 에만 존재한다

## 4. 불변 상태
- EditorState, AST 노드, VisualizerSpec/SceneSpec/CatalogIndexEntry 등 spec 객체는 불변이다
- 상태 변경은 새 객체를 생성하여 반환한다
- 원본 객체를 직접 수정하지 않는다

## 5. 타입 안전
- MathNode discriminated union의 모든 분기를 exhaustive하게 처리한다
- `as unknown` 캐스팅을 사용하지 않는다
- 새 노드 타입 추가 시 관련 switch/if 분기를 모두 갱신한다

## 6. 최소 영향 변경
- 수정은 필요한 범위로 최소화한다
- 기존 public API 변경 시 호출 측을 일괄 갱신하고 옛 식별자를 즉시 제거한다 (deprecated alias·legacy 분기·shim 도입 금지)
- 부수효과 없는 변경을 우선한다
