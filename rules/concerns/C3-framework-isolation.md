---
version: 1
last_verified: 2026-03-26
---

# 프레임워크 격리 규칙 (C3)

## When to Apply
core 모듈(box/, latex/, types.ts, editor.ts, analyzer/, cas/, utils/, canvas/)을 수정할 때.

## MUST
- core 모듈은 브라우저 DOM API(document, window)에 직접 의존하지 않는다
  - **Exception**: `CanvasFontMetrics`는 Canvas 2D Context를 파라미터로 받는 것은 허용 (주입 패턴)
  - **Exception**: `Projector`는 Surface 인터페이스를 통해 Canvas에 접근하는 것은 허용
- core 모듈의 함수는 순수 함수이거나 주입된 의존성만 사용한다

## MUST NOT
- `box/`, `latex/`, `types.ts`, `editor.ts`, `analyzer/`, `cas/`, `utils/`, `canvas/`에서 `react`, `react-dom`을 import하지 않는다
- `headless/`에서 `react`를 import하지 않는다 (headless는 프레임워크 무관)
- `integrations/tiptap/`에서 `react`를 import하지 않는다 (vanilla DOM NodeView)

## PREFER
- 렌더링 추상화는 `Surface` 인터페이스를 통해 제공한다
- 시각화 확장은 `SceneSurface`(Surface 상속)를 통해 제공한다
- 테스트에서는 `MockSurface` 또는 `MockSceneSurface`를 사용한다
