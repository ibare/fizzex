# fizzex

## 0.2.0

### Minor Changes

- 탐색 진입점에 자격 게이트를 도입하고, 평가·분석 계약을 정직하게 다시 세웠다.

  **Breaking**

  - `ExplorerTriggerOptions.hoverIcon: boolean` 을 `visibility: 'none' | 'hover' | 'always'` 로 교체했다. `hoverIcon: true` 는 `visibility: 'hover'` 다. 표시 정책이 문맥마다 달라야 하기 때문이다 — 본문에 섞이는 인라인 수식은 호버, 쇼케이스·편집기는 상시(호버가 없는 터치 기기와 키보드 사용자가 도달할 수 있는 유일한 정책).
  - 수학 상수 이름을 가진 심볼이 더 이상 자동으로 읽기 전용이 아니다. `φ` 는 황금비이기도 하고 각도이기도 하며 `γ` 는 로런츠 인자로 쓰인다. 어느 쪽인지는 카탈로그가 `kind: 'constant'` 로 말해줄 때만 알 수 있으므로, 말이 없으면 조절 가능한 값으로 둔다. `∞` 만 예외다.

  **탐색 진입점**

  - 탐색 모드의 고유 산출물(정식 이름 배너·시각화 칩·값 배지·파라미터 범위)이 전부 확정 매칭에서만 열린다. 그 조건을 진입 **전에** 물어 자격 없는 수식에는 아이콘을 띄우지 않는다. 미확정 매칭은 실측상 오탐이다 — 삼각 항등식이 "하디-바인베르크 법칙" 이 된다.
  - 판정은 렌더 시점에 AST 에서 파생한다. 건당 0.03ms 라 캐시를 두지 않는다. LaTeX 가 바뀌면 다시 계산되므로 무효화할 상태가 생기지 않는다.
  - 진입점을 광고하지 않을 뿐 진입을 막지는 않는다 — 더블클릭은 열려 있다.
  - 아이콘 구현이 headless 와 React 두 벌이던 것을 한 벌로 합쳤다.

  **새 API**

  - `judgeExplorable(ast)` — 탐색 진입 자격.
  - `MATH_CONSTANT_VALUES` — 상수 표준값. 통째로 펼쳐 쓰지 말 것. `analyzeBindings().constants` 중 호스트가 상수로 의도한 것만 골라 쓴다. `∞` 는 값이 없다(바인딩하면 진단이 나빠진다).
  - `analyzePolynomialProfile(ast)` — 정확한 차수·계수·형태. `analyzeExpression().polynomial` 은 `2^x`·`1/x`·`\sin x` 를 전부 1차라고 답하고 `x^2y + y^2` 를 3차가 아니라 2차로 본다. 이 파사드는 정규화 IR 위의 정확한 판정을 IR 을 노출하지 않고 내보낸다.

  **문서**

  - 상수 공급 계약을 README 에 명시했다. `evaluateSync` 는 `π` 도 `e` 도 자동 바인딩하지 않는다 — 상수가 편집 가능해야 "π 가 3이면 어떻게 될까" 를 물어볼 수 있기 때문이다. `evaluable: true` 는 "값이 나온다" 가 아니라 "노드 타입이 지원된다" 는 뜻이며, 무엇을 공급해야 하는지는 `analyzeBindings` 가 답한다.
  - 파서가 미인식 명령을 만나면 빈 노드를 만들고 `warnings` 에 `unknown_command` 를 싣는다는 것을 적었다.

## 0.1.1

### Patch Changes

- da75d45: docs: README 를 npm 패키지 viewer 시점으로 재작성

  - ASCII 박스/트리 다이어그램 제거 (렌더링 환경에 따라 깨질 위험)
  - 패키지 사용자와 무관한 내부 정보 제거: src 디렉터리 구조,
    Development 셋업, TODO 21항목, "What's in a Name?" 어원 설명
  - API Reference 를 카테고리별 bullet 로 압축. `fizzex/headless`
    실제 export 17개 모두 반영 (이전엔 2개만 문서화)
  - Browser Support 의 절대 버전 (Chrome 90+ 등 5년 묵음) 을
    "modern browsers + ES2020/Canvas" 로 단순화
  - 정확성 수정 - Euler bindings 키 `'\pi'` → `'π'`: LaTeX 명령은 unicode 로
    정규화되어 저장되므로 이전 키는 unbound 처리되어 결과가
    `undefined` 였음 - Visualization `baseUrl` 가이드의 `new URL('fizzex/visualizers/',
import.meta.url).href` 는 vanilla Node 의 ESM 에서 패키지
    specifier 를 해석하지 않으므로 작동하지 않음. 정적 호스팅 기준의
    단순 URL 예시 (`'/visualizers/'`) 로 교체
  - 분량 444 → 207 라인 (-54%)
