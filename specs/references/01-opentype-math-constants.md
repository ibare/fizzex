# OpenType MATH 테이블 상수 사양

- **출처**: OpenType MATH Table Specification v1.9.1
- **URL**: https://learn.microsoft.com/en-us/typography/opentype/spec/math
- **추출일**: 2026-04-13

---

## 개요

OpenType MATH 테이블은 수학 수식 레이아웃에 필요한 폰트별 정보를 제공한다. 세 개의 주요 하위 테이블로 구성된다:

1. **MathConstants** — 수식 요소 배치에 필요한 폰트 파라미터 (51개 상수)
2. **MathGlyphInfo** — 글리프별 위치 정보 (이탤릭 보정, 악센트 부착점, 확장 도형, 수학 커닝)
3. **MathVariants** — 가변 크기 글리프 구성 (크기별 변형 + 조립식 구성)

### 명명 규칙

| 접미사 | 의미 |
|--------|------|
| **Height** | 주 베이스라인으로부터의 거리 |
| **Kern** | 고정된 빈 공간 |
| **Gap** | 기준을 충족하기 위해 늘어날 수 있는 빈 공간 |
| **Drop/Rise** | 두 요소 간 상대적 관계 (Drop=하향, Rise=상향) |
| **Shift** | 베이스라인 위 요소에 적용되는 수직 이동 *조정량* |
| **Dist** | 두 요소의 베이스라인 간 거리 |

---

## General (일반)

| 상수명 | 타입 | 권장값 | 설명 |
|--------|------|--------|------|
| `scriptPercentScaleDown` | int16 | 80% | 1단계 위첨자/아래첨자의 축소 비율 |
| `scriptScriptPercentScaleDown` | int16 | 60% | 2단계(scriptScript) 위첨자/아래첨자의 축소 비율 |
| `mathLeading` | MathValueRecord | — | 수식 간 줄 간격 확보를 위한 여백 |
| `axisHeight` | MathValueRecord | — | 수학 축 높이. 분수선, 마이너스 기호 등이 놓이는 수평 기준선. 일반 텍스트 베이스라인과 구별됨 |

**axisHeight의 역할**: 수학 조판에서 "축(axis)"은 수식 요소 배치의 수평 기준선이다. 분수선과 마이너스 기호는 이 축 위에 놓이고, 변수명 등의 텍스트는 축에서 오프셋된 베이스라인에 놓인다.

---

## Subscripts (아래첨자)

| 상수명 | 타입 | 권장값 | 설명 |
|--------|------|--------|------|
| `subscriptShiftDown` | MathValueRecord | os2.ySubscriptYOffset | 아래첨자의 기본 하향 이동 거리 |
| `subscriptTopMax` | MathValueRecord | 4/5 x-height | 아래첨자 상단의 최대 허용 높이. 초과 시 더 아래로 이동 |
| `subscriptBaselineDropMin` | MathValueRecord | — | 박스/확장 도형 베이스에서 아래첨자 베이스라인의 최소 하강 거리 |

**레이아웃 영향**: 아래첨자는 먼저 `subscriptShiftDown`만큼 내린 후, 결과적으로 아래첨자 상단이 `subscriptTopMax`를 초과하면 추가로 더 내린다. 베이스가 박스형인 경우 `subscriptBaselineDropMin`도 적용한다.

---

## Superscripts (위첨자)

| 상수명 | 타입 | 권장값 | 설명 |
|--------|------|--------|------|
| `superscriptShiftUp` | MathValueRecord | os2.ySuperscriptYOffset | 위첨자의 기본 상향 이동 거리 |
| `superscriptShiftUpCramped` | MathValueRecord | — | cramped 스타일에서의 위첨자 상향 이동 (일반보다 작음) |
| `superscriptBottomMin` | MathValueRecord | 1/4 x-height | 위첨자 하단의 최소 높이. 이보다 낮으면 위첨자를 더 올림 |
| `superscriptBaselineDropMax` | MathValueRecord | — | 박스/확장 도형 베이스에서 위첨자 베이스라인의 최대 하강 거리 |
| `subSuperscriptGapMin` | MathValueRecord | 4 × rule thickness | 위첨자와 아래첨자 잉크 사이의 최소 간격 |
| `superscriptBottomMaxWithSubscript` | MathValueRecord | 4/5 x-height | 아래첨자를 내리기 전 위첨자 하단을 올릴 수 있는 최대 수준 |

**cramped 스타일**: 분모, 근호 아래 등 수직 공간이 제한되는 맥락에서 위첨자를 덜 올려 공간을 절약하는 스타일이다.

---

## Spacing (간격)

| 상수명 | 타입 | 권장값 | 설명 |
|--------|------|--------|------|
| `spaceAfterScript` | MathValueRecord | 0.5pt (12pt 폰트), ~1/24 em | 위첨자/아래첨자 뒤에 추가되는 여백 |

**적용 범위**: 베이스 요소 뒤에 오는 모든 위첨자/아래첨자 뒤에 추가되며, 베이스 요소 앞에 오는 위첨자/아래첨자의 앞에도 추가된다.

---

## Limits (한계 — 큰 연산자의 상한/하한)

| 상수명 | 타입 | 권장값 | 설명 |
|--------|------|--------|------|
| `displayOperatorMinHeight` | UFWORD | — | 디스플레이 모드에서 n항 연산자(적분, 시그마)의 최소 높이 |
| `upperLimitGapMin` | MathValueRecord | — | 상한 잉크 하단과 연산자 잉크 상단 사이의 최소 간격 |
| `upperLimitBaselineRiseMin` | MathValueRecord | — | 상한 베이스라인과 연산자 잉크 상단 사이의 최소 거리 |
| `lowerLimitGapMin` | MathValueRecord | — | 하한 잉크 상단과 연산자 잉크 하단 사이의 최소 간격 |
| `lowerLimitBaselineDropMin` | MathValueRecord | — | 하한 베이스라인과 연산자 잉크 하단 사이의 최소 거리 |

**레이아웃 영향**: 큰 연산자(∑, ∫ 등)의 위/아래에 배치되는 한계 식의 위치를 결정한다. Gap은 잉크 간 간격, Baseline 값은 한계 식의 베이스라인 기준 거리이다.

---

## Fractions (분수) 및 Stacks

### 분수 (분수선 있음)

| 상수명 | 타입 | 권장값 | 설명 |
|--------|------|--------|------|
| `fractionNumeratorShiftUp` | MathValueRecord | — | 분자의 상향 이동 (텍스트 스타일) |
| `fractionNumeratorDisplayStyleShiftUp` | MathValueRecord | = stackTopDisplayStyleShiftUp | 분자의 상향 이동 (디스플레이 스타일) |
| `fractionDenominatorShiftDown` | MathValueRecord | — | 분모의 하향 이동 (텍스트 스타일) |
| `fractionDenominatorDisplayStyleShiftDown` | MathValueRecord | = stackBottomDisplayStyleShiftDown | 분모의 하향 이동 (디스플레이 스타일) |
| `fractionNumeratorGapMin` | MathValueRecord | 1 × rule thickness | 분자 하단과 분수선 사이의 최소 간격 (텍스트) |
| `fractionNumDisplayStyleGapMin` | MathValueRecord | 3 × rule thickness | 분자 하단과 분수선 사이의 최소 간격 (디스플레이) |
| `fractionRuleThickness` | MathValueRecord | default rule thickness | 분수선의 두께 |
| `fractionDenominatorGapMin` | MathValueRecord | 1 × rule thickness | 분모 상단과 분수선 사이의 최소 간격 (텍스트) |
| `fractionDenomDisplayStyleGapMin` | MathValueRecord | 3 × rule thickness | 분모 상단과 분수선 사이의 최소 간격 (디스플레이) |
| `skewedFractionHorizontalGap` | MathValueRecord | — | 비스듬한 분수에서 수평 거리 |
| `skewedFractionVerticalGap` | MathValueRecord | — | 비스듬한 분수에서 수직 거리 |

### 스택 (분수선 없음, 예: \atop)

| 상수명 | 타입 | 권장값 | 설명 |
|--------|------|--------|------|
| `stackTopShiftUp` | MathValueRecord | — | 스택 상단 요소의 상향 이동 (텍스트) |
| `stackTopDisplayStyleShiftUp` | MathValueRecord | — | 스택 상단 요소의 상향 이동 (디스플레이) |
| `stackBottomShiftDown` | MathValueRecord | — | 스택 하단 요소의 하향 이동 (텍스트) |
| `stackBottomDisplayStyleShiftDown` | MathValueRecord | — | 스택 하단 요소의 하향 이동 (디스플레이) |
| `stackGapMin` | MathValueRecord | 3 × rule thickness | 스택 요소 간 최소 간격 (텍스트) |
| `stackDisplayStyleGapMin` | MathValueRecord | 7 × rule thickness | 스택 요소 간 최소 간격 (디스플레이) |

### 스트레치 스택

| 상수명 | 타입 | 권장값 | 설명 |
|--------|------|--------|------|
| `stretchStackTopShiftUp` | MathValueRecord | — | 스트레치 스택 상단 요소의 상향 이동 |
| `stretchStackBottomShiftDown` | MathValueRecord | — | 스트레치 스택 하단 요소의 하향 이동 |
| `stretchStackGapAboveMin` | MathValueRecord | = upperLimitGapMin | 스트레치 요소와 위 요소 사이의 최소 간격 |
| `stretchStackGapBelowMin` | MathValueRecord | = lowerLimitGapMin | 스트레치 요소와 아래 요소 사이의 최소 간격 |

---

## Accents (악센트) 및 Over/Underbar

### 악센트 기본

| 상수명 | 타입 | 권장값 | 설명 |
|--------|------|--------|------|
| `accentBaseHeight` | MathValueRecord | x-height + overshoot | 악센트를 올릴 필요 없는 베이스의 최대 잉크 높이 |
| `flattenedAccentBaseHeight` | MathValueRecord | cap height | 악센트를 납작하게 만들 필요 없는 베이스의 최대 잉크 높이 |

### Overbar

| 상수명 | 타입 | 권장값 | 설명 |
|--------|------|--------|------|
| `overbarVerticalGap` | MathValueRecord | 3 × rule thickness | 윗줄과 베이스 잉크 상단 사이의 거리 |
| `overbarRuleThickness` | MathValueRecord | default rule thickness | 윗줄의 두께 |
| `overbarExtraAscender` | MathValueRecord | default rule thickness | 윗줄 위의 추가 여백 |

### Underbar

| 상수명 | 타입 | 권장값 | 설명 |
|--------|------|--------|------|
| `underbarVerticalGap` | MathValueRecord | 3 × rule thickness | 아랫줄과 베이스 잉크 하단 사이의 거리 |
| `underbarRuleThickness` | MathValueRecord | default rule thickness | 아랫줄의 두께 |
| `underbarExtraDescender` | MathValueRecord | default rule thickness | 아랫줄 아래의 추가 여백 |

---

## Delimiters (구분 기호)

| 상수명 | 타입 | 권장값 | 설명 |
|--------|------|--------|------|
| `delimitedSubFormulaMinHeight` | UFWORD | line height × 1.5 | 괄호 등으로 감싸인 식이 하위 수식으로 처리되는 최소 높이 |

**MathVariants 테이블과의 관계**: 구분 기호의 실제 크기 조절은 MathVariants 테이블이 담당한다. 미리 만들어진 크기별 글리프 변형을 먼저 시도하고, 충분히 크지 않으면 GlyphAssembly로 조각을 조합하여 임의 크기의 괄호를 구성한다.

---

## Radicals (근호)

| 상수명 | 타입 | 권장값 | 설명 |
|--------|------|--------|------|
| `radicalVerticalGap` | MathValueRecord | 1.25 × rule thickness | 근호 아래 식과 근호선 사이의 간격 (텍스트) |
| `radicalDisplayStyleVerticalGap` | MathValueRecord | rule thickness + 1/4 x-height | 근호 아래 식과 근호선 사이의 간격 (디스플레이) |
| `radicalRuleThickness` | MathValueRecord | default rule thickness | 근호선의 두께 |
| `radicalExtraAscender` | MathValueRecord | = radicalRuleThickness | 근호 위의 추가 여백 |
| `radicalKernBeforeDegree` | MathValueRecord | 5/18 em | 근호 차수 앞의 수평 커닝 |
| `radicalKernAfterDegree` | MathValueRecord | -10/18 em | 근호 차수 뒤의 음수 커닝 (차수를 근호 안쪽으로 밀어넣음) |
| `radicalDegreeBottomRaisePercent` | int16 | 60% | 근호 차수 하단의 높이 비율 (근호 전체 높이 대비) |

---

## MathGlyphInfo 요약

글리프별 위치 정보를 제공하는 4개의 하위 테이블:

### 1. MathItalicsCorrectionInfo
기울어진 글리프의 이탤릭 보정값을 제공한다. 사용되는 경우:
- 기울어진 문자열 뒤에 직립 문자가 올 때 — 마지막 글리프의 보정값을 전진폭에 추가
- N항 연산자의 상한/하한 배치 시 — 상한은 보정값의 절반만큼 오른쪽으로, 하한은 왼쪽으로 이동
- 위첨자/아래첨자 배치 시 — 기본 수평 위치가 보정값만큼 차이남

### 2. MathTopAccentAttachment
수학 악센트의 수평 부착점을 정의한다. 베이스 글리프와 악센트의 부착점을 정렬하여 수평 위치를 결정한다. 부착점이 정의되지 않은 글리프는 기하학적 중심(전진폭 기준)을 사용한다.

### 3. ExtendedShapeCoverage
높은 괄호 등 확장된 도형을 지정한다. 이 글리프 옆의 위첨자/아래첨자는 글리프 자체가 아닌 포함된 하위식의 잉크 박스 기준으로 수직 위치를 결정한다.

### 4. MathKernInfo
높이에 따라 다른 커닝값을 제공하는 수학 커닝 테이블. 4개 모서리(top-right, top-left, bottom-right, bottom-left)에 대해 독립적인 커닝 테이블을 가질 수 있다. 예: 기울어진 글리프(예: 이탤릭 f) 위의 위첨자를 더 가깝게 배치.

---

## MathVariants 요약

가변 크기 글리프 구성을 위한 두 가지 메커니즘:

### 1. 미리 만들어진 글리프 변형 (MathGlyphVariantRecord)
크기별로 미리 디자인된 글리프 변형 목록을 제공한다. 예: 5가지 크기의 왼쪽 괄호.

### 2. GlyphAssembly (글리프 조립)
글리프 조각(GlyphPart)들을 조합하여 임의 크기의 도형을 구성한다:
- 각 조각은 시작/끝 연결부 길이, 전체 전진폭, 확장자(extender) 여부를 가짐
- 확장자 조각은 반복하여 크기를 늘릴 수 있음
- `minConnectorOverlap`으로 조각 간 최소 겹침량을 지정

**조립 알고리즘**:
1. 모든 확장자를 제거하고 최대 겹침으로 조립 (최소 크기)
2. 겹침을 줄여 크기를 늘림 (목표 도달 시 완료)
3. 부족하면 확장자를 하나씩 추가하고 1단계부터 반복

---

## OpenType Layout 태그

| 태그 | 용도 |
|------|------|
| `math` | 수학 레이아웃용 스크립트 태그 |
| `ssty` | 스크립트 스타일 대체 글리프 (첨자에 적합한 형태) |
| `flac` | 납작한 악센트 형태 (높은 베이스용) |
| `dtls` | 점 없는 형태 (악센트 부착용 i, j 등) |
