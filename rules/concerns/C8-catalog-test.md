# C8 — 카탈로그·형식 매칭 테스트 필수

카탈로그에 수식 항목을 추가하거나, 형식(form)을 추가·변경하거나, 매칭 시그니처를 변경할 때 적용한다.

시각화의 앵커는 카탈로그 항목이 아니라 **형식**이다. 카탈로그는 이름과 설명을 소유하고 `form` 필드로 형식을 참조한다. 이름 없는 사례도 형식 사례이면 같은 시각화를 받는다.

## MUST

### 카탈로그

- 카탈로그 항목 추가 시 `src/analyzer/semantic/matchers/catalog-matcher.test.ts`에 해당 항목의 **대표 LaTeX → expectedId** 테스트 케이스를 추가한다. 배열은 매칭 경로를 따라 갈린다.
  - `patternType: 'exact' | 'structural'` — `CATALOG_TEST_CASES`. `matchCatalog`로 검증하고 점수 임계값을 함께 본다.
  - `patternType: 'chem'` — `CHEM_TEST_CASES`. 표기 정확 일치라 점수가 없으므로 실사용 경로인 `matchExpression`으로 검증한다. `matchCatalog`는 화학식 항목을 건너뛰므로 `CATALOG_TEST_CASES`에 넣으면 반드시 실패한다.
- 시그니처 또는 complexity 변경 시 기존 테스트가 깨지지 않는지 `pnpm test`로 확인한다.
- 테스트의 LaTeX는 실제 사용자가 입력할 법한 자연스러운 형태여야 한다.

### 형식

- 시각화를 붙이려면 **형식을 선언**하고 거기에 등록한다. 카탈로그 항목은 `form` 필드로 그 형식을 참조한다.
- 형식에는 `examples` 최소 3개(카탈로그 대표형 1 + 이름 없는 사례 2)와 `counterExamples` 최소 1개(가장 가까운 다른 형식의 대표 수식)를 넣는다.
- 형식 매칭 회귀 테스트는 **손으로 적지 않는다.** `examples`/`counterExamples`가 유일한 저작물이고 `form-matcher.generated.test.ts`가 positive·negative N×N·반례·결정성·모호성을 유도한다.
- 형식 간 진짜 포함관계는 `subsumes`로 **데이터에 선언**한다. 선언한 포함관계가 실제로 성립하는지도 생성 테스트가 검증한다.
- 코퍼스 오탐률 기준선(`matchers/precision-baseline.json`)은 **낮추는 방향으로만** 갱신한다. 개선한 커밋은 같은 커밋에서 기준선을 낮춰야 래칫 테스트가 통과한다.

## MUST NOT

- 테스트 케이스 없이 카탈로그 항목을 추가하지 않는다.
- 매칭 실패를 해결하기 위해 테스트 케이스를 삭제하지 않는다 (시그니처 또는 매처를 수정한다).
- `catalog/index.json`에 `visualizers` 필드를 재도입하지 않는다 — 시각화는 형식이 소유한다.
- 형식 매칭 케이스를 생성 테스트 밖에 손으로 쓰지 않는다 (증식이 멈춘다).
- N×N negative 실패를 화이트리스트로 무마하지 않는다. `subsumes`는 **진짜 포함관계일 때만** 선언한다.
- 화학식 항목에 `signature`를 부여하지 않는다. 반응식은 구조 패턴이 아니라 개별 항목이라 표기가 곧 정체성이다 — 시그니처를 주면 토큰 하나로 점수 1.0이 나와 어떤 화학식이든 그 항목으로 오탐한다. `CatalogIndexEntry`의 판별 union이 이미 막고 있으니 union을 무르지 않는다.
- `signature`의 중복 원소를 "정리"하지 않는다. 중복은 다중도 요구사항이다 — 피타고라스의 `power.exponent:2` ×3은 "제곱이 세 개"를 뜻하며, 지우면 요구가 "제곱이 하나라도"로 영구히 약화된다.
