# Cambria Math 설계 문서 요약

- **출처**: Mathematical Typesetting: Mathematical and Scientific Typesetting Solutions from Microsoft
- **편집**: Ross Mills & John Hudson (기고: Richard Lawrence, Murray Sargent)
- **URL**: https://learn.microsoft.com/en-us/typography/cleartype/pdfs/cambriamath.pdf
- **연도**: 2007
- **추출일**: 2026-04-13

---

## 1. 역사적 맥락과 옥스포드 규칙

### 옥스포드 규칙 (Oxford Rules)
- 1928년 Oxford University Press의 인쇄소장 John Johnson이 수학자 패널과 함께 수학 조판 규칙을 성문화
- 후임자 Charles Batey에 의해 T.W. Chaundy et al.의 *The Printing of Mathematics* (1950)로 출판
- **규칙의 절반 이상이 간격(spacing)에 관한 것** — 올바른 서체 선택만큼이나 각 요소의 올바른 배치가 핵심
- 이 규칙들은 Monotype 키보드와 주조기 사용을 위해 개발됨
- 1959년 Monotype 4-line 시스템으로 핫메탈 수학 조판이 "기술적 절정"에 도달

### 수학 조판의 근본적 난제
- 수학은 **비선형 2차원 구조** — 수식은 한 줄이 아니라 수직/수평으로 퍼져나감
- 기호의 **상대적 크기와 공간적 관계**가 의미를 전달
- 활판 인쇄 시대의 두 가지 어려움:
  1. 서체(sort)의 다양성 — 볼드, 이탤릭, 산세리프 등 다양한 스타일과 크기
  2. 2차원 배열 — 한 방향으로만 진행하는 일반 텍스트와 달리 수직/수평 모두 제어 필요

### TeX과의 관계
- Donald Knuth의 TeX은 래스터 기반 레이저 출력의 등장과 함께 수학 조판을 혁명적으로 바꿈
- TeX의 **박스-글루(box-glue) 모델**은 Monotype 기계의 물리적 작동에서 영감을 받음
- Computer Modern 서체는 Monotype Modern Series 7과 유사
- Microsoft는 TeX의 검증된 접근을 **OpenType + Unicode + MathML**에 통합
- 차이점: TeX은 사용자가 간격 세부사항을 직접 제어해야 하지만, Microsoft 방식은 많은 간격을 자동화

---

## 2. 폰트 설계 원칙

### 수학 전용 설계
- Cambria Math는 **처음부터 수학용으로 설계**된 최초의 상업 폰트 중 하나
- Jelle Bosma가 설계한 Cambria 패밀리의 확장 (원래 992 글리프 + 2,900 추가 글리프)
- ClearType 화면 렌더링에 최적화

### 이탤릭 형태의 차이
- 수학 이탤릭 글리프는 일반 Cambria Italic과 **형태와 간격이 다름**
- 수학에서는 모든 개별 문자/기호를 독립적으로 식별 가능해야 함
- Unicode 수학 영숫자 문자로 인코딩 (일반 이탤릭과 별도)

---

## 3. 크기별 스크립트 스타일 (ssty)

### 핵심 원칙
- 위첨자/아래첨자용 글리프는 **단순 축소가 아닌 크기별 전용 디자인** 사용
- 기계적 축소 시 문제: 획 가늘어짐, 내부 공간 축소, 형태 왜곡

### Cambria Math의 접근
| 수준 | 설명 | 특징 |
|------|------|------|
| Base | 기본 크기 | 원래 디자인 |
| Script (ssty 1) | 1단계 첨자 | 어센더/캡 높이 짧게, 인라인에서 컴팩트 |
| Script-script (ssty 2) | 2단계 첨자 | 매우 작은 크기에서 가독성 위해 더 높게 |

- 변형은 원래 크기로 디자인한 후 MATH 테이블 상수에 따라 축소
- `scriptPercentScaleDown` (권장 80%), `scriptScriptPercentScaleDown` (권장 60%)

---

## 4. 악센트 처리

### 납작한 악센트 (Flattened Accents)
- **flac** OpenType 피처: 높은 베이스(대문자) 위에 사용할 납작한 악센트 변형 제공
- `flattenedAccentBaseHeight` (권장: cap height) 초과 시 적용
- 악센트 모양만 변경, 위치는 레이아웃 엔진이 결정

### 점 없는 형태 (Dotless Forms)
- **dtls** OpenType 피처: i, j 등의 점 없는 변형 제공
- 악센트 부착 시 베이스로 사용 (점과 악센트의 충돌 방지)

### 악센트 부착점 (Accent Attachment)
- MATH 테이블의 TopAccentAttachment로 글리프별 수평 부착점 정의
- 글리프의 기하학적 중심 ≠ 시각적 중심 (특히 이탤릭)
- 부착점이 없으면 전진폭의 기하학적 중심 사용

---

## 5. 수학 커닝 (Math Kerning / Cut-ins)

### 높이별 커닝의 필요성
- 일반 커닝: 한 쌍의 글리프 간 단일 수평 값
- 수학 커닝: 글리프의 **높이에 따라 다른 커닝값** 필요
- 4개 사분면(upper-left/right, lower-left/right)에 독립적 커닝 테이블

### 작동 방식
1. MATH 상수로 위첨자/아래첨자의 수직 위치 계산
2. 베이스와 첨자의 인접 사분면 cut-in 값을 합산
3. 두 보정 높이에서의 합을 비교하여 최솟값으로 커닝

### 장점
- 글리프 형태에 기반한 정밀한 수평 배치
- 예: 기울어진 L의 상단 돌출부에 위첨자를 가깝게, 하단은 멀리
- 저해상도에서도 device-dependent 보정으로 최적 간격 유지

---

## 6. 이탤릭 보정 (Italics Correction)

### 사용 상황
1. **기울어진 문자 + 직립 문자**: 전진폭에 보정값 추가
2. **위첨자/아래첨자**: 기본 수평 위치 차이 결정
3. **N항 연산자의 상한/하한**: 상한 → 보정값의 절반만큼 오른쪽, 하한 → 왼쪽

### 적분 기호에서의 활용
- 적분 기호가 커질수록 동적 수직 조정이 필요
- 이탤릭 보정값 기반의 수평 조정이 cut-in보다 유연
- **일관된 기울기 각도** 유지: 상한/하한이 적분 기호의 기울기와 평행

---

## 7. 변형(Variants)과 조립(Assemblies)

### 변형
- 크기별로 미리 디자인된 글리프 변형 목록
- Cambria Math는 일부 문자에 대해 **최대 8개 변형** 제공

### 조립
- 상단/하단/좌/우 조각 + 중간 섹션으로 구성
- 확장자(extender) 조각은 반복/생략 가능
- `minConnectorOverlap`으로 최소 겹침량 지정 (반올림 오류 보상)
- 조립 알고리즘: 최소 크기 → 겹침 줄이기 → 확장자 추가 → 반복

---

## 8. 수학 객체와 간격

### 내장 수학 객체 목록

| 객체 | 인자 수 | 용도 |
|------|---------|------|
| accent | 1 | 베이스 위 악센트 |
| fraction | 2 | 분수 |
| stack | 2 | 분수선 없는 분수 |
| radical | 1-2 | 제곱근/N제곱근 |
| delimiters | 1 | 괄호/중괄호로 감싸기 |
| n-ary | 3 | 큰 연산자 + 상한/하한 |
| superscript | 2 | 위첨자 |
| subscript | 2 | 아래첨자 |
| subsup | 3 | 위첨자+아래첨자 |
| matrix | n×m | 행렬 |
| overbar/underbar | 1 | 윗줄/아랫줄 |
| equation array | n | 수평 정렬 수식 집합 |
| stretch stack | 1 | 늘어나는 문자 위/아래 |
| function apply | 2 | 함수명 + 인자 간격 |
| operator character | 1 | 연산자 간격 처리 |

---

## 9. 화면 렌더링 최적화

- Cambria Math는 **화면 환경 최초의 고품질 수학 조판용 폰트**
- ClearType 서브픽셀 렌더링으로 수평 해상도 3배 향상
- 글리프 힌팅으로 획 두께/비율 일관성 유지
- MATH 테이블의 device-dependent 조정값으로 특정 PPEM에서의 미세 보정
- 12pt, 145 PPI 화면에서도 선명한 렌더링 목표

---

## 10. 핵심 인용

> "조판은 특정 목적에 따라 인쇄 재료를 올바르게 배치하는 기술로 정의될 수 있다; 독자의 텍스트 이해를 최대한 돕도록 서체를 제어하는 것."
> — Stanley Morison, *First principles of typography*, 1951

> "좋은 표기법은 뇌에서 불필요한 작업을 모두 덜어주어 더 고급 문제에 집중할 수 있게 하며, 사실상 인류의 정신적 능력을 높인다."
> — Alfred North Whitehead, *An introduction to mathematics*, 1947
