# fizzex

## 0.5.0

### Minor Changes

- a34533d: feat: 설명을 열 개 언어로 제공한다

  **공개 표면이 바뀐다.**

  | 없어진 것 | 대신 |
  | --- | --- |
  | `ExpressionAnalysis.summary: string` | `summary: AnalysisSummary` (사실만 담는 구조체) |
  | 한국어 기본 | `en` 기본 + `loadLocale(코드)` |

  ---

  **언어.** `en` `ko` `ja` `zh` `ar` `es` `fr` `hi` `id` `pt` — 기본은 영어, `ar` 은 RTL.

  수식 각 부분의 역할·설명, 화학 원소 118개의 이름, 카탈로그 237항목, 형식 설명,
  탐색 패널 UI, 분석 요약까지 언어당 6,093개 문자열이다.

  ```tsx
  <FizzexI18nProvider locale="ja">
    <EditorView />
  </FizzexI18nProvider>
  ```

  headless 는 직접 부른다. 부르지 않으면 설명이 비어 나가고, 크래시하지는 않는다.

  ```ts
  await loadLocale('ja');
  setLocale('ja');
  ```

  **번들에는 언어가 실리지 않는다.** 로케일 하나가 570KB 라 열 개를 정적으로 넣으면
  5.7MB 가 되고 영어만 쓰는 호스트도 전부 내려받는다. `loadLocale` 이 동적 import 로
  필요한 언어만 가져오므로 번들러가 언어별 청크를 만들고 실행 시 하나만 받는다.
  예외는 UI 문구 영어본 2KB 뿐이다 — 아무 언어도 받지 않은 상태에서도 버튼은 나와야 한다.

  카탈로그 매칭은 로케일과 무관한 인덱스만 보므로 **어느 언어에서든 같은 수식이 같은
  항목에 매칭된다.** 언어는 표시에만 관여한다.

  ***

  **진단은 영어로 고정한다.** 파서 경고, 스키마 메시지, throw 64건이 한국어였다.
  사용자에게 보이지 않는 말은 번역 대상이 아니라고 정하고 영어로 옮겼다.

  **분석 요약이 문장 대신 사실을 낸다.** `generateSummary` 가 "변수 x의 2차 다항식"
  같은 한국어를 조립하고 있었다. 계산 계층은 언어를 모르는 것이 맞으므로
  `AnalysisSummary`(변수·차수·함수·도메인, 화학식이면 반응 여부)를 내고 문장은
  `formatSummary` 가 로케일을 보고 만든다.

  ```ts
  analysis.summary;            // { variables: ['x'], degree: 2, functions: [], domains: ['polynomial'] }
  formatSummary(analysis.summary);  // 로드한 언어로
  ```

  `AnalysisSummary` 와 로케일 API(`loadLocale` `setLocale` `getLocale` `registerLocale`
  `getLoadedLocales` `formatSummary` `getUiTexts` `LOCALES` `DEFAULT_LOCALE` `isRtl` …)가
  루트와 `fizzex/semantic` 양쪽에서 나간다.

- f87a292: feat: 화학식을 지원한다 — `\ce{}`, 첨자 조판 통합

  **공개 표면이 바뀐다.** `x^2` 와 `x_i` 가 각각 다른 노드였던 것을 `scripts` 한
  노드로 합쳤다. AST 를 직접 다루는 쪽은 아래를 바꿔야 한다.

  | 없어진 것                        | 대신                             |
  | -------------------------------- | -------------------------------- |
  | `PowerNode`, `SubscriptNode`     | `ScriptsNode` (`base` + 네 슬롯) |
  | `createPower`, `createSubscript` | `createScripts(base, slots)`     |

  `ChemNode` 가 새로 나간다.

  ***

  **화학식.** `\ce{}` 로 mhchem 표기를 쓴다.

  ```
  \ce{2H2 + O2 -> 2H2O}      \ce{SO4^2-}        \ce{^{227}_{90}Th}
  \ce{N2 + 3H2 <=>[Fe] 2NH3}  \ce{CuSO4 * 5H2O}  \ce{BaSO4 v}
  ```

  화합물·계수·전하·상태·동위원소·수화물·침전·기체, 화살표 6종과 조건 라벨,
  착이온, `$...$` 수식 삽입까지 파싱·조판·왕복이 닫혀 있다. 왕복은 문자 동일이
  아니라 정규형 수렴이다 — `\ce{H_2O}` 는 `\ce{H2O}` 가 되고 그 뒤로는 멱등이다.

  화학식 안에서는 기호를 화학의 말로 읽는다. `SO4^2-` 의 위첨자는 지수가 아니라
  전하이고, `+` 는 덧셈이 아니라 화학종 구분이며, 앞첨자는 질량수와 원자 번호다.
  원소 기호는 이름으로 부른다 — 118개 전부에 이름·원자 번호·한 줄 설명이 있다.
  대표 화학식·반응식 14건을 카탈로그에 올려 이름과 설명이 뜬다.

  `analyzeExpression` 은 화학식을 화학으로 분류한다. `primaryDomain: 'chemistry'`,
  `form: 'chemical-formula' | 'chemical-equation'`, 그리고 반응·가역·동위원소·전하
  특징이 나온다. 예전에는 화학식의 `+` 를 덧셈으로 세어 `arithmetic` 이 나왔다.

  **첨자 조판이 근본에서 고쳐졌다.** 위아래 첨자가 동시에 붙으면 서로 겹치고
  있었다 — 두 첨자 사이 간격이 −0.087em, 즉 위첨자 하단이 아래첨자 상단보다
  아래였다. TeX Rule 18a~18e 를 구현해 0.16em(`4·xi8`)이 됐다. `x_i^2` 같은
  평범한 수식도 함께 고쳐진다. 좌측 첨자(`{}^{227}_{90}Th`)도 새로 된다.

  **표준과 어긋나던 렌더 세 곳을 고쳤다.** KaTeX·MathJax 와 대조해 확인했다.

  - 전하가 아래첨자와 같은 x 에 세로로 쌓이던 것 — `SO4^2-` 의 `2-` 는 O 의
    지수가 아니라 화학종 전체의 전하다. 표준도 첨자마다 원자를 따로 만든다
  - 앞첨자가 왼쪽 정렬이라 좁은 쪽이 원소 기호에서 떨어져 보이던 것
  - `\xrightarrow` 계열 화살표가 축이 아니라 baseline 근처에 있고 라벨이 화살표에
    붙어 있던 것. 라벨 간격은 0 이었다

  지원하지 않는 표기라도 입력은 버리지 않는다. 결합(`-` `=` `#`)은 아직 결합선으로
  조판하지 않지만 경고를 내고 글자는 남긴다 — 버리면 `O=C=O` 가 `OCO` 가 되어
  다른 화학식이다.

  무엇이 되고 무엇이 왜 안 되는지는 `docs/chemistry-support.md` 에 있다.

## 0.4.0

### Minor Changes

- feat: 서버에서 수식을 그릴 수 있게 한다 — `fizzex/svg`, 폰트 배송, CommonJS 지원

  PDF 프린트 서버가 fizzex 를 부를 수 없었다. 세 가지가 겹쳐 있었다.

  - **CommonJS 에서 require 가 막혔다.** 패키지가 ESM 전용이라 `require('fizzex')` 가
    `ERR_PACKAGE_PATH_NOT_EXPORTED` 로 하드 실패했다. 이제 subpath 7개가 `import` 와
    `require` 양쪽에서 해석된다. 키와 기존 ESM 타깃은 한 글자도 바뀌지 않았다 — `require`
    는 실패하던 자리라 순수 추가다. 번들러는 `import` 조건만 보므로 CJS 산출물이 브라우저
    번들에 들어가지 않는다
  - **폰트가 배송되지 않았다.** tarball 에 폰트 파일이 한 개도 없었고, 브라우저 번들은
    `/fonts/NewCMMath-Regular.woff2` 라는 절대 URL 을 하드코딩 참조했다. 이제
    `fizzex/webfonts/*` 로 나가고(브라우저용 woff2, 서버용 otf), `fizzex/browser` 로
    Playwright 주입용 IIFE 번들에 접근할 수 있다. 번들 표면에 `setMathFontUrl` 을 노출해
    about:blank 호스트도 폰트를 물릴 수 있다
  - **서버 렌더 경로가 없었다.** `renderLatexToPNG` 는 `document.createElement('canvas')` 에
    의존해 Node 에서 죽는다

  ### `fizzex/svg` — DOM 없이 도는 벡터 조판

  ```ts
  import opentype from "opentype.js";
  import { renderLatexToSVG } from "fizzex/svg";

  const font = opentype.loadSync(/* fizzex/webfonts/NewCMMath-Regular.otf */);
  const { svg, width, height, baseline } = renderLatexToSVG("\\frac{a}{b}", {
    font,
  });
  ```

  글자를 `<text>` 가 아니라 글리프 윤곽선 `<path>` 로 내보낸다. 출력 SVG 에 폰트 참조가
  남지 않아 PDF 임베딩도, 수신자의 폰트 설치도 필요 없다. 폰트는 주입받으므로 fizzex 는
  opentype.js 에 의존하지 않는다 — `unitsPerEm` 과 `charToGlyph()` 를 가진 객체면 된다.

  조판 로직은 새로 쓰지 않았다. `Projector` 가 이미 `Surface` 로만 그리고 있어서
  `SvgSurface` 구현체 하나를 끼우는 것으로 분수·근호·구분자·행렬이 그대로 나온다.

  ### `FontMetrics` 가 실제 계약이 되었다

  인터페이스가 메서드 3개뿐이라 아무도 타입으로 쓰지 못하고 구상 클래스
  `CanvasFontMetrics` 가 그 자리를 대신 채우고 있었다(64건). 실사용 표면 8개로 넓혀
  되돌렸다. 이제 호스트가 자기 `FontMetrics` 구현으로 `astToBox` 를 부를 수 있다.

  `CanvasFontMetrics` 생성자는 Canvas 2D context 대신 `TextMeasurer`(폭 측정자)를 받는다.
  `CanvasRenderingContext2D` 가 구조적으로 이를 만족하므로 기존 브라우저 코드는 그대로
  동작하고, 덤으로 `OffscreenCanvasRenderingContext2D` 도 넘길 수 있게 됐다.

## 0.3.0

### Minor Changes

- 10bebab: feat(exports): 계산 전용 서브패스 `fizzex/compute` 와 `fizzex/semantic` 을 연다

  - `fizzex/compute` — DOM·Canvas·프레임워크 없이 도는 파싱/평가/분석 진입점.
    Node 워커처럼 react 가 설치되지 않은 컨텍스트에서 쓴다. 루트(`.`)는 `./react` 를
    re-export 하고 그 안에서 `react` 를 import 하므로 그런 환경에서 로드 자체가 깨졌다.
    외부 패키지 의존 0, JSON 0
  - `fizzex/semantic` — 수식의 구조적 의미. 설명 카탈로그 JSON 500KB 가 함께 실리므로
    계산만 필요한 호스트가 비용을 물지 않도록 분리했다
  - 루트에서 나가던 심볼은 그대로 두고 `tolerantParse` 와 `MathNode` 유니온 멤버
    (`AccentNode`, `CasesNode`, `SpaceNode` 등 9종)를 새로 노출한다. AST 를 순회하는
    소비자가 각 분기를 명명할 수 있어야 한다
  - 호환용 re-export shim `analyzer/semantic-roles.ts` 제거. 소비자를
    `analyzer/semantic/index.js` 직행으로 통일했다
  - `src/__tests__/subpath-isolation.test.ts` 신설 — import 그래프를 정적으로 훑어
    서브패스 격리(C6)를 회귀 테스트로 고정한다

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
