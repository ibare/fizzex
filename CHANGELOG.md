# fizzex

## 0.6.0

### Minor Changes

- fix: the root entry no longer requires React

  **Breaking.** React components and the i18n Provider moved off the root.

  | Before                                                                                                                          | After                                               |
  | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
  | `import { EditorView } from 'fizzex'`                                                                                           | `import { EditorView } from 'fizzex/react'`         |
  | `import { FizzexI18nProvider } from 'fizzex'`                                                                                   | `import { FizzexI18nProvider } from 'fizzex/react'` |
  | `useFizzexLabels`, `useSuggestionLabel`, `useLocalizedSuggestions`, `useCategoryLabel`, `FizzexI18nProviderProps` from `fizzex` | the same names from `fizzex/react`                  |

  The same applies to `StreamView`, `SuggestionChips`, `SuggestionPopover`,
  `ExpressionExplorer` and their `…Props` types. `defaultLabels`, `FizzexLabels`
  and `PartialFizzexLabels` stay on the root — they are plain data and types.

  ***

  `react` is an optional peer dependency, but the root re-exported React
  components, so importing `fizzex` failed wherever React was not installed:

  ```
  Node:     Cannot find module 'react/jsx-runtime'
  esbuild:  Could not resolve "react"
  ```

  Bundlers fail too — module resolution runs before tree-shaking, so Vue and
  Svelte hosts hit it at build time. It had been this way since before 0.5.0, but
  0.5.0 made everyone step on it by documenting
  `import { loadLocale } from 'fizzex'` for non-React hosts.

  The root is now framework-neutral. Node, Vue and Svelte hosts can import
  `fizzex` directly, including `loadLocale` / `setLocale`. A test now fails if
  the root ever pulls in `react`, `react-dom` or `@tiptap/*` again.

## 0.5.0

### Minor Changes

- a34533d: feat: descriptions in ten languages

  **Breaking.**

  | Gone                                 | Instead                                            |
  | ------------------------------------ | -------------------------------------------------- |
  | `ExpressionAnalysis.summary: string` | `summary: AnalysisSummary` (facts, not a sentence) |
  | Korean by default                    | `en` by default + `loadLocale(code)`               |

  ***

  **Languages.** `en` `ko` `ja` `zh` `ar` `es` `fr` `hi` `id` `pt` — English by
  default, `ar` is RTL.

  Roles and descriptions for every part of a formula, the names of all 118
  chemical elements, 237 catalog entries, form descriptions, the explorer UI, and
  analysis summaries — 6,093 strings per language.

  ```tsx
  <FizzexI18nProvider locale="ja">
    <EditorView />
  </FizzexI18nProvider>
  ```

  Outside React, load it yourself. Skip this and descriptions come back empty
  rather than throwing — the lookups are synchronous, so they cannot wait.

  ```ts
  await loadLocale("ja");
  setLocale("ja");
  ```

  **No language ships in the bundle.** One locale is about 570KB; ten would be
  5.7MB that an English-only host still pays for. `loadLocale` pulls one through
  a dynamic import, so your bundler emits a chunk per language and downloads the
  one you ask for. Rendering a formula costs 96KB gzipped and no locale at all;
  adding descriptions costs about 97KB more.

  Catalog matching reads only the locale-independent index, so the same formula
  matches the same entry in every language. Language affects display alone.

  ***

  **Diagnostics are English from now on.** Parser warnings, schema messages and
  thrown errors — 64 of them — used to be Korean. They are not written for the
  reader of a formula, so they are not translation targets.

  **Analysis summaries carry facts instead of a sentence.** `generateSummary`
  used to assemble Korean prose, which meant the names of ten domains and five
  degrees lived inside computation code. Now it returns `AnalysisSummary`
  (variables, degree, functions, domains; reaction flags for chemistry) and
  `formatSummary` turns it into prose in whichever language you loaded.

  ```ts
  analysis.summary; // { variables: ['x'], degree: 2, functions: [], domains: ['polynomial'] }
  formatSummary(analysis.summary); // in the loaded language
  ```

  `AnalysisSummary` and the locale API (`loadLocale` `setLocale` `getLocale`
  `registerLocale` `getLoadedLocales` `formatSummary` `getUiTexts` `LOCALES`
  `DEFAULT_LOCALE` `isRtl` …) are exported from the root and from
  `fizzex/semantic`.

- f87a292: feat: chemical notation — `\ce{}`, unified script typesetting

  **Breaking.** `x^2` and `x_i` used to be separate nodes; they are now one
  `scripts` node. Code that touches the AST directly needs these changes.

  | Gone                             | Instead                             |
  | -------------------------------- | ----------------------------------- |
  | `PowerNode`, `SubscriptNode`     | `ScriptsNode` (`base` + four slots) |
  | `createPower`, `createSubscript` | `createScripts(base, slots)`        |

  `ChemNode` is new.

  ***

  **Chemistry.** Write mhchem notation inside `\ce{}`.

  ```
  \ce{2H2 + O2 -> 2H2O}      \ce{SO4^2-}        \ce{^{227}_{90}Th}
  \ce{N2 + 3H2 <=>[Fe] 2NH3}  \ce{CuSO4 * 5H2O}  \ce{BaSO4 v}
  ```

  Compounds, coefficients, charges, states, isotopes, hydrates, precipitate and
  gas marks, all six arrow forms with condition labels, complex ions, and `$...$`
  math spans — parsing, typesetting and round-tripping are closed over all of it.
  Round-tripping converges on a normal form rather than preserving characters
  exactly: `\ce{H_2O}` becomes `\ce{H2O}` and is idempotent from there.

  Inside a formula, symbols are read as chemistry. The superscript in `SO4^2-` is
  a charge, not an exponent; `+` separates species rather than adding them; left
  scripts are mass number and atomic number. Element symbols are called by name —
  all 118 carry a name, atomic number and one-line description. Fourteen
  representative formulas and equations are in the catalog.

  `analyzeExpression` classifies chemistry as chemistry: `primaryDomain:
'chemistry'`, `form: 'chemical-formula' | 'chemical-equation'`, plus reaction,
  reversible, isotope and charge features. It used to count the `+` in a reaction
  as addition and report `arithmetic`.

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
