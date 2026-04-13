# Fizzex 레이아웃 엔진 분석

분석 일자: 2026-04-13
목적: 조판 규칙 통합 메타 파일 설계를 위한 현재 엔진 상태 파악

---

## 1. 상수 시스템 (MathConstants)

**파일**: `src/box/font-metrics.ts:129-243`

| 상수명 | 값 | 단위 | TeX 대응 | 사용처 |
|--------|-----|------|---------|--------|
| `fractionRuleThickness` | 0.04 | em | xi8 (default_rule_thickness) | 분수선, 근호선, 윗줄, 밑줄 두께 |
| `fractionGap` | 0.2 | em | sigma8-12 단순화 | 분자/분모↔분수선 간격 |
| `exponentScale` | 0.7 | ratio | scriptPercentScaleDown=0.8 | 위첨자 폰트 크기 비율 |
| `exponentShift` | 0.4 | em | sigma13-15 단순화 | 위첨자 수직 이동량 |
| `subscriptScale` | 0.7 | ratio | scriptPercentScaleDown=0.8 | 아래첨자 폰트 크기 비율 |
| `subscriptShift` | 0.2 | em | sigma16-17 단순화 | 아래첨자 수직 이동량 |
| `parenPadding` | 0.1 | em | nulldelimiterspace≈0.12 | 괄호 내부 여백 |
| `operatorSpacing` | 0.2 | em | medmuskip=4mu≈0.222 | 이항 연산자 좌우 간격 |
| `sqrtPadding` | 0.1 | em | - | (미사용) |

**TeX 표준 대비 누락 상수**:
- `sigma5 (math_x_height)`: 악센트/첨자 기준점
- `sigma6 (math_quad)`: mu 단위 변환 기준
- `sigma18 (sup_drop)`, `sigma19 (sub_drop)`: 첨자 기준점 조정
- `sigma20-21 (delim1/2)`: 구분자 크기 기준
- `sigma22 (axis_height)`: `box-builder.ts:301`에서 `0.25`로 하드코딩
- `xi9-13 (big_op_spacing 1-5)`: 큰 연산자 limits 간격

---

## 2. 레이아웃 함수 분석

### 2.1 createFraction (box-builder.ts:252-305)

**역할**: 분수 VBox 생성 (분자-gap-분수선-gap-분모)

**알고리즘**:
```
ruleThickness = actualFontSize * 0.04
gap = actualFontSize * 0.2 * (displayStyle ? 1.0 : 0.6)
ruleWidth = max(numerator.width, denominator.width) + gap * 2
VBox children = [numBox, numGapKern(height=gap), rule, denGapKern(depth=gap), denBox]
baselineType = 2 (분수선이 baseline)
shift = -(actualFontSize * 0.25) (axis height)
```

**TeX Rule 15 대비 차이**:
- TeX: 분자를 sigma8/9에 따라 baseline에서 위로 shift, 분모를 sigma11/12에 따라 아래로 shift
- Fizzex: 고정 gap 기반 → 분자/분모 크기에 따라 gap이 일정 (TeX는 크기에 따라 shift 조정)
- TeX: 최소 clearance 검증 (display: 3×ruleThickness, text: 1×ruleThickness)
- Fizzex: clearance 검증 없음

**사용 상수**: `fractionRuleThickness`, `fractionGap`, axis=0.25 (하드코딩)

---

### 2.2 createPower (box-builder.ts:354-382)

**역할**: 위첨자 HBox 생성 (base + shifted exponent)

**알고리즘**:
```
baseShift = actualFontSize * 0.4
extraHeight = max(0, base.height - defaultHeight) * 0.6
shift = baseShift + extraHeight
shiftedExponent.shift = -shift (음수 = 위로)
hbox.height = max(hbox.height, exponent.height + shift)
```

**TeX Rule 18a,c,d 대비 차이**:
- TeX: shift_up 초기값 = base.height - sup_drop(sigma18)
- TeX: 최소 올림 = display(sigma13), text(sigma14), cramped(sigma15)
- TeX: 추가 조건 = sup.depth + xHeight/4
- Fizzex: 단일 `exponentShift=0.4`, 스타일별 분기 없음, cramped 미적용, sup_drop 미적용

**사용 상수**: `exponentShift`

---

### 2.3 createSubscript (box-builder.ts:560-582)

**역할**: 아래첨자 HBox 생성 (base + shifted subscript)

**알고리즘**:
```
shift = actualFontSize * 0.2
shiftedSubscript.shift = shift (양수 = 아래로)
hbox.depth = max(hbox.depth, subscript.depth + shift)
```

**TeX Rule 18a,b 대비 차이**:
- TeX: shift_down 초기값 = base.depth + sub_drop(sigma19)
- TeX: 최소 내림 = max(sigma16, sub.height - 4/5 * xHeight)
- TeX: 이탤릭 보정(italic_correction) 기반 수평 이동
- Fizzex: 단일 `subscriptShift=0.2`, sub_drop/xHeight 조건 없음

**사용 상수**: `subscriptShift`

---

### 2.4 createSurd (box-builder.ts:1631-1677)

**역할**: 근호 SurdBox 생성 (√ + vinculum + content)

**알고리즘**:
```
ruleThickness = actualFontSize * 0.04 * 1.5
gap = actualFontSize * 0.08
surdTotalHeight = content.height + gap + ruleThickness + content.depth
sqrtWidth = (경로 데이터 기반) 또는 actualFontSize * 0.6
```

**TeX Rule 11 대비 차이**:
- TeX: display 여유 = ruleThickness + xHeight/4, text 여유 = 1.25 * ruleThickness
- TeX: content는 cramped style로 렌더링
- Fizzex: 고정 gap=0.08, display/text 차이 없음, cramped 미적용

**사용 상수**: `fractionRuleThickness` (×1.5)

---

### 2.5 createOverlineBox (box-builder.ts:945-975)

**역할**: 윗줄 VBox 생성 (rule-gap-content)

**알고리즘**:
```
ruleThickness = actualFontSize * 0.04
gap = actualFontSize * 0.05
VBox children = [rule, kern(height=gap), contentBox]
baselineType = 2 (content가 baseline)
```

**TeX Rule 13 대비 차이**:
- TeX: gap = 3 * xi8 = 3 * 0.04 = 0.12em, 추가 여백 = xi8
- Fizzex: gap = 0.05em (TeX의 약 42%)
- TeX: content는 cramped style
- Fizzex: cramped 미적용

**사용 상수**: `fractionRuleThickness`

---

### 2.6 createSumBox (box-builder.ts:740-809)

**역할**: 합/곱 연산자 Box 생성

**알고리즘**:
- **Display**: VBox [상한-gap-시그마-gap-하한], limitGap=0.15*actualFontSize, baselineType=2
- **Inline**: sideset (상한=shift up, 하한=shift down), 음수 kern으로 겹침

**TeX Rule 13 (Op with Limits) 대비 차이**:
- TeX: upperGap = max(xi9, xi11 - upper.depth), lowerGap = max(xi10, xi12 - lower.height)
- TeX: 상하 padding = xi13
- Fizzex: 고정 limitGap=0.15, xi9-13 미적용

**사용 상수**: 0.15 (하드코딩), 0.1/0.2 (하드코딩)

---

### 2.7 createOperator (box-builder.ts:536-557)

**역할**: 연산자 글리프 + 좌우 간격

**알고리즘**:
```
spacing = actualFontSize * 0.2
result = [kern(spacing), glyph, kern(spacing)]
// 후위 연산자 (!, 등)는 간격 없음
```

**TeX Atom Spacing Table 대비 차이**:
- TeX: 원자 타입 쌍에 따라 0/thin(3mu)/medium(4mu)/thick(5mu) 선택
- TeX: Script/ScriptScript에서 대부분 간격 억제
- Fizzex: 모든 연산자에 동일한 `operatorSpacing=0.2` 적용, 원자 타입 분류 없음

**사용 상수**: `operatorSpacing`

---

### 2.8 createAccentBox (box-builder.ts:1014+)

**역할**: 악센트 오버레이 (hat, vec, dot 등)

**알고리즘**:
```
accentGlyph = createGlyph(char, fontSize * scale)
smallGap = actualFontSize * (0.02 + extraGap)
accentShift = -(content.height - accentGlyph.height + smallGap)
// 음수 너비 kern으로 오버레이
```

**TeX Rule 12 대비 차이**:
- TeX: 악센트 수직 위치 = min(base.height, xHeight(sigma5)), cramped style 적용
- Fizzex: content.height 기반 배치, xHeight 참조 없음, cramped 미적용

**사용 상수**: 악센트별 고정 scale/extraGap

---

## 3. AST 노드 → 레이아웃 함수 매핑

**파일**: `src/box/ast-to-box.ts`

| AST 노드 타입 | 변환 함수 | 레이아웃 함수 | 반환 Box |
|---------------|---------|-------------|----------|
| `root`, `row` | `convertRow` | `createHBox` | HBox |
| `number` | `convertNumber` | `createGlyphString` | HBox |
| `variable` | `convertVariable` | `createGlyphString` / PathBox | HBox / PathBox |
| `operator` | `convertOperatorNode` | `createOperator` | HBox |
| `frac` (variant=binom) | `convertFrac` | `createBinomBox` | HBox |
| `frac` | `convertFrac` | `createFraction` | VBox |
| `power` | `convertPower` | `createPower` | HBox |
| `subscript` | `convertSubscript` | `createSubscript` | HBox |
| `sqrt` | `convertSqrt` | `createSurd` | SurdBox |
| `paren` | `convertParen` | `createParenthesized` | HBox |
| `abs` | `convertAbs` | `createAbsoluteValue` | HBox |
| `func` | `convertFunc` | `createHBox` (재귀) | HBox |
| `integral` | `convertIntegral` | `createIntegralBox` | HBox |
| `sum` | `convertSum` | `createSumBox` | HBox |
| `product` | `convertProduct` | `createProductBox` | HBox |
| `limit` | `convertLimit` | `createLimitBox` | HBox |
| `overline` | `convertOverline` | `createOverlineBox` | VBox |
| `accent` | `convertAccent` | `createAccentBox` | HBox |
| `matrix` | `convertMatrix` | `createMatrixBox` | HBox |
| `text` | `convertText` | `createTextBox` | HBox |
| `space` | `convertSpace` | `createKern` | KernBox |
| `align` | `convertAlign` | `createAlignBox` | VBox |
| `cases` | `convertCases` | `createCasesBox` | HBox |
| `gather` | `convertGather` | `createGatherBox` | VBox |
| `array` | `convertArray` | `createArrayBox` | VBox |

---

## 4. 스타일 전환 현황

### 현재 구현

Fizzex는 `displayStyle: boolean` 단일 변수로 스타일을 관리한다.

| 함수 | displayStyle 사용 방식 |
|------|----------------------|
| `createFraction` | gap을 60%로 축소 (inline) |
| `createBinomBox` | gap을 60%로 축소 (inline) |
| `createIntegralBox` | 글리프 크기 2.5x(display) vs 1.4x(inline) |
| `createSumBox` | VBox limits(display) vs sideset(inline) |
| `createProductBox` | VBox limits(display) vs sideset(inline) |
| `createLimitBox` | VBox 3행(display) vs 아래첨자(inline) |
| `astToBox` | 분수 자식에 displayStyle 전달 |

### TeX 표준 대비 미구현

| 기능 | TeX | Fizzex |
|------|-----|--------|
| 8가지 스타일 (D/D'/T/T'/S/S'/SS/SS') | 완전 구현 | `boolean` 2가지만 |
| Cramped 스타일 (D'/T'/S'/SS') | 분모, 근호 내 자동 cramped | 미구현 |
| 스타일 전환 테이블 | 위첨자→S, 아래첨자→S', 분자→T, 분모→T' | 미구현 |
| Script/ScriptScript 크기 차이 | script=0.8, scriptscript=0.6 | 0.7 단일값 |
| Script 스타일에서 간격 억제 | Atom spacing table 참조 | 미구현 |

---

## 5. 폰트 메트릭스 구조

### FontMetrics 인터페이스 (types.ts:147-154)

```typescript
interface FontMetrics {
  measureWidth(char: string, fontSize: number, italic: boolean): number;
  getHeight(fontSize: number): number;
  getDepth(fontSize: number): number;
}
```

### CanvasFontMetrics 추가 메서드 (font-metrics.ts:20-115)

| 메서드 | 반환 | 용도 |
|--------|------|------|
| `measureStringWidth` | number | 문자열 전체 너비 |
| `getFont` | string | CSS 폰트 문자열 |
| `getActualFontSize` | number | baseFontSize * fontSize (px) |
| `getDelimiterGlyph` | single/extensible | 구분자 글리프 선택 |
| `getDelimiterPair` | {open, close} | 구분자 쌍 |
| `updateConfig` | void | 설정 업데이트 |

**중요**: `astToBox`는 `CanvasFontMetrics` 타입을 직접 요구한다 (ast-to-box.ts:45).
`box-builder.ts`의 모든 create* 함수도 `CanvasFontMetrics`를 인자로 받는다.

### 하드코딩된 폰트 비율 (font-metrics.ts:63-73)

- `getHeight`: `actualSize * 0.806` (New Computer Modern Math sTypoAscender=806/1000)
- `getDepth`: `actualSize * 0.194` (sTypoDescender=194/1000)

---

## 6. 진단 요약

### 상수 매핑 현황

- **match (2)**: sigma22(axis_height=0.25), xi8(rule_thickness=0.04)
- **mismatch (8)**: sigma8-12(분수 shift), sigma13(sup1), sigma16(sub1), exponentScale/subscriptScale, operatorSpacing, parenPadding
- **missing (15)**: sigma5,6,10,14,15,17,18,19,20,21, xi9-13, scriptScriptPercentScaleDown
- **hardcoded (1)**: fractionGap (TeX에 직접 대응 없음, 알고리즘 구조 차이)

### 알고리즘 수준 Gap

1. 분수: gap 기반 → shift 기반 전환 필요
2. 첨자: sup_drop/sub_drop, 스타일별 분기, xHeight 조건 추가 필요
3. 근호: display/text clearance 차이, cramped 적용 필요
4. Overline/Underline: gap=3*xi8 적용 필요
5. Limits: xi9-13 적용 필요
6. Spacing: atom type 분류 + 8×8 매트릭스 필요
7. 스타일 체계: 8가지 스타일 + cramped 도입 필요
