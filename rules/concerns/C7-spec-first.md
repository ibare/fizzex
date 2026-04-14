---
version: 1
last_verified: 2026-04-14
---

# Spec-First 레이아웃 파라미터 규칙 (C7)

## When to Apply
레이아웃 수치(spacing, scale, shift, gap, threshold 등)를 추가하거나 변경할 때.

## 파이프라인

```
specs/references/ (TeX/OpenType/Cambria 원본)
    ↓ 값의 근거
specs/fizzex-layout-spec.json (설정값의 원천)
    ↓ 동일 값 반영
src/box/font-metrics.ts → MathConstants (코드 상수)
    ↓ 동기화 검증
src/__tests__/layout/param-sync.test.ts → PARAM_BINDINGS (바인딩)
```

## MUST
- 레이아웃 수치는 반드시 `specs/fizzex-layout-spec.json`에 먼저 정의한다
- spec.json의 값은 `specs/references/`의 TeX/OpenType 원본 규칙에 근거해야 한다
- 코드에서 레이아웃 수치를 사용할 때는 `MathConstants`의 상수를 참조한다
- 새 파라미터를 `MathConstants`에 추가하면 `param-sync.test.ts`의 `PARAM_BINDINGS`에도 바인딩을 추가한다
- spec.json의 값과 `MathConstants`의 값은 항상 일치해야 한다

## MUST NOT
- 코드에 레이아웃 수치를 매직넘버로 직접 하드코딩하지 않는다 (예: `fontSize * 0.6` 대신 `fontSize * MathConstants.radicalDegreeBottomRaisePercent`)
- spec.json에 정의하지 않은 레이아웃 파라미터를 `MathConstants`에 추가하지 않는다
- `specs/references/`의 원본 자료를 수정하지 않는다 (읽기 전용 레퍼런스)

## PREFER
- spec.json 파라미터에 `sources` 필드로 TeX/OpenType/Cambria 근거를 명시한다
- 파라미터 이름은 TeX/OpenType 표준 명칭을 따른다 (예: `radicalDegreeBottomRaisePercent`, `axisHeight`)
