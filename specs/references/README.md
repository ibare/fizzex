# 수식 조판 규칙 데이터베이스

수학 수식을 화면에 정확하고 아름답게 배치하기 위한 조판(typesetting) 규칙을 3개의 원천에서 추출하여 구조화한 자료이다.

---

## 왜 이 규칙들이 필요한가

수식 조판은 일반 텍스트 렌더링과 근본적으로 다르다. 수식은 **비선형 2차원 구조**로, 분수선 위아래, 첨자의 첨자, 근호 안의 적분 등 수직과 수평이 동시에 얽힌다. 이때 각 요소의 크기, 위치, 간격을 결정하는 것이 조판 규칙이다.

이 규칙들이 없으면:
- `a + b = c`에서 `+`와 `=` 주위의 간격이 같아져 연산자와 관계 기호의 시각적 구분이 사라진다
- 분수 안의 분수에서 위첨자가 분수선과 충돌한다
- 근호 안의 내용물이 근호선에 붙거나 지나치게 떨어진다
- 괄호 크기가 내용물과 맞지 않는다

이 자료는 약 100년간 축적된 수학 조판의 표준 관행을 기계가 읽을 수 있는 형태(JSON)와 사람이 읽을 수 있는 형태(Markdown)로 정리한 것이다.

---

## 원천 자료 (Sources)

### 01 — OpenType MATH 테이블 사양

- **문서**: [OpenType MATH Table Specification](https://learn.microsoft.com/en-us/typography/opentype/spec/math)
- **발행**: Microsoft, OpenType 사양의 일부
- **성격**: 폰트 파일 안에 수학 레이아웃 수치를 저장하는 국제 표준 포맷
- **추출 내용**: MathConstants 테이블의 51개 상수 (분수, 첨자, 근호, 악센트, 구분자, limits, 간격 등), MathGlyphInfo(글리프별 위치 보정), MathVariants(가변 크기 글리프)
- **의의**: 현대 수식 렌더링 엔진(브라우저, 워드프로세서, 조판 시스템)이 폰트에서 레이아웃 수치를 읽는 공통 인터페이스. 폰트 독립적인 수식 레이아웃의 기반.

### 02 — Cambria Math 설계 문서

- **문서**: [Mathematical Typesetting: Solutions from Microsoft](https://learn.microsoft.com/en-us/typography/cleartype/pdfs/cambriamath.pdf)
- **저자**: Ross Mills, John Hudson (편집); Richard Lawrence, Murray Sargent (기고)
- **발행**: Microsoft, 2007
- **성격**: 최초의 상업용 수학 전용 폰트(Cambria Math)를 설계하면서 정리한 수학 조판 원칙과 설계 의도
- **추출 내용**: 21개 설계 원칙 — 옥스포드 규칙의 역사적 맥락, 크기별 전용 글리프(ssty), 수학 커닝(높이별 4사분면), 이탤릭 보정, 악센트 부착점, 변형/조립식 글리프, 화면 렌더링 최적화
- **의의**: "왜 이 수치인가"에 대한 설계 근거(rationale)를 제공. OpenType MATH의 각 상수가 **어떤 시각적 목표**를 달성하기 위해 존재하는지를 설명한다.

### 03 — TeX 레이아웃 규칙

- **문서**: TeXbook Appendix G (Donald Knuth, 1984) — 저작권 보호 원문 대신 공개 구현에서 재구성
- **구현 참조**: [KaTeX 소스코드](https://github.com/KaTeX/KaTeX/tree/main/src), TeX by Topic (Victor Eijkhout), TeX 소스(tex.web)
- **성격**: Knuth가 1928년 옥스포드 규칙(Oxford Rules)과 Monotype 조판기의 동작을 디지털 알고리즘으로 변환한 것. 수학 조판의 사실상 표준(de facto standard).
- **추출 내용**: 8x8 원자 간격 매트릭스(display/text vs script/scriptscript), 8가지 수학 스타일과 전환 규칙, sigma/xi 폰트 파라미터 35개(값 포함), 14개 핵심 레이아웃 알고리즘(분수, 첨자, 근호, 악센트, 구분자, limits)의 의사코드
- **의의**: 추상적 규칙을 **구현 가능한 알고리즘**으로 변환한 유일한 원천. "이 상황에서 이 값을 이 순서로 비교하여 최종 위치를 결정한다"는 수준의 정밀한 절차를 제공한다.

> **옥스포드 규칙(1928/1954)에 대해**: TeX 레이아웃 규칙은 옥스포드 대학 출판부의 *The Printing of Mathematics*(Chaundy, Barrett, Batey, 1954)에 성문화된 활판 인쇄 시대의 조판 관행을 디지털 알고리즘으로 현대화한 것이다. 옥스포드 규칙의 간격 체계(thin/thick/em), 서체 규칙, 구조 배치 원칙은 모두 TeX의 atom spacing 매트릭스, 수학 스타일 시스템, 폰트 파라미터에 흡수되어 있으므로 별도 파일로 관리하지 않는다.

---

## 3개 원천의 관계

```
옥스포드 규칙 (1928/1954)
  │  활판 인쇄 시대의 성문화된 조판 관행
  │
  ├──→ TeX (1978/1984, Knuth)                    ← 03
  │      옥스포드 규칙을 디지털 알고리즘으로 변환
  │      35개 폰트 파라미터 + 18개 레이아웃 규칙
  │
  └──→ Cambria Math / OpenType MATH (2007, MS)   ← 01, 02
         옥스포드 규칙 + TeX 접근을 OpenType 폰트 표준에 통합
         51개 MathConstants + 글리프별 보정 데이터
```

각 원천은 같은 조판 원칙을 다른 추상화 수준에서 기술한다:

| 관점 | TeX (03) | OpenType MATH (01) | Cambria Math (02) |
|------|----------|-------------------|-------------------|
| 추상화 수준 | 알고리즘 + 파라미터 | 폰트 파일 데이터 포맷 | 설계 의도와 근거 |
| 역할 | **어떻게** 배치하는가 | **어떤 수치를** 폰트에서 읽는가 | **왜** 이 수치인가 |
| 형태 | 의사코드 + 수치 | 바이너리 테이블 스키마 | 서술 + 원칙 |

---

## 파일 구조

각 원천은 JSON(기계 판독용)과 Markdown(사람 판독용) 쌍으로 구성된다.

```
rules/typesetting/
├── README.md                              ← 이 파일
├── 01-opentype-math-constants.json        ← OpenType MATH 51개 상수 (구조화)
├── 01-opentype-math-constants.md          ← OpenType MATH 해설
├── 02-cambria-math-design-rationale.json  ← Cambria Math 21개 설계 원칙
├── 02-cambria-math-design-rationale.md    ← Cambria Math 해설
├── 03-tex-layout-rules.json               ← TeX 알고리즘 14개 + 간격 매트릭스 + 파라미터 35개
└── 03-tex-layout-rules.md                 ← TeX 레이아웃 해설
```

### JSON 스키마 요약

- **01**: `{ constants: [{name, description, category, data_type, typical_value, notes}], glyph_info_summary, variants_summary }`
- **02**: `{ sections: [{ topic, category, principles: [{id, rule, rationale, details, related_opentype_constants}] }] }`
- **03**: `{ atom_spacing_table: {display_and_text_style, script_and_scriptscript_style}, math_styles: {styles, transitions}, font_parameters: {sigma_parameters, xi_parameters}, layout_rules: [{id, category, description, algorithm, tex_parameters}] }`

---

## 준수 목표

이 규칙 데이터베이스는 다음을 준수하기 위해 제작되었다:

1. **간격의 의미적 계층**: 관계 기호(=, <) 주위는 넓게(5mu), 이항 연산자(+, −) 주위는 중간(4mu), 함수명 주위는 좁게(3mu), 괄호 직전/직후는 간격 없음. 이 계층이 수식의 구조를 시각적으로 전달한다.

2. **맥락 적응적 크기**: Display 수식은 넓고 여유 있게, 인라인 수식은 컴팩트하게, 첨자 안은 더 작게. 8가지 수학 스타일(D/D'/T/T'/S/S'/SS/SS')과 cramped 변형으로 각 맥락에 최적화된 크기와 위치를 결정한다.

3. **폰트 기반 수치**: 레이아웃 수치는 하드코딩이 아니라 폰트 메트릭(sigma/xi 파라미터, OpenType MathConstants)에서 가져와야 한다. 폰트가 바뀌면 레이아웃도 자연스럽게 적응한다.

4. **수직 기준선 체계**: 텍스트 기준선(baseline)과 수학 축(math axis)의 이중 기준선. 분수선, 마이너스 기호, 큰 연산자는 수학 축에 정렬되고, 일반 문자와 첨자는 텍스트 기준선에 정렬된다.

5. **충돌 방지 최소 간격**: 위첨자-아래첨자 간 최소 4배 선두께(0.16em), 분수선-분자/분모 간 최소 clearance, 근호-내용물 간 최소 여유 등 요소 간 겹침을 방지하는 하한값들.

6. **검증된 표준의 계승**: 1928년 옥스포드 규칙 → 1984년 TeX → 2007년 OpenType MATH로 이어지는 수학 조판 전통. 새로운 발명이 아니라 검증된 표준의 정확한 구현을 목표로 한다.
