# TeX 수학 레이아웃 규칙

- **출처**: TeXbook Appendix G (Knuth, 1984), KaTeX 소스코드, TeX by Topic (Eijkhout)
- **추출 방법**: KaTeX src/ 디렉토리와 TeX 소스(tex.web)에서 알고리즘 재구성
- **추출일**: 2026-04-13

---

## 개요

TeX의 수학 레이아웃은 18개 핵심 규칙으로 구성된다. 이 규칙들은 폰트에 내장된 약 35개의 수치 파라미터(sigma/xi)를 기반으로 모든 수학 요소의 크기와 위치를 결정한다.

---

## 1. 원자(Atom) 간격 테이블

### 1.1 원자 타입

| 번호 | 타입 | 역할 | 예시 |
|------|------|------|------|
| 0 | Ord (ordinary) | 일반 기호 | x, y, α, 1 |
| 1 | Op (operator) | 큰 연산자 | ∑, ∫, ∏, lim |
| 2 | Bin (binary) | 이항 연산 | +, −, ∩, ⊗ |
| 3 | Rel (relation) | 관계 | =, <, >, ⊂, → |
| 4 | Open | 여는 구분자 | (, [, ⟨ |
| 5 | Close | 닫는 구분자 | ), ], ⟩ |
| 6 | Punct | 구두점 | , ; |
| 7 | Inner | 내부 수식 | \left...\right 결과, 일반 분수 |

### 1.2 Display/Text 스타일 간격 매트릭스

0=없음, 1=thin(3mu), 2=medium(4mu), 3=thick(5mu)

| 좌 \ 우 | Ord | Op | Bin | Rel | Open | Close | Punct | Inner |
|---------|-----|----|-----|-----|------|-------|-------|-------|
| **Ord** | 0 | 1 | 2 | 3 | 0 | 0 | 0 | 1 |
| **Op** | 1 | 1 | — | 3 | 0 | 0 | 0 | 1 |
| **Bin** | 2 | 2 | — | — | 2 | — | — | 2 |
| **Rel** | 3 | 3 | — | 0 | 3 | 0 | 0 | 3 |
| **Open** | 0 | 0 | — | 0 | 0 | 0 | 0 | 0 |
| **Close** | 0 | 1 | 2 | 3 | 0 | 0 | 0 | 1 |
| **Punct** | 1 | 1 | — | 1 | 1 | 1 | 1 | 1 |
| **Inner** | 1 | 1 | 2 | 3 | 1 | 0 | 1 | 1 |

**—** = 불가능한 조합 (Bin이 Ord로 변환됨)

### 1.3 Script/ScriptScript 스타일 간격 매트릭스

대부분의 간격이 억제된다. 유지되는 것은 **Op 관련 thin space뿐**:

| 좌 \ 우 | Ord | Op | Bin | Rel | Open | Close | Punct | Inner |
|---------|-----|----|-----|-----|------|-------|-------|-------|
| **Ord** | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Op** | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Bin** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Rel** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Open** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Close** | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Punct** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Inner** | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |

### 1.4 Bin 원자 취소 규칙

Bin 원자는 다음 위치에서 Ord로 변환된다:
- **왼쪽이 다음 중 하나**: 수식 시작, Bin, Op, Open, Rel, Punct
- **오른쪽이 다음 중 하나**: 수식 끝, Rel, Close, Punct

예: `-x`에서 `-`는 Bin이 아니라 Ord(단항 마이너스)로 처리된다.

### 1.5 옥스포드 규칙과의 비교

| 간격 유형 | 옥스포드 (1954) | TeX (1984) |
|----------|---------------|------------|
| 관계 연산자 전후 | thick (5/18 em) | thick (5mu = 5/18 em) |
| 이항 연산자 전후 | **no space** (Rule 27c) | **medium (4mu)** |
| 함수명 전후 | thin (3/18 em) | thin (3mu) |
| 괄호 전후 | no space | no space |
| 구두점 뒤 | thin | thin |

**가장 큰 차이**: 옥스포드는 +, − 전후에 간격을 넣지 않지만, TeX은 medium space(4mu)를 넣는다.

---

## 2. 수학 스타일 시스템

### 2.1 8가지 스타일

| ID | 이름 | 크기 | Cramped | 용도 |
|----|------|------|---------|------|
| 0 | D | text | 아니오 | 독립 수식 (\\[ ... \\]) |
| 1 | D' | text | 예 | 독립 수식 내 분모/근호 |
| 2 | T | text | 아니오 | 인라인 수식 ($ ... $) |
| 3 | T' | text | 예 | 인라인 분모/근호 |
| 4 | S | script | 아니오 | 위첨자 |
| 5 | S' | script | 예 | 아래첨자 |
| 6 | SS | scriptscript | 아니오 | 이중 위첨자 |
| 7 | SS' | scriptscript | 예 | 이중 아래첨자 |

### 2.2 스타일 전환표

| 맥락 | D | D' | T | T' | S | S' | SS | SS' |
|------|---|----|---|----|---|----|----|----|
| 위첨자 | S | S' | S | S' | SS | SS' | SS | SS' |
| 아래첨자 | **S'** | **S'** | **S'** | **S'** | **SS'** | **SS'** | **SS'** | **SS'** |
| 분자 | T | T' | S | S' | SS | SS' | SS | SS' |
| 분모 | **T'** | **T'** | **S'** | **S'** | **SS'** | **SS'** | **SS'** | **SS'** |
| cramped | D' | D' | T' | T' | S' | S' | SS' | SS' |

**핵심 규칙**:
- **아래첨자는 항상 cramped** (위첨자 위치가 낮아져 공간 절약)
- **분모는 항상 cramped** (위에 분수선이 있으므로 위첨자를 낮춤)
- **위첨자는 원래 스타일이 cramped이면 cramped 유지**
- **cramped의 효과**: 위첨자 올림에 sup3(낮은 값)를 사용

### 2.3 Cramped 스타일의 의미

Cramped("압축된") 스타일에서는 위첨자가 **덜 올라간다**:
- 비cramped Display: sup1 = 0.413 em
- 비cramped Text: sup2 = 0.363 em
- **Cramped**: sup3 = **0.289 em** (가장 낮음)

이것은 분모, 근호, 아래첨자 내부에서 수직 공간을 절약하기 위한 장치이다.

---

## 3. 폰트 파라미터 (sigma/xi)

### 3.1 Family 2 파라미터 (sigma) — 수학 기호 폰트

| 번호 | TeX 이름 | KaTeX 값 (em) | 용도 |
|------|---------|--------------|------|
| sigma5 | math_x_height | 0.431 | 악센트/첨자 기준점 |
| sigma6 | math_quad | 1.171 | mu 단위 기준 (1em) |
| sigma8 | num1 | 0.677 | 분자 올림 (display) |
| sigma9 | num2 | 0.394 | 분자 올림 (text, 선 있음) |
| sigma10 | num3 | 0.444 | 분자 올림 (text, 선 없음) |
| sigma11 | denom1 | 0.686 | 분모 내림 (display) |
| sigma12 | denom2 | 0.345 | 분모 내림 (text) |
| sigma13 | sup1 | 0.413 | 위첨자 올림 (display) |
| sigma14 | sup2 | 0.363 | 위첨자 올림 (text) |
| sigma15 | sup3 | 0.289 | 위첨자 올림 (cramped) |
| sigma16 | sub1 | 0.150 | 아래첨자 내림 (단독) |
| sigma17 | sub2 | 0.247 | 아래첨자 내림 (위+아래 동시) |
| sigma18 | sup_drop | 0.386 | 위첨자 드롭 |
| sigma19 | sub_drop | 0.050 | 아래첨자 드롭 |
| sigma20 | delim1 | 2.390 | 구분자 크기 (display) |
| sigma21 | delim2 | 1.010 | 구분자 크기 (text) |
| sigma22 | axis_height | 0.250 | 수학 축 높이 |

### 3.2 Family 3 파라미터 (xi) — 수학 확장 폰트

| 번호 | TeX 이름 | KaTeX 값 (em) | 용도 |
|------|---------|--------------|------|
| xi8 | default_rule_thickness | 0.04 | 분수선/근호선/오버라인 두께 |
| xi9 | big_op_spacing1 | 0.111 | 큰 연산자 ↔ 상한 최소 간격 |
| xi10 | big_op_spacing2 | 0.166 | 큰 연산자 ↔ 하한 최소 간격 |
| xi11 | big_op_spacing3 | 0.200 | 상한 기준선 최소 거리 |
| xi12 | big_op_spacing4 | 0.600 | 하한 기준선 최소 거리 |
| xi13 | big_op_spacing5 | 0.100 | 상한/하한 외부 여백 |

---

## 4. 핵심 레이아웃 알고리즘

### 4.1 위첨자 (Rule 18a,c,d)

```
// 초기 위치 (비문자 핵)
shift_up = base.height - sup_drop

// 최소 올림 (스타일별)
if display && !cramped: min = sup1
elif !cramped:          min = sup2
else:                   min = sup3

// 최종 결정
shift_up = max(shift_up, min, sup.depth + xHeight/4)
```

### 4.2 아래첨자 (Rule 18a,b)

```
// 초기 위치
shift_down = base.depth + sub_drop

// 최종 결정
shift_down = max(shift_down, sub1, sub.height - 0.8 * xHeight)
```

### 4.3 위+아래 동시 (Rule 18e)

```
// 아래첨자에 sub2 적용 (sub1보다 큰 값)
shift_down = max(shift_down, sub2)

// 최소 간격 = 4 * defaultRuleThickness
gap = (shift_up - sup.depth) - (sub.height - shift_down)
if gap < 4 * defaultRuleThickness:
    shift_down += (4 * defaultRuleThickness - gap)

// 위첨자 하단이 0.8 * xHeight 이상이 되도록 보정
psi = 0.8 * xHeight - (shift_up - sup.depth)
if psi > 0:
    shift_up   += psi
    shift_down -= psi
```

### 4.4 분수 (Rule 15)

```
// 분수선은 axis_height에 중심 배치

// 분수선 있는 경우 (\\frac):
clearance = display ? 3*ruleThickness : ruleThickness

// 분수선 없는 경우 (\\atop, \\binom):
clearance = display ? 7*ruleSpacing : 3*ruleSpacing

// 시프트 결정:
if display:
    numShift = num1, denomShift = denom1
else:
    if hasRule: numShift = num2
    else:       numShift = num3
    denomShift = denom2
```

**Clearance 요약:**

| | 분수선 있음 | 분수선 없음 |
|---|---|---|
| Display | 3 × 선두께 | 7 × 선두께 |
| Text | 1 × 선두께 | 3 × 선두께 |

### 4.5 근호 (Rule 11)

```
// 내용물은 cramped style
theta = defaultRuleThickness

// 여유 간격
if display:
    phi = xHeight  // 넓은 여유
else:
    phi = theta    // 좁은 여유

lineClearance = theta + phi/4

// Display: 0.04 + 0.431/4 ≈ 0.148 em
// Text:    0.04 + 0.04/4  = 0.050 em

// 근호 기호가 필요 이상 크면 초과분의 절반을 여유에 추가
```

### 4.6 큰 연산자의 Limits (Rule 13)

```
// 상한 위치:
shift_up = max(big_op_spacing3 - upper.depth, big_op_spacing1)
// 위에 big_op_spacing5 여백 추가

// 하한 위치:
shift_down = max(big_op_spacing4 - lower.height, big_op_spacing2)
// 아래에 big_op_spacing5 여백 추가
```

### 4.7 악센트 (Rule 12)

```
// 내용물은 cramped style

// 수평 위치: 핵 문자의 skew 값 기반
offset = skew - accent_width / 2

// 수직 간격:
clearance = min(body.height, xHeight)
// -> 악센트는 x-height 이상으로 올라가지 않음
```

### 4.8 구분자 (\\left/\\right)

```
maxDist = max(height - axisHeight, depth + axisHeight)

totalHeight = max(
    maxDist * 901/500,         // delimiterFactor
    2 * maxDist - 0.5em        // delimiterShortfall
)

// 3단계 선택: small → large(1-4) → stack
// 축(axisHeight) 기준 중앙 정렬
```

### 4.9 Overline / Underline

```
// 내용물: cramped style
// 선 두께: defaultRuleThickness
// 내용물-선 간격: 3 * defaultRuleThickness
// 선 위 여백: defaultRuleThickness
```

---

## 5. 핵심 수치 관계

| 관계 | 수식 | 값 (text, em) |
|------|------|------|
| 위-아래첨자 최소 간격 | 4 × defaultRuleThickness | 0.16 |
| 위첨자 하단 최소 위치 | xHeight / 4 | 0.108 |
| 아래첨자 상단 최대 위치 | 4/5 × xHeight | 0.345 |
| 근호 여유 (display) | theta + xHeight/4 | 0.148 |
| 근호 여유 (text) | theta + theta/4 | 0.050 |
| 분수 여유 (display, 선 있음) | 3 × ruleThickness | 0.120 |
| 분수 여유 (text, 선 있음) | 1 × ruleThickness | 0.040 |
| 분수 여유 (display, 선 없음) | 7 × ruleThickness | 0.280 |
| 분수 여유 (text, 선 없음) | 3 × ruleThickness | 0.120 |

---

## 6. KaTeX 구현 파일 참조

| 규칙 영역 | KaTeX 파일 |
|----------|-----------|
| 원자 간격 | `src/spacingData.ts` |
| 간격 적용 | `src/buildHTML.ts` |
| 위첨자/아래첨자 | `src/functions/supsub.ts` |
| 분수 | `src/functions/genfrac.ts` |
| 근호 | `src/functions/sqrt.ts` |
| 악센트 | `src/functions/accent.ts` |
| 구분자 | `src/delimiter.ts` |
| 구분자 크기 명령 | `src/functions/delimsizing.ts` |
| 큰 연산자 | `src/functions/op.ts` |
| 폰트 메트릭 | `src/fontMetrics.ts` |
| 스타일 전환 | `src/Style.ts` |
| Overline/Underline | `src/functions/overline.ts`, `underline.ts` |
