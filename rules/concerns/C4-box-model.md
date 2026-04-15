---
version: 1
last_verified: 2026-03-26
---

# Box 모델 규칙 (C4)

## When to Apply
Box 타입 추가, 레이아웃 로직 수정, 렌더링 파이프라인 변경, Canvas 씬/프리미티브 수정 시.

## MUST
- Box의 y 좌표는 항상 baseline 위치를 의미한다 (top-left가 아님)
- height는 baseline 위 픽셀, depth는 baseline 아래 픽셀이다
- Canvas 크기 변경 후 CanvasFontMetrics와 Projector를 재생성한다 (context state가 리셋되므로)
- HiDPI 처리: `canvas.width = cssWidth * dpr; ctx.scale(dpr, dpr)` 패턴을 따른다 (`setupHiDPI()` 또는 `Stage` 사용 권장)

## MUST NOT
- Box의 y를 top-left 기준으로 해석하지 않는다
- Canvas context의 transform 상태에 의존하는 코드를 캐싱하지 않는다

## PREFER
- 레이아웃 계산은 `layoutBox()`에 집중한다
- 히트 테스트는 `hitTest()`를 사용한다
