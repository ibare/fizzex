---
'fizzex': minor
---

feat: 설명을 열 개 언어로 제공한다

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
