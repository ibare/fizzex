# Fizzex Visualizer JSON 표현층 · 런타임 엔진 설계

> 🚨 **이 문서의 JSON 예제는 복사해 쓸 수 없다. 설계 이력이지 사용 설명서가 아니다.**
>
> 2026-04-20 시점에 "무엇을 스키마로 표현할 수 있는가"를 검토한 기록이고, 그 뒤
> 런타임이 따로 진화했다. 예제와 실제 스키마의 어긋남이 **문서 전반에 걸쳐** 있다.
>
> **가장 넓게 퍼진 것 — Element 판별자가 틀렸다.** 이 문서는 `"type"` 을 48곳에서
> 쓰지만 실제 판별자는 **`"kind"`** 다(`"type"` 이 맞는 곳은 `state` 선언뿐).
> §4 도형 목록과 §5 컨테이너 목록 전체가 여기 해당한다.
>
> | 절 | 어긋남 |
> |---|---|
> | §3.3 · §3.4 · §3.5 | `theme.*`·`viewport.*` 내장 함수는 없다. `let` 은 `vars.` 가 아니라 bare 이름. 미정의 식별자는 로드 타임이 아니라 **렌더 타임 throw** |
> | §8.1 | `rect` 는 문자열이 아니라 객체. 종류는 셋이 아니라 넷. `polar` 는 throw. `padding` 은 객체만 |
> | §9.3 | `formulas`·`isStandard`·`baseline` 사용 — 전부 throw |
> | §10.1 | 배열이 아니라 `{gestures:[]}`. `event`/`target`/`preventDefault`/`set`/`tolerance` 필드 없음 |
> | §10.2 · §10.3 | preset 3종·`cursor` 미구현 |
> | §11 | 최상위 `style`·`position` 없음. 라인 `color` 는 `style.color` |
> | §12 | **3D 전체가 다르다.** `mesh`·`line3d`·`points3d`·`group3d` 없음, Geometry·Material 하위 객체 없음, `light` 는 `lightType`, 카메라는 최상위 필드 + 1회 평가, diff 없이 매 프레임 재구축 |
> | §13 | baseline·isStandard 미구현 |
> | §14.6~14.8 | 3D diff·이벤트 attach·공개 API 전부 다름 |
> | §16 | 완전 예제가 위 오류를 모두 포함 |
>
> **믿을 것은 셋이다** — 실제 계약은 `src/visualizer/runtime/validator/schema.ts`,
> 실제 예제는 `registries/default/*/spec.json`, 실제 구현 상태는
> [`visualizer-authoring.md`](./visualizer-authoring.md).
>
> 이 문서는 **설계 의도와 어휘의 유래**를 볼 때 읽는다.

> 설계 범위 · 기존 14개 내장 Visualizer(`src/visualizer/built-in/*`)가 가진 로직과 비주얼을 **JSON 선언 + 런타임 인터프리터**로 100% 재현한다. 최종 골은 에디터 사용자가 이 JSON을 GUI로 조립하는 환경이다.
>
> 기준일 · 2026-04-20. 실행 주체 · 저자 판단이 아닌 사용자가 결정.

---

## 0. 왜 JSON으로 가야 하는가

현재 Visualizer는 TypeScript 클래스로 작성되며, 매 프레임 `CanvasRenderingContext2D.ctx.XXX` 호출을 직접 수행한다. 이 구조는 두 가지 목표와 충돌한다.

1. **에디터** · 최종 목표는 사용자가 수식·시각 구성요소·인터랙션을 GUI로 조립하는 편집기. 에디터 사용자에게 `ctx.beginPath()` 호출을 노출하는 것은 "코딩 환경"이 되며, 편집기의 존재 의의를 지운다.
2. **호스트-퍼스트 재사용성** · 14개 렌더러는 같은 골격(배경 → 뷰포트 → 좌표계 → 기하 → 라벨 → 배지)을 반복적으로 인라인 재구현한다. 스키마 기반 조립은 호스트가 이 골격을 보장한다.

따라서 모든 Visualizer는 다음 한 쌍으로 축약되어야 한다.

- **선언** · `spec.json` · 파라미터, 파생값, 장면 노드 트리, 바인딩, 인터랙션.
- **실행** · 호스트 런타임 · spec을 파싱하고 매 프레임 evaluate-and-draw.

Visualizer는 그 자체로 **데이터**가 되고, 런타임은 유일한 실행 주체다.

---

## 0.5 용어집 · 편집기 사용자 관점

이 문서와 `spec.json`의 주요 용어. ★ = 편집기 UI 라벨·툴팁·에러 메시지에 직접 노출 가능한 어휘.

| 스키마 키 · 식별자                        | UI 라벨 (한국어) | UI Label (EN)     | 설명                                                                     |
| ----------------------------------------- | ---------------- | ----------------- | ------------------------------------------------------------------------ |
| `visualizer` (파일)                       | 시각화 ★         | Visualizer        | `spec.json` 파일 하나 = Visualizer 하나                                  |
| `renderer: "2d" \| "3d"` (최상위)         | 렌더러            | Renderer          | Canvas2D / Three.js 어댑터 선택                                           |
| `scenes[]`, env `scene.id` / `scene.style`| 장면 ★           | Scene             | 동일 데이터를 다른 시각적 메타포로 보여주는 변형 (구 `anchor`)            |
| `root`                                    | 루트 요소         | Root element      | Visualizer가 그리는 Element 트리의 루트                                   |
| `type: <element-kind>`                    | 요소 ★           | Element           | 트리 구성 단위. 하위 부류 = Shape / 컨테이너 / 제어흐름                   |
| `type: "rect" \| "circle" \| ...`         | 도형 ★           | Shape             | 그릴 수 있는 기본 기하 요소 (선/면/원/호/경로/텍스트/이미지 등)           |
| `type: "group"`                           | 묶음 ★           | Group             | 자식을 한 덩어리로 다루는 컨테이너                                       |
| `type: "if"`                              | 조건 ★           | If                | 조건에 따라 자식을 그릴지 결정                                           |
| `type: "repeat"`                          | 반복 ★           | Repeat            | 배열 또는 범위의 각 항목마다 자식을 반복 (구 `each`)                      |
| `type: "match"`                           | 분기 ★           | Match             | 값에 따라 여러 자식 중 하나 선택 (구 `switch`)                            |
| `type: "layout"`                          | 레이아웃 ★       | Layout            | 영역을 세로/가로로 분할                                                  |
| `type: "viewport"`                        | 뷰포트 영역       | Viewport region   | 자식들의 좌표를 특정 뷰포트에 스코프                                     |
| `catalog: "<cat>/<id>"` (최상위)          | 카탈로그 ★       | Catalog           | 이 Visualizer가 표현할 수식 — 카탈로그 항목의 슬래시 참조. 파라미터·derivedValues·constraints의 원천 |
| `parameters[]` (카탈로그 제공)             | 파라미터 ★       | Parameter         | 사용자 조작 가능한 입력 값 — **카탈로그에서 로드**, spec에 재선언하지 않음  |
| `formulas[]`, env `formulas.<id>`         | 수식 ★           | Formula           | 파라미터로부터 계산되는 파생값 — **카탈로그 `derivedValues` ∪ spec `localFormulas`** 합집합 (구 `derived`) |
| `formulas[].symbol`                       | 수식 기호         | Symbol            | 이 값이 수식에서 가리키는 기호 (LaTeX 표기 허용, 구 `formulaElement`)     |
| `localFormulas[]`                         | 지역 수식         | Local formula     | 시각화 전용 중간 계산. 카탈로그 `derivedValues`에 없는 렌더링 보조식 (예: `yNorm`, `dispX`) |
| `displayOptions`                           | 보기 옵션 ★       | Display option    | 호스트 제공 런타임 기능(재생 배속·카메라 등)의 opt-in. 수식·Expression과 무관 |
| `state[]`                                 | 내부 상태         | State             | 애니메이션·드래그 등 내부 변수                                           |
| env `context` 전체                         | 사용 가능 변수    | Variables         | Expression이 참조하는 이름 공간 (구 Env)                                  |
| `baseline`, `isStandard`                  | 기준값 ★         | Baseline          | 편집 모드에서 표준 파라미터 스냅샷. 변경 여부 비교의 기준                 |
| `overlay`                                 | 오버레이 ★       | Overlay           | 캔버스 위에 띄우는 HTML 정보 영역 (구 HUD)                                |
| `viewport: { kind: "time-value" }`        | 시간-값 뷰        | Time vs value     | x=시간, y=값 선형 플롯 (구 `timeValue`)                                   |
| `viewport: { kind: "fit-box" }`           | 자동 맞춤 뷰      | Fit to box        | bbox를 rect에 자동 스케일 (구 `bbox`)                                     |
| `viewport: { kind: "polar" }`             | 극좌표 뷰         | Polar             | 중심 + 반경/각도 좌표계                                                   |
| `animation.onFrame[]`                     | 프레임 훅         | On frame          | 매 프레임 실행될 상태 갱신 리스트 (구 `tick`)                             |
| `state[].onParamChange: "<id>"`           | 파라미터 변경 감지| On param change   | 해당 파라미터가 바뀐 프레임에 불리언을 true로 pulse (구 `watchParam` + `setTrueOnChange` 합본) |
| `autoplay` (의미만)                        | 자동 재생 ★      | Autoplay          | 시간 축 자동 진행                                                         |
| `interaction[]`                           | 상호작용 ★       | Interaction       | 포인터·휠 이벤트 처리                                                     |
| `preset: "drag-radius"` 등                 | 프리셋            | Preset            | 자주 쓰는 interaction을 한 줄로 표현                                     |
| `transform`                               | 변환 ★           | Transform         | 이동·회전·확대 (2D/3D 공통)                                               |
| `style`                                   | 스타일 ★         | Style             | 채움·테두리·폰트·라인대시 등                                              |
| `{ "en": ..., "<locale>"?: ... }` (객체)   | 다국어 텍스트     | i18n text         | 사용자 노출 문자열. `en` 필수, 그 외 locale 선택. Fallback: 요청 locale → `en` |

### 0.5.1 선정 근거 · 왜 이 용어들인가

이 용어 체계는 *"편집기 사용자(교사·학습자)가 UI에서 보게 될 단어"* 라는 단일 렌즈로 재검토된 결과다. 코드베이스 내부 이름이나 CS/엔진 관례(scene graph, node, primitive 등)는 기본값이 아닌 후보 중 하나로 취급했다.

- **Scene** — 동일 데이터를 다른 메타포로 보여주는 구조는 Three.js / Unity / Blender의 Scene 관례와 의미가 정확히 일치. 기존 `anchor`는 "추상 개념을 구체 현상에 앵커링" 이라는 피다지고직 내부 은유라 편집기 사용자에겐 전달력이 약했다.
- **Element** — HTML·Figma·벡터 편집 도구 공통 어휘. CS 트리의 "Node"보다 UI 조작 대상의 느낌이 강하다.
- **Shape** — Element 중에서도 "그릴 수 있는 기본 기하"는 별도 부류로 명명해 편집기 좌측 팔레트("도형 추가")가 자연스럽다. `Primitive`는 CS 전문용어.
- **Formula** — 엑셀·구글시트·Notion DB 공용. 수학 교육 맥락에도 자연스러움. 기존 `derived`는 프로그래머 색이 짙었다.
- **Match / Repeat** — 엑셀 `MATCH`·Framer의 "Repeat"과 같은 mental model. `switch` / `each`는 프로그래머 습관.
- **Overlay** — 디자인 도구에서 "오버레이"는 보편. `HUD`는 게임 용어라 교사 사용자에게 이질감.
- **Fit to box** — `bbox`는 CS 약어. 편집기에서 "자동으로 맞추는 뷰"라는 기능을 기능 그대로 서술.
- **On frame / On param change** — 각각 "매 프레임마다 실행"과 "파라미터가 바뀐 프레임에 한 번"의 트리거를 평이한 이벤트 핸들러 이름으로 표현. `tick`·`watchParam`·`setTrueOnChange` 같은 프로그래머 조합이 사라진다.
- **Catalog** — 수식 메타(입력 변수, 범위, 단위, 파생값, 제약)의 **단일 원천**. Visualizer 각자가 같은 정보를 재선언하는 중복을 제거한다. 에디터 사용자가 Visualizer를 만들 때 첫 단계는 "어떤 수식을 시각화할지" 카탈로그에서 선택하는 것.
- **Local formula** — `formulas[]`는 카탈로그 `derivedValues`(수식의 의미 있는 파생값)와 spec `localFormulas`(시각화 전용 중간 계산)의 **합집합**이다. "local"은 "이 Visualizer에만 국한된" 의미로, 에디터 사용자에게 "카탈로그에 없는 식"이라는 구분을 전달한다.
- **Display option** — `timeScale`(재생 배속), `camera`(3D 카메라 제어) 같이 **수식 외부의 렌더링 기능**. 호스트가 표준 세트로 제공하고, spec은 이름만으로 opt-in한다. 수식과 무관하므로 baseline/isStandard 대상 아님. Expression에 노출되지 않음.
- **i18n 객체** — 사용자 노출 문자열은 `{ "en": ..., "<locale>": ... }` 형식. `en` 필수. 카탈로그의 파일 분리 i18n과 달리 spec은 구조와 텍스트가 섞여 있어 per-string 객체가 자연스럽다. Fallback은 요청 locale → `en`.

### 0.5.2 단복수 규약

- `scenes[]` (배열) vs env `scene.*` (현재 활성 Scene) — 복수/단수로 구분. 문서 전체에서 일관 유지.
- `formulas[]` (배열) vs env `formulas.<id>` (id 접근) — 파이썬 `dict`와 동일하게 id-lookup.
- `parameters[]` vs env `params.<id>` — 선언은 전체 명칭, 접근은 짧은 접두사.

### 0.5.3 의미가 겹쳐 보이지만 다른 "anchor"

`fit-box` 뷰포트의 `hAlign`/`vAlign` 값 `{ kind: "anchor", target, min?, max? }`(§8.1)에서 쓰는 **정렬 anchor**는 기하 정렬 알고리즘의 "고정 기준점" 개념(HTML `scroll-snap-align`의 `start/center/end` 옵션과 동일 계열)으로, 과거 쓰였던 *Scene 의미의 anchor*(현재는 **Scene**으로 이름이 바뀜)와 전혀 다른 개념이다. 같은 단어가 두 용도로 남아 혼란을 부를 수 있어 명시해 둔다.

### 0.5.4 소유권 층위 · 어떤 필드가 어디서 오는가

spec.json의 필드는 세 층위로 구분된다. 이 구분은 런타임이 Context를 조립할 때 원천을 명확히 하고, 중복 선언을 금지하는 근거가 된다.

| 층위              | 책임              | 해당 필드 / 식별자                                                                                                                             |
| ----------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **카탈로그 원천** | 카탈로그 항목     | `parameters` (id, range, unit, step, scale), `formulas` 중 `derivedValues` 부분, `constraints`, `milestones`, `elementMeanings`                    |
| **Spec 원천**     | `spec.json`       | `catalog`(참조), `localFormulas`, `scenes`, `state`, `animation`, `viewports`, `interaction`, `overlay`, `root`, `theme`, 최상위 `name`/`description` |
| **호스트 제공**   | 런타임            | `displayOptions`에서 참조하는 실제 기능 (배속 로직·카메라 컨트롤·UI 슬라이더 등). spec은 이름으로 opt-in만.                                     |

원칙: spec은 카탈로그 소유 필드를 **재선언하지 않는다**. 중복 선언은 validator 에러.

### 0.5.5 i18n 규약

사용자 노출 문자열은 i18n 객체로 쓴다:

```jsonc
{ "en": "Speaker",   "ko": "스피커" }        // en 필수
{ "en": "Displacement" }                     // ko 생략 시 요청 locale → en 로 fallback
```

- **필수 locale**: `en`. Validator가 누락 시 오류.
- **Fallback 순서**: 요청 locale → `en`.
- **대상 필드**: 최상위 `name`/`description`, `scenes[].name`/`description`, `localFormulas[].label`, `overlay` 텍스트 요소의 정적 문자열, `displayOptions` override 라벨.
- **비대상**: 모든 id (`scene.id`, `localFormulas[].id`, `state[].id`), Expression 문자열, `symbol`(LaTeX 표기), `icon`/이모지, 색상 값.
- 카탈로그 데이터는 파일 분리 i18n(`data/catalog/<locale>/*.json`)을 쓰며 spec 객체와 형식이 다르다. 런타임은 양쪽을 동일 locale 기준으로 resolve한다.

---

## 1. 설계 원칙

### 1.1 호스트 프리미티브는 기하 단위여야 한다

`line`, `rect`, `roundRect`, `ellipse`, `circle`, `arc`, `filledArc`, `polygon`, `polyline`, `path`, `text`, `image`, `gradient`, `functionCurve` — 이것이 적정 레벨이다.

- ❌ `speaker(bodyW, diaphR, rippleCount, ...)` 같은 **도메인 특화 함수** 금지. 에디터에서 조립 불가, 파라미터 폭발.
- ❌ `ctx.beginPath` 자체 재노출 금지. ctx 얇은 래퍼는 에디터가 못 쓴다.
- ✅ 스피커·진자·전압계는 모두 `rect + ellipse + arc + line`의 **조립**으로 선언된다. 표현이 길어지는 것은 JSON의 장점(구조가 드러남)이지 단점이 아니다.

### 1.2 튜링 불완전 Expression

- 산술·삼각·대수·조건·벡터·색상 조합만 허용.
- `while`, `함수 정의`, `재귀`, `할당` 금지. 모든 식은 **순수 함수**.
- 파라미터 바인딩, 파생값 계산, 애니메이션 state 틱도 동일한 Expression 엔진.

### 1.3 이름·타입·기본값이 스키마의 일급 시민

`spec.json`에서 사용되는 모든 식별자(`params.a`, `formulas.c`, `state.t`, `frame.elapsed`, `scene.id`)는 명시적으로 선언된다. 미선언 참조는 로드 타임 오류.

### 1.4 2D·3D는 동일 최상위 스키마, 어댑터만 다르다

최상위 `renderer: "2d" | "3d"` 스위치. 2D Element는 Canvas2D 어댑터, 3D Element는 Three.js 어댑터로 dispatch. Expression DSL·state·interaction은 공유.

### 1.5 하위 호환 없음

개발 중 프로젝트이며, 옛 코드 경로·shim·legacy alias는 두지 않는다. 스키마가 바뀌면 14개 spec을 전량 갱신한다.

---

## 2. 최상위 스키마

> ⚠️ **아래 표에 `userBindings` 와 `derivatives` 가 빠져 있다.** 둘 다 실제 스키마의
> 최상위 필드이고(`runtime/types/spec.ts`), `userBindings` 는 **17개 spec 전부**가 쓴다.
> 사용자 LaTeX 변수를 params/bindings 슬롯에 매핑하는 정식 채널이다.

최상위는 **세 계층**의 합성이다:

1. **카탈로그 참조** — 수식 자체의 정체성·파라미터·파생값·제약·마일스톤이 한 번에 들어옴.
2. **Spec 고유 필드** — 비주얼라이저만의 해석: Scene, 지역 수식, Element 트리, 상호작용.
3. **호스트 opt-in** — `displayOptions`로 호스트 제공 기능(재생 속도 등)을 골라 쓴다.

```jsonc
{
  "$schema": "fizzex-visualizer/v1",
  "id": "sine-wave-2d",
  "catalog": "trigonometry-basic/sine-wave",

  "name":        { "en": "Sine Wave — 2D", "ko": "사인파 — 2D" },
  "description": { "en": "y = A sin(ωt + φ). Speaker, pendulum, tide, voltmeter scenes.",
                   "ko": "y = A sin(ωt + φ). 스피커·진자·조수·전압계 장면." },
  "renderer": "2d",

  "displayOptions": ["timeScale"],

  "scenes": [
    { "id": "speaker",
      "name":        { "en": "Speaker",   "ko": "스피커" },
      "description": { "en": "Diaphragm oscillation as a sine wave.",
                       "ko": "진동판 운동을 사인파로 시각화." },
      "style": { "color": "#7C3AED", "icon": "🔊" },
      "params": { "A": 1, "\\omega": 4.5, "\\varphi": 0 } },
    { "id": "pendulum",
      "name":        { "en": "Pendulum", "ko": "진자" },
      "description": { "en": "Small-angle swing.", "ko": "작은 각도의 왕복 운동." },
      "style": { "color": "#0EA5E9", "icon": "⚖️" },
      "params": { "A": 1, "\\omega": 2, "\\varphi": 0 } },
    { "id": "tide",
      "name":        { "en": "Tide", "ko": "조수" },
      "description": { "en": "Slow rise-and-fall of sea level.",
                       "ko": "해수면의 느린 상승·하강." },
      "style": { "color": "#10B981", "icon": "🌊" },
      "params": { "A": 1, "\\omega": 1, "\\varphi": 0 } },
    { "id": "voltmeter",
      "name":        { "en": "Voltmeter", "ko": "전압계" },
      "description": { "en": "AC voltage needle deflection.",
                       "ko": "교류 전압에 따른 바늘 편향." },
      "style": { "color": "#F59E0B", "icon": "⚡" },
      "params": { "A": 1, "\\omega": 3, "\\varphi": 0 } }
  ],

  "localFormulas": [
    // 카탈로그 derivedValues에 없고 이 비주얼라이저에서만 필요한 파생 식.
    // 현재 sine-wave는 추가 식이 불필요하지만 예시로 남긴다.
    // { "id": "peakAt", "label": { "en": "Peak time", "ko": "정점 시각" },
    //   "symbol": "t_{peak}", "expr": "(pi/2 - \\varphi) / \\omega" }
  ],

  "state": [
    { "id": "userDrivenT", "type": "bool",   "default": false },
    { "id": "autoT",       "type": "number", "default": 0 }
  ],

  "animation": {
    "onFrame": [
      { "set": "state.autoT",       "to": "if(state.userDrivenT, state.autoT, mod(state.autoT + frame.dt, 20))" },
      { "set": "state.userDrivenT", "to": "false" }
    ]
  },

  "viewports":  { "...": "§8" },
  "root":       { "...": "§5" },
  "overlay":    { "...": "§11" },
  "interaction":{ "...": "§10" },
  "theme":      { "...": "§7.3" }
}
```

최상위 필드 요약:

| 필드             | 출처        | 필수 | 설명                                                                   |
| ---------------- | ----------- | ---- | ---------------------------------------------------------------------- |
| `$schema`        | spec        | ✓    | 스키마 버전 문자열                                                      |
| `id`             | spec        | ✓    | 비주얼라이저 고유 식별자 (카탈로그 id와는 다름)                         |
| `catalog`        | spec        | ✓    | `"<category>/<id>"` 슬래시 참조. 파라미터·파생값·제약·마일스톤의 원천 |
| `name`           | spec        | ✓    | i18n 객체 (§0.5.5)                                                     |
| `description`    | spec        | ✓    | i18n 객체                                                              |
| `renderer`       | spec        | ✓    | `"2d" \| "3d"`                                                         |
| `displayOptions` | spec        |      | 호스트 제공 opt-in 목록 (§2.2a). 배열 생략 = 어떤 것도 쓰지 않음        |
| `scenes`         | spec        | ✓    | Scene 배열 (§2.5). 단일 Scene이어도 최소 1개 선언 필수                  |
| `localFormulas`  | spec        |      | 비주얼라이저 전용 파생 식 (§2.3)                                       |
| `state`          | spec        |      | 내부 상태 변수 (§2.4)                                                  |
| `animation`      | spec        |      | rAF 프레임 액션 (§9)                                                   |
| `viewports`      | spec        | ✓    | 좌표계 선언 (§8)                                                       |
| `root`           | spec        | ✓    | Element 트리 루트 (§5)                                                 |
| `overlay`        | spec        |      | HUD 레이어 (§11)                                                       |
| `interaction`    | spec        |      | 제스처 매핑 (§10)                                                      |
| `theme`          | spec        |      | 테마 팔레트 오버라이드 (§7.3)                                          |

카탈로그가 제공하는 `parameters`·`derivedValues`·`constraints`·`milestones`는 spec에서 **재선언하지 않는다**. 로더가 카탈로그를 합쳐 Context를 구성한다 (§14.1, §14.8).

### 2.1 Context (사용 가능 변수)

> ⚠️ **아래 표의 절반이 실제로는 주입되지 않는다.**
> 있는 것: `params` `state` `scene` `frame` — 그리고 표에 없는 `bindings`, `evalUser`(2D 전용).
> **없는 것: `formulas` `baseline` `isStandard` `theme` `viewport`.**
> `let` 바인딩은 `vars.<name>` 이 아니라 **bare 이름**으로 주입된다.

매 프레임 런타임이 식 평가용 Context(이름 공간 묶음)를 구성한다. `params`·`formulas`는 **카탈로그를 원천**으로 한다.

| 네임스페이스   | 원천                                                | 의미                                                                                                     | 접근 예                                      |
| ------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `params`      | 카탈로그 `parameterConfig`                          | 사용자 조작 값 (슬라이더, 에디터 편집). id·범위·단위·기본값 모두 카탈로그가 제공                         | `params.A`                                   |
| `formulas`    | 카탈로그 `derivedValues` ∪ spec `localFormulas`     | 파생 식 평가 결과. 두 출처 합집합. id 충돌 시 로드 타임 오류                                              | `formulas.x`                                 |
| `state`       | spec `state[]`                                      | 내부 상태 (애니메이션 전용)                                                                              | `state.autoT`                                |
| `frame`       | 호스트 런타임                                        | rAF 프레임 정보                                                                                          | `frame.dt`, `frame.elapsed`, `frame.width`, `frame.height`, `frame.isDark` |
| `scene`       | spec `scenes[]` + 런타임 활성 선택                   | 현재 활성 Scene                                                                                          | `scene.id`, `scene.style.color`              |
| `baseline`    | 런타임 (활성 Scene의 `params` 프리셋)               | 기준값 스냅샷. `params.*`·`formulas.*`만 포함. `displayOptions` 값은 baseline 대상 아님 (§13.1)           | `baseline.params.A`, `baseline.formulas.x`   |
| `isStandard`  | 런타임 계산                                          | 현재 `params`가 baseline과 동일한가                                                                      | `isStandard`                                 |
| `theme`       | 호스트                                               | 테마 팔레트 함수                                                                                          | `theme.background(isDark)`                   |
| `viewport`    | spec `viewports`                                    | 선언된 뷰포트별 `toScreen/scale`                                                                          | `viewport.plot.toScreen(x, y)`               |
| `vars`        | Element 트리 `let`                                  | 지역 바인딩                                                                                              | `vars.wallX`                                 |

`displayOptions` 값(예: 재생 배속)은 Context에 노출되지 않는다 — 호스트가 `frame.dt` 계산이나 카메라 변환 같은 **런타임 동작**에 직접 적용한다. Expression은 수식의 영역만 다룬다.

### 2.2 Parameter — 카탈로그가 소유

Parameter 정의는 **spec에 쓰지 않는다**. spec의 `catalog` 참조가 `"<category>/<id>"`를 가리키면, 로더가 카탈로그의 `parameterConfig`를 읽어 다음을 구성한다:

> ⚠️ 실제 구조는 두 파일로 갈린다. 아래 원문의 `<category>/<id>.json` 은 설계 시점 가정이다.
>
> - `data/catalog/index.json` — `{ version, entries[] }`. 항목 223개의 색인.
> - `data/catalog/<locale>/<category>.json` — **항목 id 를 키로 하는 평평한 객체**
>   (`entries[]` 가 아니다). `parameterConfig` 는 여기 있다.
>   예: `catalog/ko/astronomy.json` 의 최상위 키가 `kepler-third`, `hubble-law` …
>
> 로케일은 현재 `ko` 하나뿐이다.

| 카탈로그 필드       | Context 매핑                                          |
| ------------------- | ----------------------------------------------------- |
| `id`                | `params.<id>` 네임스페이스 키                         |
| `name`              | 슬라이더 라벨 (이미 카탈로그가 i18n 파일 분리 운영)   |
| `role`              | semantic role (amplitude, angular-velocity 등)        |
| `min`/`max`/`step`  | 슬라이더 범위·스텝                                    |
| `default`           | Scene 프리셋 미지정 시 초깃값                         |
| `unit`              | 단위 표시                                             |
| `kind`              | `"number" \| "integer"`                               |

spec이 파라미터 id를 **재선언하면 로드 타임 오류**다. Scene별 초깃값만 `scenes[].params`에서 덮어쓴다 (§2.5).

### 2.2a displayOptions — 호스트 opt-in

수식과 무관하지만 시각화에 필요한 **호스트 제공 기능**을 이름으로 골라 쓴다. 호스트가 표준 목록을 관리하며, spec은 그 중 일부를 `displayOptions: ["timeScale", ...]` 배열로 선언한다.

```jsonc
"displayOptions": ["timeScale"]
```

- 현재 표준 목록 (v1): `"timeScale"` (재생 배속 슬라이더). 향후 `"camera3d"`, `"grid"` 등 호스트 제공 기능이 추가되면 여기에 등록된다.
- 선언 효과: 호스트가 대응하는 UI(슬라이더·토글)를 렌더하고, 런타임이 내부적으로 적용한다 (예: `frame.dt *= timeScale`).
- **Expression에서 참조 불가**: `display.timeScale` 같은 식별자는 제공되지 않는다. 수식은 현실 시간 기준으로 쓰고, 호스트가 재생 속도만 뒤에서 조절한다.
- **baseline 비교 제외**: 사용자가 배속을 바꿔도 `isStandard`는 영향받지 않는다 (§13.1).
- Validator는 `displayOptions[*]`가 호스트 표준 목록에 있는지 검사한다.

### 2.3 Formula — 카탈로그 derivedValues ∪ spec localFormulas

> ⚠️ **합집합이 만들어지지 않는다.** `localFormulas` 는 중복 id 검사만 통과하고 어디서도 평가되지 않으며, 카탈로그 `derivedValues` 도 읽히지 않는다. `formulas.*` 는 throw 한다.

`formulas.*` 네임스페이스는 **두 출처의 합집합**이다.

1. **카탈로그 `derivedValues`** — 수식 자체의 파생값 (예: 피타고라스의 빗변 `c = sqrt(a² + b²)`). 수식이 변하지 않듯 이 값들도 모든 비주얼라이저에서 공통.
2. **spec `localFormulas`** — 이 비주얼라이저에서만 필요한 식 (예: 렌더링을 위한 중간 좌표 계산, 특정 표기에서만 의미 있는 값).

```jsonc
"localFormulas": [
  { "id": "peakAt",
    "label":  { "en": "Peak time", "ko": "정점 시각" },
    "symbol": "t_{peak}",
    "expr":   "(pi/2 - \\varphi) / \\omega" }
]
```

| 필드      | 타입         | 의미                                               |
| --------- | ------------ | -------------------------------------------------- |
| `id`      | string       | `formulas.<id>`로 참조. 카탈로그 `derivedValues` id와 충돌 금지 |
| `label`   | i18n 객체    | UI 라벨 (§0.5.5)                                   |
| `symbol`  | string?      | 수식 기호 (LaTeX 허용). 표기용                     |
| `expr`    | string       | Expression DSL. 결과가 유한하지 않으면 `undefined` 취급 |

spec이 카탈로그에 이미 있는 파생값을 다시 쓸 이유는 없다 — `c = sqrt(a² + b²)`는 카탈로그가 책임진다. `localFormulas`는 "수식의 공리가 아닌, 이 Visualizer만의 편의"에 한정한다.

### 2.4 State 정의

장면 렌더링에 영향을 주는 **내부 상태**. 슬라이더로 노출되지 않는다. 예: autoplay 타이머, 드래그 중 플래그. `animation.onFrame`에서만 mutate.

| 필드      | 타입                              | 의미                     |
| --------- | --------------------------------- | ------------------------ |
| `id`      | string                            | `state.<id>`로 참조      |
| `type`    | `"number" \| "bool" \| "string"` | 값 타입                  |
| `default` | 해당 타입                         | 초깃값                   |

### 2.5 Scene — spec이 소유

현재 14개 중 4개(`sine-wave`, `exponential-decay`, `compound-interest`, `freefall`)가 복수 Scene 기반이다. Scene은 같은 수식을 **어떻게 시각적으로 해석할지**의 선택이며, 이는 카탈로그의 영역이 아니라 Visualizer의 창의적 영역이다. 따라서 Scene은 spec이 전적으로 소유한다.

```jsonc
{ "id": "speaker",
  "name":        { "en": "Speaker", "ko": "스피커" },
  "description": { "en": "Diaphragm oscillation as a sine wave.",
                   "ko": "진동판 운동을 사인파로 시각화." },
  "style": { "color": "#7C3AED", "icon": "🔊" },
  "params": { "A": 1, "\\omega": 4.5, "\\varphi": 0 } }
```

| 필드          | 타입           | 필수 | 의미                                                                                    |
| ------------- | -------------- | ---- | --------------------------------------------------------------------------------------- |
| `id`          | string         | ✓    | `scene.id`로 참조 (§5.4의 `match`에서 분기)                                             |
| `name`        | i18n 객체      | ✓    | Scene 선택 UI 라벨                                                                      |
| `description` | i18n 객체      |      | Scene 설명 (툴팁·서브타이틀 등)                                                         |
| `style`       | 객체           |      | `{ color, icon }`. 테마·Element 트리에서 `scene.style.color` 등으로 참조                |
| `params`      | `{ [id]: num }` |     | 카탈로그 파라미터의 Scene별 초깃값. 선언되지 않은 파라미터는 카탈로그 `default` 사용    |

활성 Scene은 사용자 선택에 따라 전환되며, Element 트리는 `match on scene.id` (§5.4)로 분기한다. Scene이 바뀌면 baseline도 해당 Scene의 `params` 프리셋으로 갱신된다 (§13.1).

---

## 3. Expression DSL

### 3.1 리터럴 · 식별자

- 수치: `1.5`, `-3`, `6.5e-11`
- 불리언: `true`, `false`
- null: `null`
- 문자열: `"hello"` 또는 `'hello'` (색상·포맷 전용, 단일/이중 따옴표 등가)
- 배열: `[1, 2]` (2원소 벡터 또는 일반 배열)
- 객체 리터럴: `{ x: <e>, y: <e>, w: <e>, h: <e> }` (viewport rect 등에서 사용)
- 식별자: `A`, `params.A`, `formulas.x`, `frame.elapsed`

`params.A`와 `A`는 동치 (파라미터 네임스페이스가 기본 lookup). 충돌 시 `params.`가 우선순위를 명시한다.

### 3.2 연산자

산술 `+ - * / % **`, 단항 `-` `+` `!`, 비교 `== != < <= > >=`, 논리 `&& || !`, 삼항 `cond ? a : b`. 우선순위는 JavaScript와 동일.

### 3.3 내장 함수

> ⚠️ 아래 목록 중 **테마 팔레트와 기하(`viewport.*`) 항목은 존재하지 않는다.** 실제 내장 함수는 수치·벡터·조건·문자열·색상 **44개**뿐이다(상수 `pi`/`e`/`Infinity`/`NaN` 는 별도).

수치
: `sin cos tan asin acos atan atan2 sinh cosh tanh exp log log2 log10 pow sqrt cbrt hypot abs min max clamp lerp smoothstep floor ceil round mod sign isFinite isNaN`

- `clamp(x, lo, hi)`, `lerp(a, b, t)`, `smoothstep(e0, e1, x)`, `mod(a, b)` (수학적 modulo, 음수도 양의 결과).

벡터
: `vec2(x, y)`, `length(v)`, `dot(a, b)`, `normalize(v)`, `rotate(v, rad)`, `v.x`, `v.y`.

조건
: `if(cond, then, else)` (삼항과 동치), `switch(value, { "k1": expr, "k2": expr, "_default": expr })`.

문자열
: `format("c = {:.2f}m", formulas.c)` — Rust 스타일 포맷 스펙. `formatN(n, 2)` (`graphics/draw.ts`의 `formatN` 미러링, 자리수 적응). `toLocaleInt(n)` (천 단위 쉼표).

색상
: `hexAlpha("#RRGGBB", 0.5)` → `"rgba(r,g,b,0.5)"`. `mixColor(a, b, t)`. `rgba(r,g,b,a)`.

테마 팔레트 (host theme)
: `theme.background(isDark)`, `theme.gridLine(isDark)`, `theme.axis(isDark)`, `theme.text(isDark)`, `theme.divider(isDark)`.

기하
: `viewport.<id>.toScreen(wx, wy)` → `{x, y}`, `viewport.<id>.scale`, `viewport.<id>.rect`.

### 3.4 let 바인딩 (element-local)

> ⚠️ `vars.<name>` 이 아니라 **bare 이름**으로 주입된다. `vars.` 접두는 없다.

Element 트리 내에서 지역 변수 선언:

```jsonc
{ "let": { "wallX": "viewport.main.toScreen(0, 0).x",
           "groundY": "viewport.main.toScreen(0, 0).y" },
  "children": [ /* 여기서 vars.wallX 사용 가능 */ ] }
```

let은 **단일 평가** + **자식 scope**. 외부로 유출 없음. 한 let 블록 내부는 **선언 순서대로 평가**되어 뒤에 오는 바인딩이 앞선 바인딩을 `vars.<name>`으로 참조할 수 있다.

### 3.5 파서·평가기

> ⚠️ "네임스페이스 외 식별자는 **로드 타임** 오류"는 사실이 아니다. validator 는 식별자를 검사하지 않고, `expr/eval.ts` 가 **렌더 타임에 throw** 한다.

- 권장 구현: [jsep](https://github.com/EricSmekens/jsep) 기반 경량 AST (약 6KB).
- 안전성: 네임스페이스 외 식별자 참조 시 로드 타임 오류. Function/eval 경로 차단.

---

## 4. 2D Shape Elements

> ⚠️ 아래 예제의 판별자 `"type"` 은 실제로 **`"kind"`** 다. 필드 구성도 `schema.ts` 와 대조할 것.

Shape Element는 Element 트리 안에서 "실제로 그려지는" 기하 단위다. 모든 Shape의 공통 구조:

```jsonc
{
  "type": "<shape-kind>",
  "id?": "optional-id",
  "visible?": "<expr → bool>",  // 기본 true
  "opacity?": "<expr → number 0..1>",
  "transform?": Transform,       // §6
  "style?":     Style,           // §7
  "...shape-specific fields": {}
}
```

좌표는 **스크린 좌표**가 기본이다. 월드 좌표로 지정하려면 `viewport: "<viewport-id>"`를 덧붙이고 좌표에 world 값을 쓴다 — 런타임이 `toScreen`으로 변환한다. 또는 부모 Element가 `type: "viewport"` (§5.6)일 때 스코프로 상속된다.

### 4.1 rect / roundRect

```jsonc
{ "type": "rect",       "x": "<e>", "y": "<e>", "w": "<e>", "h": "<e>" }
{ "type": "roundRect",  "x": "<e>", "y": "<e>", "w": "<e>", "h": "<e>", "r": "<e>" }
```

### 4.2 circle / ellipse

```jsonc
{ "type": "circle",  "cx": "<e>", "cy": "<e>", "r": "<e>" }
{ "type": "ellipse", "cx": "<e>", "cy": "<e>", "rx": "<e>", "ry": "<e>",
  "rotation?": "<e>", "startAngle?": "<e>", "endAngle?": "<e>" }
```

### 4.3 arc / filledArc

```jsonc
{ "type": "arc",
  "cx": "<e>", "cy": "<e>", "r": "<e>",
  "startAngle": "<e>", "endAngle": "<e>",
  "counterclockwise?": "<e>" }

{ "type": "filledArc",
  "cx": "<e>", "cy": "<e>", "r": "<e>",
  "startAngle": "<e>", "endAngle": "<e>",
  "closure": "pie" | "chord" }   // chord = 현을 닫음, pie = 중심까지 선
```

### 4.4 line / polyline / polygon

```jsonc
{ "type": "line",
  "x1": "<e>", "y1": "<e>", "x2": "<e>", "y2": "<e>" }

{ "type": "polyline",
  "points": "<expr → [[x,y], ...]>" }         // stroke-only

{ "type": "polygon",
  "points": "<expr → [[x,y], ...]>",
  "closed?": true }                           // fill+stroke
```

### 4.5 path

SVG 유사 명령 배열. 복잡한 경로가 필요할 때 (현재 14개 중엔 드묾).

```jsonc
{ "type": "path",
  "commands": [
    { "M": ["<e>", "<e>"] },
    { "L": ["<e>", "<e>"] },
    { "Q": ["<e>", "<e>", "<e>", "<e>"] },
    { "C": ["<e>", "<e>", "<e>", "<e>", "<e>", "<e>"] },
    { "A": ["<cx>", "<cy>", "<r>", "<start>", "<end>"] },
    { "Z": true }
  ] }
```

### 4.6 text

```jsonc
{ "type": "text",
  "x": "<e>", "y": "<e>",
  "text": "<string-expr>",          // format() 통상 사용
  "style": {
    "font": "600 11px -apple-system, sans-serif",
    "fill": "<color-expr>",
    "textAlign": "left" | "center" | "right",
    "textBaseline": "top" | "middle" | "bottom" | "alphabetic",
    "stroke?": "<color-expr>",
    "maxWidth?": "<e>"
  } }
```

### 4.7 functionCurve

`src/graphics/curves.ts`의 `drawFunctionCurve` 미러링. quadratic 계열에서 필수.

```jsonc
{ "type": "functionCurve",
  "viewport": "plot",
  "xMin": "<e>", "xMax": "<e>",
  "fn": "<expr with `x`>",          // x는 이 curve의 지역 변수
  "segments?": 96,
  "skip?": "<expr with `x` and `y` → bool>",
  "style": { "stroke": "<color-expr>", "lineWidth": 2, "lineDash": [4, 3] } }
```

- `fn`/`skip`은 런타임이 `x`, `y`를 지역 Env에 넣고 평가.
- NaN/Infinity·skip=true인 샘플에서 경로가 단절 (기존 동작과 동일).

### 4.8 image

```jsonc
{ "type": "image",
  "src": "<url>",
  "x": "<e>", "y": "<e>", "w": "<e>", "h": "<e>" }
```

런타임이 `<img>` 프리로드·캐시 관리.

### 4.9 clip

Element 형태로 제공 (컨테이너). 자식은 이 사각/경로 안쪽만 draw.

```jsonc
{ "type": "clip",
  "shape": { "type": "rect", "x": "<e>", "y": "<e>", "w": "<e>", "h": "<e>" },
  "children": [ /* ... */ ] }
```

quadratic-basketball의 "floor 아래 궤적 잘라내기"가 이 노드로 표현된다.

### 4.10 gradient (style이 아닌 value)

gradient는 fill/stroke의 **값**이다 (§7.2). 별도 Shape가 아니다.

---

## 5. Element Tree · 컨테이너 · 제어흐름 Element

> ⚠️ 판별자는 `"kind"`. 그 밖에 이 절에서 어긋나는 것:
>
> - **`repeat.of`** — 필드는 있다. 값이 `{range:[start,end], step?}` 또는 `{items:<expr>}` **객체**다.
>   `step` 은 range 배열의 3번째 원소가 아니라 **형제 필드**다 — 배열에 넣으면 스키마가
>   catchall 이라 **검증을 통과하고 조용히 무시된다.**
> - **`layout` 의 `area`** — 자식에 주입되는 이름은 `__layoutArea` 다. `area.y` 를 쓰면 throw 하고,
>   그나마 읽는 곳이 없어 `layout` 자체가 동작하지 않는다.
> - **`let`** — `vars.` 없이 bare 이름.
> - **`key`**(3D diff) — 존재하지 않는다.

Shape Element가 "그리는 잎(leaf)"이라면, 이 장의 Element들은 **"조립하는 가지(branch)"** 다. 2D·3D 공통 개념.

### 5.1 group

```jsonc
{ "type": "group",
  "id?": "...", "transform?": Transform, "opacity?": "<e>",
  "let?": { "...": "<e>" },       // §3.4
  "children": [ /* Element */ ] }
```

children은 선언 순서대로 그려진다 (Painter's algorithm).

### 5.2 if

```jsonc
{ "type": "if",
  "cond": "<expr → bool>",
  "then": Element,
  "else?": Element }
```

### 5.3 repeat (구 each)

```jsonc
{ "type": "repeat",
  "of": "<expr → array>" | { "range": ["<start>", "<end>", "<step?>"] },
  "as": "i",                   // 인덱스 이름
  "key?": "<expr>",            // 3D diff용 (§12.8)
  "children": [ /* Element with vars.i */ ] }
```

- 배열 of: `{ "of": "[1,2,3]", "as": "v", ... }` → `vars.v`.
- `range`: `{ "range": ["0", "rungCount"] }` → `vars.i`.

### 5.4 match (구 switch) · Scene 라우터

Scene 기반 Element 분기.

```jsonc
{ "type": "match",
  "on": "scene.id",
  "cases": {
    "speaker":   Element,
    "pendulum":  Element,
    "tide":      Element,
    "voltmeter": Element
  },
  "default?":    Element }
```

`on`은 임의 식이지만 가장 흔한 용도는 활성 Scene에 따라 다른 Element 트리를 선택하는 것이다.

### 5.5 layout (split)

세로·가로 분할 레이아웃. 기존 코어 렌더러의 "상단 42% / 하단 58%" 패턴을 선언적으로 표현.

```jsonc
{ "type": "layout",
  "direction": "vertical" | "horizontal",
  "areas": [
    { "id": "top",    "ratio": 0.42, "children": [ /* ... */ ] },
    { "id": "divider","size": 0,      "children": [
      { "type": "line",
        "x1": 10, "y1": "area.y", "x2": "frame.width - 10", "y2": "area.y",
        "style": { "stroke": "theme.divider(frame.isDark)",
                   "lineDash": [3, 4], "lineWidth": 1 } }
    ] },
    { "id": "bottom", "ratio": 0.58, "children": [ /* ... */ ] }
  ] }
```

- 각 area는 자식 Context에 `area = {x, y, w, h}`를 주입.
- `ratio`와 `size`(픽셀 고정)를 혼합 가능. 합계가 1을 넘으면 ratio 정규화.

### 5.6 viewport (영역)

특정 뷰포트로 자식 전체를 스코프.

```jsonc
{ "type": "viewport",
  "use": "plot",
  "children": [ /* ... */ ] }
```

자식의 좌표 식별자 `x`/`y`가 월드 좌표로 해석된다 (별도 `viewport:` 필드 불요).

### 5.7 Root

최상위 `root`는 임의의 Element — 통상 2D에서는 `group` 또는 `layout`, 3D에서는 `group3d` (§12). 렌더러 종류(`renderer`)는 visualizer 최상위에 선언되므로 `root` 자체에는 모드 표기가 없다.

---

## 6. Transform

```jsonc
{ "translate?": ["<e>", "<e>"],
  "rotate?":    "<e>",                  // rad
  "scale?":     "<e>" | ["<e>", "<e>"],
  "origin?":    ["<e>", "<e>"],         // 기본 (0,0)
  "matrix?":    [[a,b,0],[c,d,0],[tx,ty,1]] }
```

- origin 지정 시 translate(origin) → rotate → scale → translate(-origin) 순서.
- `matrix`가 주어지면 다른 필드 모두 무시하고 raw affine 적용.

3D transform은 §12.4.

---

## 7. Style

### 7.1 기본 필드

```jsonc
{ "fill?":          ColorExpr | Gradient,
  "stroke?":        ColorExpr,
  "lineWidth?":     "<e>",
  "lineDash?":      "<expr → number[]>",
  "lineCap?":       "butt" | "round" | "square",
  "lineJoin?":      "miter" | "round" | "bevel",
  "font?":          "<string>",           // "600 11px -apple-system"
  "textAlign?":     "...",
  "textBaseline?":  "...",
  "globalAlpha?":   "<e>",
  "shadow?": { "color": "<c>", "blur": "<e>", "offsetX": "<e>", "offsetY": "<e>" } }
```

- `fill` 또는 `stroke`가 모두 없으면 `fill: "transparent"`로 그리지 않는다.
- `fill: "none"` 명시 가능.

### 7.2 gradient value

```jsonc
{ "kind": "linear",
  "x0": "<e>", "y0": "<e>", "x1": "<e>", "y1": "<e>",
  "stops": [ [0, "<color-expr>"], [1, "<color-expr>"] ] }

{ "kind": "radial",
  "cx0": "<e>", "cy0": "<e>", "r0": "<e>",
  "cx1": "<e>", "cy1": "<e>", "r1": "<e>",
  "stops": [ [0, "<c>"], [1, "<c>"] ] }
```

### 7.3 Theme 팔레트

> ⚠️ **미구현.** `theme.*` 는 Expression 컨텍스트에 주입되지 않아 **throw** 한다.
> 실제 spec 들은 `if(frame.isDark, '#0f172a', '#f8fafc')` 를 인라인으로 쓴다.

호스트 기본 팔레트는 `theme.background(isDark)` 등으로 Expression에서 참조한다. Visualizer가 자기 팔레트를 덮으려면 spec에 `theme` 섹션을 둔다.

```jsonc
"theme": {
  "palette": {
    "brand":    "#7C3AED",
    "brandBg":  "if(frame.isDark, hexAlpha('#7C3AED', 0.2), hexAlpha('#7C3AED', 0.14))",
    "floorBot": "if(frame.isDark, '#1f2937', '#fde68a')"
  }
}
```

참조: `"fill": "theme.palette.brand"`.

---

## 8. Viewport · Layout

### 8.1 선언

> ⚠️ `rect` 는 `"frame"`·`"area.top"` 같은 문자열이 아니라 `{ref}` 또는 `{x,y,w,h}` **객체**다. 종류는 넷(`frame-rect` 포함)이고 **`polar` 는 throw** 한다. `hAlign` 은 `'start'|'center'|'end'` 만, `padding` 은 객체만 받는다.

```jsonc
"viewports": {
  "plot": {
    "kind": "time-value",
    "rect":   "area.top",              // layout area id → {x,y,w,h}
    "xMin": 0, "xMax": 10,
    "yMin": "-0.5", "yMax": "max(4, formulas.vy * 1.3)",
    "yUp": true,
    "padding": { "top": 22, "right": 16, "bottom": 44, "left": 16 }
  },
  "tri": {
    "kind": "fit-box",
    "rect": "frame",                   // 전체 캔버스
    "bbox": { "minX": "-b", "maxX": "a + b",
              "minY": "-a", "maxY": "b + a" },
    "padding": 22
  },
  "ladder": {
    "kind": "fit-box",
    "rect": "frame",
    "bbox": { "minX": 0, "maxX": "max(a+1, 5)",
              "minY": 0, "maxY": "max(b+1, 6)" },
    "padding": { "top": 22, "right": 18, "bottom": 34, "left": 28 },
    "hAlign": { "kind": "anchor",
                "target": "frame.width / 3",
                "max": "frame.width - 18 - a * viewport.ladder.scale" },
    "vAlign": "end"
  },
  "orbit": {
    "kind": "polar",
    "center": { "x": "frame.width / 2", "y": "frame.height / 2" },
    "scale":  "(min(frame.width, frame.height) / (2 * max(params.a, 12742))) * 0.95"
  }
}
```

- `rect` 값: `"frame"`(전체), `"area.<id>"`(layout area), `"<expr → {x,y,w,h}>"`.
- `time-value` / `fit-box` / `polar` 세 종류 — 호스트 `src/graphics/viewport/*`에 1:1 대응.
- `fit-box`의 `hAlign`/`vAlign`은 `"start" | "center" | "end" | { kind: "anchor", target, min?, max? }` (bbox.ts의 `BBoxAlign`과 동일).
- `fit-box`에서 입력으로 쓰는 월드 박스는 필드명 `bbox`를 그대로 쓰되(기하 용어로 통용), 뷰포트 종류 이름만 `fit-box`로 구분한다.

### 8.2 사용

> ⚠️ **`viewport.*` 는 Expression 에서 접근할 수 없다** — 어댑터 내부 Map 이라
> 표현식에서 참조하면 **throw** 한다. Element 스코프(`kind: "viewport"`)만 동작한다.

- Expression: `viewport.plot.toScreen(x, y)`, `viewport.plot.scale`, `viewport.plot.rect.x` 등.
- Element에서 스코프: `{ "type": "viewport", "use": "plot", "children": [...] }`.

### 8.3 동적 뷰포트

뷰포트 정의 자체가 Expression이므로 매 프레임 재계산된다. 파라미터 변화에 반응.

---

## 9. Animation · Autoplay

### 9.1 onFrame (프레임 훅)

```jsonc
"animation": {
  "onFrame": [
    { "set": "state.autoT",
      "to": "if(state.userDrivenT, state.autoT, mod(state.autoT + frame.dt, 20))" },
    { "set": "state.userDrivenT", "to": "false" }
  ]
}
```

- `onFrame` 리스트는 매 프레임 **렌더링 직전** 순서대로 실행된다.
- `set.to` 평가 시 **이전 상태**의 state를 읽는다 (여러 set가 서로 의존하면 선언 순서대로 누적).

### 9.2 파라미터 변경 감지 · userDriven 감지

파라미터가 외부에서 변경되면 런타임이 자동으로 `state.userDrivenT = true`를 set (사용자가 `t`를 건드린 프레임만). 다음 `onFrame` 훅에서 `userDrivenT`를 본 로직이 autoplay를 억제한다.

```jsonc
"state": [
  { "id": "userDrivenT", "type": "bool", "default": false,
    "onParamChange": "t" }
]
```

`onParamChange`는 불리언 state 전용 shortcut이다 — "해당 파라미터가 바뀐 프레임에 한 프레임 동안 true로 pulse" 의미. 다음 `onFrame`에서 다시 `false`로 내리는 것은 `animation.onFrame`이 책임진다 (§9.1 두 번째 set).

### 9.3 주기 애니메이션 (kepler)

> ⚠️ 이 예제는 `formulas.period`·`isStandard`·`baseline.*` 를 쓴다 — 전부 throw. 실제 kepler 3D 회전은 spec animation 이 아니라 OrbitControls `autoRotate` 다.

```jsonc
"state": [
  { "id": "theta",    "type": "number", "default": 0 },
  { "id": "thetaStd", "type": "number", "default": 0 }
],
"animation": {
  "onFrame": [
    { "set": "state.theta",
      "to": "if(formulas.period > 0,
                mod(state.theta + 2*PI / (formulas.period / 600) * frame.dt, 2*PI),
                state.theta)" },
    { "set": "state.thetaStd",
      "to": "if(!isStandard && baseline.formulas.period > 0,
                mod(state.thetaStd + 2*PI / (baseline.formulas.period / 600) * frame.dt, 2*PI),
                0)" }
  ]
}
```

### 9.4 frame 네임스페이스

```
frame = { dt, now, elapsed, width, height, isDark }
```

`graphics/types.ts`의 `FrameInfo`와 동일.

---

## 10. Interaction

### 10.1 이벤트 선언

> 🚨 **스키마 형태가 다르다.** 배열이 아니라 `{gestures: [...]}` 이고, 제스처는 `{kind:"pointer"|"drag"|"wheel"}` 다. `event`·`target`·`preventDefault`·`set`·`tolerance` 는 없고, hitTest 는 `{shape:"circle"|"rect"|"canvas"}`(polygon 없음). 이벤트 객체는 `{x, y, deltaY}` 뿐이다.

```jsonc
"interaction": [
  { "event": "pointerdown",
    "target": "canvas",                           // 또는 Element id
    "when?": "<bool expr>",
    "do": [
      { "hitTest": { "kind": "circle",
                     "cx": "frame.width / 2",
                     "cy": "frame.height / 2",
                     "r": "params.a * viewport.orbit.scale",
                     "tolerance": 20 },
        "set": "state.dragging",
        "to": true } ] },

  { "event": "pointermove",
    "when": "state.dragging",
    "do": [
      { "setParam": "a",
        "to": "clamp(
                 hypot(
                   event.x - frame.width/2,
                   event.y - frame.height/2
                 ) / viewport.orbit.scale,
                 6500, 400000)" } ] },

  { "event": "pointerup",
    "do": [ { "set": "state.dragging", "to": false } ] },

  { "event": "wheel",
    "target": "canvas",
    "preventDefault": true,
    "do": [
      { "set": "state.camDistance",
        "to": "clamp(state.camDistance * exp(event.deltaY * 0.001),
                     1.4, 400)" } ] }
]
```

- `event` Env: `{ x, y, clientX, clientY, deltaX, deltaY, pointerId, button }` (스크린 좌표).
- `hitTest`는 circle / rect / polygon 중 하나. `tolerance`로 근처 허용 거리.
- `setParam`은 파라미터 변경 콜백 호출 (호스트→외부로 전달).
- `set`는 state 직접 변경.

### 10.2 고수준 내장 인터랙션

> ⚠️ **미구현.** `preset` 필드 자체가 스키마에 없다(`runtime/types/interaction.ts` 는
> `gestures[]` 만 받는다). 3D 궤도·줌은 spec interaction 이 아니라 Three.js
> OrbitControls(`camera.controls`)가 처리한다. `interaction` 을 선언한 spec 은 0개다.

공통 패턴을 짧게 쓰도록 제공.

```jsonc
{ "preset": "drag-radius",
  "param": "a",
  "center": "polar.center",
  "scale": "viewport.orbit.scale",
  "min": 6500, "max": 400000,
  "tolerance": 20 }

{ "preset": "orbit-camera",
  "state": { "theta": "camTheta", "phi": "camPhi" },
  "sensitivity": 0.006,
  "phiEps": 0.05 }

{ "preset": "wheel-zoom",
  "state": "camDistance",
  "min": 1.4, "max": 400, "factor": 0.001 }
```

내부적으로 §10.1 이벤트 리스트로 확장된다.

### 10.3 커서

> ⚠️ **미구현.** `cursor` 는 런타임에 0건이다.

```jsonc
"cursor": {
  "default": "grab",
  "when": { "state.dragging": "grabbing" }
}
```

---

## 11. Overlay (캔버스 상단 정보 영역)

> ⚠️ **예제를 그대로 쓰면 안 된다.** 실제 스키마(`runtime/types/overlay.ts`)의 라인은
> `label` / `value` / `format` / `visible` / `style` 뿐이다 —
> **`position`·`args`·`text`·`marginTop` 은 없다.** 최상위에도 `lines` 뿐이라 예제의
> `style`·`position` 은 들어갈 자리가 없고, 라인 직속 `color` 는 `style.color` 로 가야 한다.
> 게다가 아래 예제의 표현식은
> `formulas.*`·`baseline.*`·`isStandard` 라는 **주입되지 않는 이름**을 쓴다(§13 참조).
> Overlay 자체는 17개 spec 전부가 정상적으로 쓰고 있다.

HTML div 오버레이(kepler-orbit-3d처럼). 매 프레임 innerHTML이 갱신된다.

```jsonc
"overlay": {
  "position": "top-right",           // top-left | top-right | bottom-left | bottom-right
  "style": { "fontSize": 12, "lineHeight": 1.6 },
  "lines": [
    { "visible": "formulas.period > 0",
      "format": "주기: {}",
      "args": ["formatTime(formulas.period)"] },
    { "visible": "formulas.velocity > 0",
      "format": "속도: {:.2f} km/s",
      "args": ["formulas.velocity"] },
    { "format": "반지름: {} km",
      "args": ["toLocaleInt(round(params.a))"] },
    { "visible": "!isStandard && formulas.period == 0",
      "text": "이 우주에서 존재할 수 없음",
      "color": "if(frame.isDark, 'rgba(200,200,210,0.9)', 'rgba(100,100,110,0.9)')",
      "marginTop": 4 },
    { "visible": "!isStandard && formulas.period > 0 && baseline.formulas.period > 0",
      "format": "기준 대비 주기 {:.1f}% ({})",
      "args": [
        "formulas.period / baseline.formulas.period * 100",
        "if(formulas.period > baseline.formulas.period, '느림',
            if(formulas.period < baseline.formulas.period, '빠름', '동일'))"
      ],
      "color": "if(frame.isDark, 'rgba(248,113,113,0.9)', 'rgba(220,38,38,0.85)')" }
  ]
}
```

- `format` + `args`, 또는 `text` (정적) 중 하나.
- Overlay는 HTML이므로 `position: absolute` + z-index. pointer-events:none 기본.

Overlay가 과할 경우 **canvas 텍스트**로 대체 가능: 그냥 `text` Shape를 Element 트리에 추가하면 된다 (현재 quadratic-basketball의 배지가 그 예).

---

## 12. 3D 확장

> 🚨 **이 절 전체가 실제 3D 런타임과 다르다.** Element 는 `sphere`·`bufferLine`·`points`·`light`·`shaderMaterial` 5종뿐이고 `mesh`·`line3d`·`group3d` 는 없다. Geometry·Material 하위 객체도 없다(형상은 kind 로 직접, 재질은 `style`). `light` 는 `{kind:"light", lightType:…}`. 카메라는 `distance`/`theta`/`phi`/`lookAt`/`controls` 를 최상위에 두고 **1회만 평가**된다. §12.8 의 key 기반 diff 는 없다 — 매 프레임 전체 재구축이다.

### 12.1 renderer: "3d"

최상위 `renderer: "3d"` 로 선언된 Visualizer는 3D Element 트리 + 카메라를 가진다.

```jsonc
{
  "renderer": "3d",
  "camera": {
    "kind": "perspective",
    "fov": 50, "near": 0.05, "far": 2000,
    "state": {                                  // 구면좌표 카메라
      "theta": "camTheta",
      "phi":   "camPhi",
      "distance": "camDistance",
      "target": [0, 0, 0]
    }
  },
  "root": { /* Element3D */ }
}
```

`state.theta/phi/distance`는 §9의 state로 선언되어 있어야 한다. 카메라는 매 프레임 `lookAt(target)`으로 갱신.

### 12.2 Element3D 기본형

```jsonc
{ "type": "mesh",
  "id?": "earth",
  "visible?": "<e>",
  "transform?": Transform3D,
  "geometry": Geometry,
  "material": Material }
```

type: `mesh`, `line3d`, `points3d`, `light`, `group3d`, `if`, `repeat`, `match`.

### 12.3 Geometry

```jsonc
{ "kind": "sphere", "radius": 1, "widthSeg": 64, "heightSeg": 64 }
{ "kind": "box", "w": 1, "h": 1, "d": 1 }
{ "kind": "cylinder", "rTop": 0.5, "rBot": 0.5, "h": 1, "radialSeg": 32 }
{ "kind": "plane", "w": 1, "h": 1 }
{ "kind": "buffer",
  "positions": "<expr → Float32Array>",
  "indices?":  "<expr → Uint32Array>",
  "attrs?":    { "normal": "...", "uv": "..." } }
```

`buffer.positions`는 `repeat` 유사 Expression으로 생성: 예를 들어 궤도 링 160 세그먼트는 `range(0, 161).flatMap(i => [cos(i/160 * 2*PI) * r, 0, sin(i/160 * 2*PI) * r])`. 런타임은 첫 평가 시 캐시하고, 의존 값(여기서 `r = params.a / R_EARTH`)이 바뀔 때만 재계산.

### 12.4 Transform3D

```jsonc
{ "translate?": ["<x>", "<y>", "<z>"],
  "rotate?":    { "axis": "x"|"y"|"z"|[ax,ay,az], "angle": "<e>" } |
                { "euler": ["<rx>", "<ry>", "<rz>"], "order?": "XYZ" } |
                { "quaternion": ["<x>", "<y>", "<z>", "<w>"] },
  "scale?":     "<e>" | ["<sx>", "<sy>", "<sz>"] }
```

### 12.5 Material

```jsonc
{ "kind": "basic",
  "color": "<c>", "transparent?": true, "opacity?": 0.5, "depthWrite?": false }

{ "kind": "phong",
  "color": "<c>", "emissive?": "<c>", "specular?": "<c>", "shininess?": 18 }

{ "kind": "line",
  "color": "<c>", "opacity?": 0.5, "transparent?": true }

{ "kind": "points",
  "color": "<c>", "size": 1.2, "sizeAttenuation?": false }

{ "kind": "shader",
  "uniforms": {
    "uColor":     { "kind": "color", "value": "<c-expr>" },
    "uIntensity": { "kind": "float", "value": "<e>" }
  },
  "vertexShader":   "<GLSL string>",
  "fragmentShader": "<GLSL string>",
  "side?":          "front" | "back" | "double",
  "blending?":      "normal" | "additive" | "multiply" | "subtractive",
  "transparent?":   true,
  "depthWrite?":    false }
```

kepler atmosphere의 rim glow shader가 `shader` material 한 덩어리로 표현된다.

### 12.6 Light

```jsonc
{ "type": "light",
  "kind": "ambient" | "directional" | "point",
  "color": "<c>", "intensity": "<e>",
  "position?": ["<x>", "<y>", "<z>"] }
```

### 12.7 3D Interaction

orbit-camera, wheel-zoom preset (§10.2)으로 처리. raw 이벤트도 가능.

### 12.8 diff & dispose

Three.js 어댑터는 `repeat`/`match` 내부 Element 재생성 비용을 줄이기 위해 **key 기반 diff**를 한다. `repeat`에 `key` 속성이 있으면 재사용, 없으면 위치 기반. Element가 제거되면 `geometry.dispose()` + `material.dispose()` 자동 호출.

---

## 13. Baseline · 기준값 비교

> 🚨 **이 절 전체가 미구현이다. 여기 적힌 대로 쓰면 그림이 깨진다.**
>
> - `baseline` 과 `isStandard` 는 **Expression 컨텍스트에 주입되지 않는다.**
> - 미정의 식별자는 `expr/eval.ts` 가 **throw** 한다. `!isStandard` 든
>   `baseline.params.x` 든 같다. 증상은 어느 catch 에 걸리느냐로 갈린다 —
>   `animation.onFrame` 이면 그 프레임을 통째로 건너뛰어 **화면이 굳고**,
>   `root` 렌더면 **그 지점 이후가 전부 누락**되며, `overlay` 면 HUD 만 멈춘다.
>   경고는 `warnOnce` 가 직전과 같은 키만 억제하므로 두 곳이 함께 던지면
>   매 프레임 쏟아진다.
> - `runtime/baseline.ts` 는 씬 프리셋과 카탈로그 기본값을 머지해 `initialParams` 를
>   만드는 헬퍼일 뿐이고, `baseline.formulas` 자리에 호출부가 항상 `{}` 를 넘긴다.
> - §13.3 의 "편집 모드가 아니면 `baseline` 은 null" 조건은 코드에 없다 — 마운트
>   옵션에 편집 모드 플래그 자체가 없다.
> - 이 패턴을 쓰는 spec 은 **0개**다.
>
> 설계 의도는 유효하므로 남겨 둔다. 되살리려면 런타임 배선부터 해야 한다.

### 13.1 자동 제공

런타임은 Visualizer를 "편집 모드"에서 마운트할 때 `baseline` 네임스페이스를 제공한다.

- **baseline의 `params.*`** — 현재 활성 Scene의 `params` 프리셋. Scene 프리셋이 지정하지 않은 파라미터는 카탈로그 `parameterConfig.<id>.default`.
- **baseline의 `formulas.*`** — baseline `params`로 카탈로그 `derivedValues` + spec `localFormulas`를 평가한 스냅샷.
- **Scene 전환 시 갱신** — 활성 Scene이 바뀌면 baseline도 새 Scene의 프리셋으로 재계산된다. "현재 보고 있는 Scene의 표준값"이 baseline이기 때문이다.
- **`displayOptions` 값은 baseline 대상 아님** — 재생 배속 등 호스트 opt-in은 수식과 무관하므로 `isStandard` 판정에 영향을 주지 않는다.

사용자가 슬라이더로 파라미터를 바꾸면 `isStandard = false`가 되고, baseline은 유지된다.

### 13.2 ghost 렌더링 패턴

```jsonc
{ "type": "if",
  "cond": "!isStandard",
  "then": {
    "type": "functionCurve",
    "viewport": "plot",
    "xMin": 0, "xMax": "params.t",
    "fn": "params.A * sin(baseline.params.\\omega * x + baseline.params.\\varphi)",
    "style": { "stroke": "hexAlpha(theme.palette.brand, 0.28)",
               "lineWidth": 2, "lineDash": [4, 4] } } }
```

sine-wave abstract에서 기준 파형 ghost를 그리는 로직이 이 패턴 하나로 표현된다.

### 13.3 baseline-scoped expression

`baseline.params.<id>`, `baseline.formulas.<id>` 모두 읽기 전용. 편집 모드가 아니면 `baseline`은 `null`이며, `!isStandard`가 영구히 false여서 ghost 블록은 실행되지 않는다 (NullPointerException 없음 — 런타임이 short-circuit).

---

## 14. Runtime 엔진 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│  spec.json                                                       │
│      │                                                           │
│      ▼                                                           │
│  ┌──────────┐   ┌──────────────┐   ┌───────────┐                │
│  │  Loader  │──▶│  Validator   │──▶│  Compiler │                │
│  │          │   │ (schema/     │   │ (Expr →    │                │
│  │          │   │  lookup)     │   │  AST)      │                │
│  └──────────┘   └──────────────┘   └─────┬─────┘                │
│                                            │                     │
│                                            ▼                     │
│             ┌──────────────────────────────────────┐            │
│             │         CompiledVisualizer           │            │
│             │  { parameters, state, viewports,     │            │
│             │    root (AST), animation,            │            │
│             │    interaction, overlay }            │            │
│             └──────────────────────────────────────┘            │
│                         │                                        │
│                         ▼                                        │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                    Runtime                             │     │
│  │                                                        │     │
│  │  ┌──────────────┐    ┌───────────────┐               │     │
│  │  │  State Store │◀──▶│  Param Feed   │               │     │
│  │  │              │    │  (external)   │               │     │
│  │  └──────┬───────┘    └───────────────┘               │     │
│  │         │                                             │     │
│  │         ▼                                             │     │
│  │  ┌─────────────────────────────────────────────┐     │     │
│  │  │  Frame Loop (rAF)                            │     │     │
│  │  │    1. build Env                              │     │     │
│  │  │    2. run animation.onFrame (mutate state)   │     │     │
│  │  │    3. eval viewports                         │     │     │
│  │  │    4. eval formulas                          │     │     │
│  │  │    5. render root (2D or 3D adapter)         │     │     │
│  │  │    6. render Overlay                         │     │     │
│  │  └──────┬───────────────────────────────┬──────┘     │     │
│  │         │                                │            │     │
│  │         ▼                                ▼            │     │
│  │  ┌────────────┐                  ┌───────────┐       │     │
│  │  │  Canvas2D  │                  │  Three.js │       │     │
│  │  │  Adapter   │                  │  Adapter  │       │     │
│  │  └────────────┘                  └───────────┘       │     │
│  │                                                        │     │
│  │  ┌─────────────────────────────────────────────┐     │     │
│  │  │  InteractionManager                         │     │     │
│  │  │    · 캔버스/overlay 이벤트 리스너            │     │     │
│  │  │    · hitTest 평가 → set/setParam 디스패치   │     │     │
│  │  └─────────────────────────────────────────────┘     │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### 14.1 Loader

1. `JSON.parse` + zod/ajv 스키마 검증. 에러 메시지는 JSON pointer로 위치 지적.
2. `spec.catalog`(`"<category>/<id>"`) 파싱 → `getCatalogDetail(id, category)` 호출 (`src/analyzer/semantic/loader.ts`).
3. 카탈로그 누락·참조 불일치 시 로드 타임 오류.
4. 카탈로그 `parameterConfig`·`derivedValues`를 spec `localFormulas`·`scenes[].params`와 합쳐 **통합 메타데이터 번들**을 Compiler에 넘긴다.
5. `displayOptions` 배열 각 항목이 호스트 표준 목록에 있는지 확인.

### 14.2 Validator

다음을 검사:

- 파라미터 id 유일성, 식별자 유효성.
- formulas/state/viewport/scenes id 충돌 없음.
- Element 트리·animation·interaction 안에서 참조된 모든 식별자가 선언되어 있는가.
- `viewport.<id>` 참조, `vars.<name>` 참조 경로.
- enum 값 정합성 (`textAlign`, `lineCap` 등).

### 14.3 Compiler

- Expression 문자열 → AST (jsep). 파싱 오류는 spec pointer와 함께 throw.
- Element 트리도 단일 AST로 컴파일 — Shape 타입과 자식 관계를 풀어 `instanceof` 없이 enum 기반 dispatch.
- `let` 바인딩·`repeat`·`match`·`if`·`viewport` scope를 위해 **Context 체인**을 유지하는 draw closure 생성.

### 14.4 Context 체인

단순 `{ parent, locals }` 체인. lookup은 locals → parent 순. 성능이 문제면 flat scope로 컴파일(LICM 형태)도 가능.

### 14.5 Canvas2D Adapter

dispatcher 테이블:

```ts
const draw2d: Record<ElementKind, (ctx, element, context, v2p) => void> = {
  rect:          drawRect,
  roundRect:     drawRoundRect,
  circle:        drawCircle,
  ellipse:       drawEllipse,
  arc:           drawArc,
  filledArc:     drawFilledArc,
  line:          drawLine,
  polyline:      drawPolyline,
  polygon:       drawPolygon,
  path:          drawPath,
  text:          drawText,
  image:         drawImage,
  functionCurve: drawFunctionCurve,
  clip:          drawClip,
  group:         drawGroup,
  if:            drawIf,
  repeat:        drawRepeat,
  match:         drawMatch,
  layout:        drawLayout,
  viewport:      drawViewportScope,
};
```

각 draw 함수:

1. Context에서 필요한 값 평가 (transform, style, 좌표).
2. `ctx.save()`.
3. style 적용 (`fillStyle`, `strokeStyle`, `setLineDash` 등).
4. transform 적용 (`setTransform` 또는 `translate/rotate/scale`).
5. Shape 경로 그리기 → `fill`/`stroke`.
6. 자식 재귀 (group/if/repeat/match/layout/viewport/clip).
7. `ctx.restore()`.

기존 `src/graphics/draw.ts`의 `roundRect`, `hexAlpha`, `formatN`, `drawFunctionCurve`(`src/graphics/curves.ts`)는 그대로 호출.

### 14.6 Three.js Adapter

> ⚠️ **실제와 다르다.** "업데이트만, 재생성 금지 / key 기반 diff" 는 미구현이고,
> 매 프레임 `disposeChildren` → 전체 재구축한다(결정 D2, 보수적 선택). 카메라도
> 매 프레임 sync 가 아니라 setup 1회 pose 평가 후 OrbitControls 에 위임한다.

- 최초 `mount`: Element 트리 AST를 순회하며 Mesh/Line/Points/Light 생성. dispose 대상 등록.
- `onFrame`:
  - transform/visible/material uniforms **업데이트만**. 재생성 금지.
  - `repeat`/`match`는 key 기반 diff: 자식 집합이 바뀌면 add/remove + dispose.
  - `geometry.buffer.positions` 식이 외부 값에 의존하면 그 의존만 diff하여 `attribute.needsUpdate = true`.
- `unmount`: 등록된 모든 geometry/material dispose, renderer.dispose.

구면좌표 카메라 상태(`camTheta/camPhi/camDistance`)는 state로 주어지고, 매 프레임 `camera.position.set(...)` + `lookAt(target)`.

Overlay는 별도 DOM element로 attach (3D에서만). `overlay.lines`는 innerHTML 단위로 재구성.

### 14.7 InteractionManager

> ⚠️ `move`/`up` 은 window 가 아니라 **canvas 에 attach** 되고 `setPointerCapture` 로
> 캔버스 밖 드래그를 추적한다.

- 마운트 시 spec.interaction 또는 preset을 확장하여 단일 이벤트 디스패처 구성.
- pointerdown/move/up/wheel은 캔버스 요소에 attach. `move`/`up`은 window (drag 밖으로 나가도 추적).
- `hitTest` + `when` 가드 → do-list 순서대로 실행.
- `setParam(id, value)` 호출 시 외부 `paramChangeCallback(id, value)` 트리거. 이는 Visualizer 프레임워크 상위 레이어(슬라이더 UI, 편집 모드 사용자 입력)에서 구독.

### 14.8 외부 API (Visualizer 어댑터)

> ⚠️ **폐기된 API 다.** 실제 공개 API 는 `createVisualizer(container, opts)`(async) +
> `createVisualizerRegistry` + `compileSpec` 이다. `FizzexVisualizer` 의
> `mount/update/resize/unmount` 프로토콜은 없고, 반환값에 `parameters`·`formulas` 도 없다.

기존 `FizzexVisualizer` 프로토콜(mount/update/resize/unmount)을 유지하되, `mount`는 spec + 카탈로그를 로드하여 Runtime 인스턴스를 생성한다.

```ts
export function createVisualizerFromSpec(spec: VisualizerSpec): FizzexVisualizer {
  // 1) 카탈로그 해석
  const [category, catalogId] = splitCatalogRef(spec.catalog); // "trigonometry-basic/sine-wave"
  const catalog = getCatalogDetail(catalogId, category);
  if (!catalog) throw new Error(`catalog not found: ${spec.catalog}`);

  // 2) 통합 메타데이터
  const parameters = catalog.parameterConfig;                  // 카탈로그 원천
  const formulas = [
    ...catalog.derivedValues.map(toFormulaRef),                // 카탈로그 원천
    ...(spec.localFormulas ?? []).map(toFormulaRef),           // spec 원천
  ];
  assertNoIdCollision(formulas);                               // Loader도 검사하지만 안전망

  const compiled = compile(spec, catalog);

  return {
    id: spec.id,
    name: spec.name,                  // i18n 객체 그대로 전달 — 소비자가 locale 해결
    description: spec.description,
    parameters,                       // 카탈로그 원천
    scenes: spec.scenes,              // spec 원천 (i18n name/description, style, params 프리셋)
    formulas: formulas.map(f => ({
      id: f.id, label: f.label, symbol: f.symbol,
      compute: (p, ctx) => evalFormula(compiled, f.id, p, ctx),
    })),
    displayOptions: spec.displayOptions ?? [],

    mount(container, options) {
      runtime = new VisualizerRuntime(container, compiled, options);
    },
    update(ctx) { runtime?.update(ctx); },
    resize(w, h) { runtime?.resize(w, h); },
    unmount() { runtime?.destroy(); runtime = null; },
  };
}
```

외부 API 필드명(`parameters`, `scenes`, `formulas`, `displayOptions`)은 스키마·편집기 UI와 동일 용어를 쓴다 — 하위 호환 용어(`anchors`, `derivedValues`)는 두지 않는다 (no-back-compat 원칙).

기존 TS 클래스 기반 14개 Visualizer는 전부 spec.json으로 대체된다.

---

## 15. Visualizer 역매핑 · 커버리지 검증

> ⚠️ **아래 표는 14개 기준이다. 현재 레지스트리는 17개** — `complex-plane-2d`,
> `linear-transform-2d`, `tangent-explore-2d` 가 빠져 있다.
> 커버리지 체크는 아래에서 실측으로 교체했다.

| # | Visualizer                | renderer | 주요 뷰포트 | 핵심 Shape                                        | 특수 요구                                          |
| - | ------------------------- | -------- | ----------- | ------------------------------------------------- | -------------------------------------------------- |
| 1 | `sine-wave-2d`            | 2d       | time-value + match(scene) | layout(42/58), circle, line, functionCurve, arc, text, roundRect, ellipse | `scene.id` 라우터 · baseline ghost curve · autoplay `state.t` · `formatN` badge |
| 2 | `compound-interest-2d`    | 2d       | time-value (tMax per scene) | layout, functionCurve(y=P(1+r/n)^(nt)), circle, rect, roundRect, polyline(bars), gradient | 4 Scene (savings/stock/deposit/inflation) · `inverse: true`로 감소 곡선 · 기준 곡선 ghost |
| 3 | `exponential-decay-2d`    | 2d       | time-value  | layout, functionCurve(N/N₀ = exp(r·t)), circle (battery cell), rect, polyline, text | half-life dashed line · `halfLifeFromR` formula · ratio → Scene state |
| 4 | `freefall-2d`             | 2d       | time-value + fit-box per planet | rect (ground), circle (ball), line (velocity vector), text, roundRect, radial gradient | 4 Scene (earth/moon/mars/jupiter) · autoplay · `hView` 스크롤 맵핑 · 시간가속 표시 |
| 5 | `kepler-orbit-2d`         | 2d       | polar       | circle(earth,sat), polyline(orbit ring), line(altitude), radial gradient glow, text, background stars | drag-radius preset · baseline ghost sat · TIME_ACCELERATION rotation · canvas text overlay |
| 6 | `kepler-orbit-3d`         | 3d       | perspective+orbit camera | sphere(earth,sat,glow), buffer-line(orbit), points(stars), directional light, **shader**(atmosphere rim) | orbit-camera preset · wheel-zoom · HTML Overlay · baseline ghost sat |
| 7 | `pythagorean-explore-2d`  | 2d       | fit-box     | polygon(3 squares), polygon(triangle), polyline(right-angle tick), text                         | 세 정사각형 fill+stroke · area 라벨 중앙 배치 |
| 8 | `pythagorean-shortcut-2d` | 2d       | fit-box     | line(walls), polygon(park grass), line(shortcut, detour), circle(marker), text, roundRect(badge) | 대각선(걸리는 시간) · 절약 비율 배지 |
| 9 | `pythagorean-ladder-2d`   | 2d       | fit-box (hAlign: anchor + vAlign: end) | gradient rect(sky), rect+line(brick wall), rect(window), line×2(rails), repeat(rungs), polyline(hatch ground), text, roundRect(badge, safety badge) | 사다리각도→safety 분기(color), rung count ∝ c |
| 10 | `pythagorean-tv-2d`       | 2d       | fit-box (yUp:false, vAlign:start) | rect(bezel), linearGradient rect(screen), line dashed(diagonal), text("N inch"), trapezoid(stand), text(a, b), roundRect(badge) | inch 자동 계산 · bezel/stand 픽셀 기반 |
| 11 | `quadratic-sandbox-2d`    | 2d       | time-value  | functionCurve, circle(vertex), line(axis), filledArc(roots region), text(formula)                | 꼭짓점·근·y절편 라벨 · 표준형 vs 전개형 토글은 없음(순수 f(x)) |
| 12 | `quadratic-basketball-2d` | 2d       | time-value  | gradient bg, rect(floor), clip(function under floor), repeat(hatches), Player 조립(rect+circle+line), Hoop 조립, Ball(radial gradient + lines), functionCurve dashed | 꼭짓점 마커+라벨 · 비거리(root2) badge |
| 13 | `quadratic-bridge-2d`     | 2d       | time-value  | gradient sky, rect(water), functionCurve(arch), line(pylons), rect(deck), repeat(cars), roundRect(badge) | 다리 스팬=근 간 거리 · 최고 높이=꼭짓점 |
| 14 | `quadratic-fountain-2d`   | 2d       | time-value  | radial gradient bg, repeat(water streams, 파라미터화된 a,b,c 변형), circle(pool), text                 | multiple functionCurve overlay (대칭/회전 파생) |

**커버리지 체크** (2026-09-05 실측으로 교체)

원문은 "스키마로 표현 가능한가"를 재고 있었는데 "구현·사용 완료"로 읽혔다.
세 축을 나눠 적는다 — **스키마에 있는가 / 런타임이 하는가 / spec 이 실제로 쓰는가.**

| 항목 | 스키마 | 런타임 | spec 사용 | 실제 |
|---|:-:|:-:|:-:|---|
| 2D Shape | ✅ | ✅ | 부분 | `path`·`image`·`clip` 은 사용 0. `arc` 1개, `filledArc` 1개 |
| 3D Element | ✅ | ✅ | 부분 | kepler-3d 가 쓰는 것은 sphere·light·bufferLine 뿐. `points`·`shaderMaterial` 사용 0 |
| 컨테이너 | ✅ | ✅ | 부분 | group(17)·repeat(10)·if(9)·match(5). **`layout`·`viewport` 스코프·`clip` 사용 0** |
| `layout` ↔ `viewport` 연결 | ✅ | ❌ | 0 | `layout` 이 주입하는 `__layoutArea` 를 읽는 곳이 없고, `viewport.rect={ref}` resolver 를 마운트가 넘기지 않아 **항상 throw** |
| animation | ✅ | ✅ | 3 | `onParamChange` 는 sine-wave 1개뿐. **kepler 주기 회전은 없다** — 3D 회전은 OrbitControls `autoRotate` |
| interaction | 부분 | 부분 | **0** | preset 3종·`cursor`·`hitTest:{ref}` 미구현. raw pointer/drag/wheel 은 동작 |
| **Baseline 비교** | ❌ | ❌ | **0** | §13 참조. 컨텍스트에 주입되지 않는다 |
| Overlay | ✅ | ✅ | 17 | 다만 §11 예시의 `position`·`args`·`text`·`marginTop` 은 **스키마에 없다** (`format` 은 있다) |
| viewport 종류 | 부분 | 부분 | 9 | **`polar` 는 throw**(`"not supported in Phase 3"`). `hAlign:{kind:"anchor"}` 는 스키마에 없다. `frame-rect` 사용 0. 나머지 8개 spec 은 `viewports: {}` |
| `displayOptions` | ✅ | ✅ | **1** | `sine-wave-2d` 뿐. 원문의 8개 주장은 거짓 |
| `localFormulas` / `formulas.*` | ✅ | ❌ | 0 | 중복 id 검사만 하고 **평가하지 않는다**. `formulas.*` 는 항상 undefined |
| `theme` | ✅ | ❌ | 0 | 소비처 0. spec 들은 `if(frame.isDark, …)` 를 인라인으로 쓴다 |
| `userBindings` | ✅ | ✅ | **17** | §2 표에 누락된 필드 |
| `derivatives` | ✅ | ✅ | 1 | `tangent-explore-2d` |

---

## 16. 단일 예제 · sine-wave-2d 전체 spec (발췌)

> 🚨 **이 예제를 복사하면 동작하지 않는다.** 실제 spec 과 여러 곳이 다르다.
>
> | 예제 | 실제 |
> |---|---|
> | element 판별자 `"type"` | **`"kind"`** |
> | `root` 가 `layout` | `group` |
> | `viewports.*.rect` 가 `"area.top"` 문자열 | `{x, y, w, h}` 표현식 객체 |
> | `theme.divider(frame.isDark)` | `theme.*` 는 제공되지 않음 |
> | 카탈로그 `trigonometry-basic/sine-wave` | 실제는 `physics/simple-harmonic` |
> | `baseline`·`isStandard` 사용 | 주입되지 않음 (§13) |
>
> 실제 예제는 `registries/default/sine-wave-2d/spec.json` 을 본다.

카탈로그 `trigonometry-basic/sine-wave`가 `parameterConfig`(A, ω, φ, t 범위/단위/기본값)와 `derivedValues`(`x = A sin(ωt + φ)`)를 이미 소유하므로 spec은 재선언하지 않는다.

```jsonc
{
  "$schema": "fizzex-visualizer/v1",
  "id": "sine-wave-2d",
  "catalog": "trigonometry-basic/sine-wave",

  "name":        { "en": "Sine Wave — 2D", "ko": "사인파 — 2D" },
  "description": { "en": "y = A sin(ωt + φ). Speaker, pendulum, tide, voltmeter scenes.",
                   "ko": "y = A sin(ωt + φ). 스피커·진자·조수·전압계 장면." },
  "renderer": "2d",

  "displayOptions": ["timeScale"],

  "scenes": [
    { "id": "speaker",
      "name":        { "en": "Speaker", "ko": "스피커" },
      "description": { "en": "Diaphragm oscillation as a sine wave.",
                       "ko": "진동판 운동을 사인파로 시각화." },
      "style": { "color": "#7C3AED", "icon": "🔊" },
      "params": { "A": 1, "\\omega": 4.5, "\\varphi": 0 } },
    { "id": "pendulum",
      "name":        { "en": "Pendulum", "ko": "진자" },
      "description": { "en": "Small-angle swing.", "ko": "작은 각도의 왕복 운동." },
      "style": { "color": "#C2410C", "icon": "⚖️" },
      "params": { "A": 1, "\\omega": 2, "\\varphi": 0 } },
    { "id": "tide",
      "name":        { "en": "Tide", "ko": "조수" },
      "description": { "en": "Slow rise-and-fall of sea level.",
                       "ko": "해수면의 느린 상승·하강." },
      "style": { "color": "#0284C7", "icon": "🌊" },
      "params": { "A": 1, "\\omega": 1, "\\varphi": 0 } },
    { "id": "voltmeter",
      "name":        { "en": "Voltmeter", "ko": "전압계" },
      "description": { "en": "AC voltage needle deflection.",
                       "ko": "교류 전압에 따른 바늘 편향." },
      "style": { "color": "#0891B2", "icon": "⚡" },
      "params": { "A": 1, "\\omega": 3, "\\varphi": 0 } }
  ],

  // localFormulas 불필요 — 카탈로그 derivedValues.x 로 충분.

  "state": [
    { "id": "autoT", "type": "number", "default": 0 },
    { "id": "userDrivenT", "type": "bool", "default": false,
      "onParamChange": "t" }
  ],

  "animation": {
    "onFrame": [
      { "set": "state.autoT",
        "to": "if(state.userDrivenT, state.autoT, mod(state.autoT + frame.dt, 20))" },
      { "set": "state.userDrivenT", "to": "false" }
    ]
  },

  "viewports": {
    "abstractWave": {
      "kind": "time-value",
      "rect": "area.top",       // layout area 참조 — time-value는 rect 내부에서 padding으로 세부 조정
      "xMin": "state.autoT - 6",
      "xMax": "state.autoT",
      "yMin": "-max(0.000001, abs(A))",
      "yMax": "max(0.000001, abs(A))",
      "padding": { "top": 10, "right": 16, "bottom": 10, "left": "min(area.top.w * 0.35, 180)" }
    }
  },

  "root": {
    "type": "layout",
    "direction": "vertical",
    "areas": [
      { "id": "top",    "ratio": 0.42, "children": [ /* abstract: 회전 원 + 파형 ­— viewport.abstractWave 사용 */ ] },
      { "id": "div",    "size": 0,     "children": [
        { "type": "line",
          "x1": 10, "y1": "area.y",
          "x2": "frame.width - 10", "y2": "area.y",
          "style": { "stroke": "theme.divider(frame.isDark)",
                     "lineWidth": 1, "lineDash": [3, 4] } }
      ] },
      { "id": "bottom", "ratio": 0.58, "children": [
        { "type": "match",
          "on": "scene.id",
          "cases": {
            "speaker": {
              "type": "group",
              "let": { "cy":        "area.y + area.h / 2",
                       "bodyX":     "area.x + area.w * 0.28",
                       "bodyW":     82,
                       "bodyH":     "min(area.h - 40, 120)",
                       "bodyY":     "vars.cy - vars.bodyH/2",
                       "yNorm":     "clamp(formulas.x / max(0.000001, abs(A)), -1, 1)",
                       "dispX":     "vars.bodyX + vars.yNorm * 14",
                       "diaphR":    "min(vars.bodyH * 0.35, 32)",
                       "color":     "scene.style.color",
                       "ripplesBase": "vars.dispX + vars.diaphR + 4",
                       "maxReach":  "area.x + area.w - vars.ripplesBase - 10",
                       "intensity": "min(1, abs(vars.yNorm))" },
              "children": [
                { "type": "rect",
                  "x": "area.x", "y": "area.y", "w": "area.w", "h": "area.h",
                  "style": { "fill": "if(frame.isDark, '#0f172a', '#f1f5f9')" } },

                { "type": "rect",
                  "x": "vars.bodyX - vars.bodyW", "y": "vars.bodyY",
                  "w": "vars.bodyW", "h": "vars.bodyH",
                  "style": { "fill": "if(frame.isDark, '#1e293b', '#475569')" } },

                { "type": "repeat",
                  "of": { "range": [0, 6] },
                  "as": "i",
                  "children": [
                    { "type": "line",
                      "x1": "vars.bodyX - vars.bodyW + 8",
                      "y1": "vars.bodyY + 10 + vars.i * ((vars.bodyH - 20) / 6)",
                      "x2": "vars.bodyX - 8",
                      "y2": "vars.bodyY + 10 + vars.i * ((vars.bodyH - 20) / 6)",
                      "style": { "stroke": "if(frame.isDark, '#0f172a', '#1e293b')",
                                 "lineWidth": 1 } }
                  ] },

                { "type": "circle",
                  "cx": "vars.dispX", "cy": "vars.cy", "r": "vars.diaphR",
                  "style": {
                    "fill": { "kind": "radial",
                              "cx0": "vars.dispX", "cy0": "vars.cy", "r0": 2,
                              "cx1": "vars.dispX", "cy1": "vars.cy", "r1": "vars.diaphR",
                              "stops": [
                                [0, "if(frame.isDark, '#cbd5e1', '#e2e8f0')"],
                                [1, "if(frame.isDark, '#475569', '#64748b')"]
                              ] },
                    "stroke": "vars.color",
                    "lineWidth": 1.5 } },

                { "type": "circle",
                  "cx": "vars.dispX", "cy": "vars.cy", "r": "vars.diaphR * 0.3",
                  "style": { "fill": "vars.color" } },

                { "type": "repeat",
                  "of": { "range": [0, 5] },
                  "as": "i",
                  "let": {
                    "travel": "mod(frame.elapsed * 120 + vars.i * (vars.maxReach / 5), vars.maxReach)",
                    "alphaR": "(1 - vars.travel / vars.maxReach) * 0.55 * vars.intensity",
                    "radius": "vars.travel + 10"
                  },
                  "children": [
                    { "type": "arc",
                      "visible": "vars.alphaR >= 0.04",
                      "cx": "vars.ripplesBase", "cy": "vars.cy", "r": "vars.radius",
                      "startAngle": "-PI/3", "endAngle": "PI/3",
                      "style": { "stroke": "hexAlpha(vars.color, vars.alphaR)",
                                 "lineWidth": 1.8 } }
                  ] },

                { "type": "text",
                  "x": "area.x + area.w / 2", "y": "area.y + area.h - 8",
                  "text": "'스피커 진동판 → 공기 → 소리'",
                  "style": { "font": "500 10px -apple-system, sans-serif",
                             "fill": "if(frame.isDark, 'rgba(200,210,230,0.75)', 'rgba(60,70,90,0.75)')",
                             "textAlign": "center", "textBaseline": "bottom" } }
              ]
            }

            /* pendulum / tide / voltmeter 생략 — 동일 패턴, scene.style.color만 다름 */
          } }
      ] }
    ]
  }
}
```

이 단일 예제가 §4~§11의 모든 핵심 Element(layout, match, group+let, repeat, rect, circle, arc, line, text, radial gradient, hexAlpha, `scene.style` 접근, state autoplay, `onParamChange` pulse, frame.elapsed)를 소비한다.

---

## 17. 오픈 질문 · 사용자 판단 영역

> ℹ️ **아래 중 넷은 이미 결정됐다.**
> 2번 Expression 파서 → **jsep** 채택. 3번 3D diff 깊이 → **보수적 full rebuild**.
> 4번 Overlay DOM vs Canvas → **HTML**. 7번 displayOptions 표준 목록 →
> `runtime/types/display-options.ts` 단일 레지스트리 + 컴파일 시 재검사로 절차 고정.
> 나머지(1·5·6·8)는 여전히 열려 있다.

다음은 **설계 범위가 아닌 실행 범위**의 결정 포인트. 사용자가 순서·우선순위를 결정한다.

1. 스키마 버전 정책 — `$schema: fizzex-visualizer/v1`에서 minor 변경을 어떻게 누적/표기할 것인가. (수식 자체는 불변이므로 `catalog` 참조에는 버전 훅을 두지 않는다. 스키마 진화 문제는 이와 별개.)
2. Expression 파서 선택 — jsep 의존 추가 vs 자체 파서 (200~400줄 재귀 하강).
3. 3D 어댑터의 diff 구현 깊이 — 보수적(`repeat` 전체 재생성) vs 적극적(key 기반 incremental).
4. Overlay DOM vs Canvas 우선 — HTML이 텍스트 셀렉션/접근성에 유리, Canvas가 스크린샷 일관성에 유리.
5. 편집기 UX의 Element 추가/이동 표현 — 본 문서는 스키마만 정의, 편집기 상태 모델은 별도 설계.
6. i18n 정책 통일 — spec의 **per-string 객체**(`{ en, ko }`)와 카탈로그의 **파일 분리**(`data/catalog/<locale>/*.json`)가 공존한다. 편집기가 사용자 정의 Visualizer를 저장할 때 파일 분리를 따를지, 객체 형태로 단일 spec 파일에 둘지 결정 필요. 런타임 resolve는 이미 양쪽 모두 지원.
7. 호스트 `displayOptions` 표준 목록 관리 — v1은 `timeScale`만. 새 항목 추가 시 호스트 구현과 validator 목록을 동시에 갱신하는 절차/책임자 결정.
8. 호스트 표준 목록에 없는 display 기능이 필요해지면 — Visualizer별 ad-hoc 옵션을 허용할지, 반드시 호스트에 먼저 올리도록 강제할지 (Host-First 원칙 준수 시 후자).

이 설계는 17절 오픈 질문에 대한 결정이 내려지지 않아도 14개 Visualizer 100% 커버가 가능한 구조임을 의도한다.
