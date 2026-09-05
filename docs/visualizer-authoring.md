# 시각화 만들기

시각화를 하나 추가할 때 밟는 순서와, **지금 실제로 무엇이 되고 무엇이 안 되는지**를
적은 문서다. 무엇을 보여줄지에 대한 설계 자료는
[`visualizer-design.md`](./visualizer-design.md) 를 본다.

> 규칙 원문은 여기 복제하지 않는다. 아래 단계는 규칙을 가리키는 포인터이고,
> 구속력은 `rules/` 에 있다. 규칙이 바뀌면 이 문서가 아니라 규칙이 진실이다.

## 한 줄 요약

시각화는 코드가 아니라 **데이터**다. `registries/default/<id>/spec.json` 하나가
시각화 전부이고, `src/visualizer/runtime` 의 단일 런타임이 그것을 해석한다.
TypeScript 는 한 줄도 쓰지 않는다.

---

## 절차

| 단계 | 하는 일 | 규칙 |
|---|---|---|
| 0 | 어떤 **형식(form)** 을 시각화할지 정한다. 없으면 형식부터 선언 (`examples` 3개 + `counterExamples` 1개) | `C8` |
| 1 | viz id 확정 — `<주제>-<차원>`. **한번 정하면 불변** | `C9`, `C11` |
| 2 | `registries/default/<id>/spec.json` 작성 ← 작업의 본체 | `C9` |
| 3 | `registries/default/manifest.json` 등재 | `C11` |
| 4 | `form/index.json` 의 `visualizers[]` 에 등재 | `C9`, `C11` |
| 5 | `<id>/spec-validation.test.ts` 작성 (관례상 4케이스) | `C11` |
| 6 | `pnpm typecheck && pnpm test && pnpm build` + rule-guard | — |

**4단계를 빠뜨리면 칩이 영원히 뜨지 않는다.** `complex-plane-2d`·`linear-transform-2d`
가 **지금도 그 상태**다 — 형식의 `visualizers` 가 비어 있어 도달할 수 없다(파생 슬롯이
없어 의도적으로 미등재. C9:30).

> ⚠️ **3단계 누락은 테스트가 잡지만 4단계는 잡지 않는다.** manifest 등재는 고아 spec
> 검사가 강제하는 반면, `form/index.json` 등재를 검증하는 테스트는 없다. 위 두 viz 가
> 정당한 미등재 상태라 전수 검사를 걸 수 없기 때문이다. **4단계는 눈으로 확인해야 한다.**

이 다섯 종(spec / 검증 테스트 / manifest / 형식·카탈로그 데이터 / 매처 테스트)은
**한 커밋**에 넣는다.

### 기존 형식에 추가하는 경우 vs 새 형식인 경우

히스토리가 보여주는 비용 차이가 크다.

- **기존 형식에 시각화를 더 붙임** — 런타임 변경 0. 순수 spec 저작.
  (피타고라스 4개, 이차식 4개가 그랬다)
- **런타임에 없는 능력이 필요함** — spec 커밋 **앞에** 런타임 커밋이 4~5개 붙는다.
  `tangent-explore-2d` 는 스키마 → bridge → 상태 → 호스트 함수 순으로 4커밋을 쌓고
  마지막에 spec 하나를 얹었다.

새 시각 표현이 필요하면 spec 에서 우회하지 말고 **프리미티브를 확장**한다 (C9 PREFER).

---

## 구현 상태

[`visualizer-spec-schema.md`](./visualizer-spec-schema.md) 는 설계 시점 문서라 "스키마로 표현 가능한가"를
적어 두었다. **그것과 지금 동작하는 것은 다르다.** 아래가 실측 기준이다.

### Expression 컨텍스트에 실제로 있는 것

spec 의 표현식에서 참조할 수 있는 이름들.

| 이름 | 상태 | 비고 |
|---|---|---|
| `params.*` | ✅ | bare 이름으로도 노출 (`a`, `b` …) |
| `bindings.*` | ✅ | 사용자 LaTeX 바인딩 (matrix/complex) |
| `state.*` | ✅ | |
| `scene.*` | ✅ | |
| `frame.*` | ✅ | `{dt, now, elapsed, width, height, isDark}` |
| `evalUser(...)` | ⚠️ | **2D 전용.** `mount-3d` 에는 없다 |
| `let` 바인딩 | ✅ | **bare 이름**으로 주입. `vars.` 접두는 없다 |
| `formulas.*` | ❌ | **주입되지 않음 → throw.** 카탈로그 `derivedValues` 도 spec `localFormulas` 도 평가되지 않는다 |
| `baseline.*` | ❌ | 주입되지 않음 → **throw** |
| `isStandard` | ❌ | 주입되지 않음 → **throw** |
| `theme.*` | ❌ | 주입되지 않음 → **throw**. `if(frame.isDark, …)` 로 직접 쓴다 |
| `viewport.*` | ❌ | 주입되지 않음 → **throw**. 어댑터 내부 Map 이라 표현식에서 접근 불가 |

> 🚨 **위 ❌ 이름을 쓰면 그림이 깨진다.** 설계 문서 §13 이 `baseline`/`isStandard` 로
> ghost 렌더링 패턴을 자세히 설명하지만 **런타임 배선이 없다.**
>
> 미정의 식별자는 `expr/eval.ts` 가 **throw** 한다. 프레임 루프의 catch 는 셋이고
> 어디서 터지느냐에 따라 증상이 다르다 (`mount-2d.ts:140-160`):
>
> | 터진 곳 | 결과 |
> |---|---|
> | `animation.onFrame` | 그 프레임을 **통째로 건너뛴다**(`return`). 루프가 `clearRect` 를 하지 않으므로 직전 화면이 남아 **멈춘 것처럼 보인다** |
> | `root` 렌더 | 예외 지점에서 중단. 앞서 그려진 형제는 남고 **이후 요소는 전부 누락** |
> | `overlay` | 캔버스는 정상. HUD 만 갱신 실패 |
>
> 콘솔 경고는 `warnOnce` 가 **직전과 같은 `tag:message` 만** 억제한다. 렌더와
> 오버레이가 같이 던지면 두 키가 번갈아 들어와 매 프레임 경고가 쏟아진다.
>
> `runtime/baseline.ts` 가 있긴 하지만 씬 프리셋과 카탈로그 기본값을 머지해
> `initialParams` 를 만드는 헬퍼일 뿐이고, `baseline.formulas` 자리에는 호출부가
> 항상 `{}` 를 넘긴다.

### 최상위 필드

| 필드 | 스키마 | 런타임 | 쓰는 spec | 비고 |
|---|---|---|---|---|
| `scenes` | ✅ | ✅ | 17 | 2개 이상이어야 씬 칩이 뜬다 |
| `userBindings` | ✅ | ✅ | **17** | 설계 문서 §2 표에 누락돼 있다 |
| `overlay` | ✅ | ✅ | 17 | 라인 필드는 `label`·`value`·`format`·`visible`·`style` 뿐 — 설계 문서 §11 예시의 `position`·`args`·`text`·`marginTop` 은 없다 |
| `viewports` | ✅ | ✅ | 9 | 나머지 8개 spec 은 `viewports: {}` 로 비어 있다 |
| `state` | ✅ | ✅ | 3 | |
| `animation` | ✅ | ✅ | 3 | `onFrame` 은 `state.<id>` 경로만. `vars.<name>` 은 throw |
| `derivatives` | ✅ | ✅ | 1 | `tangent-explore-2d` 뿐 |
| `displayOptions` | ✅ | ✅ | **1** | `sine-wave-2d` 뿐. 설계 문서는 8개라고 적혀 있다 |
| `camera` | ✅ | ✅ | 1 | `renderer: '3d'` 면 필수 |
| `interaction` | ✅ | 부분 | **0** | 아래 참조 |
| `localFormulas` | ✅ | ❌ | 0 | 중복 id 검사만 하고 **평가하지 않는다** |
| `theme` | ✅ | ❌ | 0 | 소비처 0 |

### 안 되는 것 (문서에는 된다고 적혀 있는 것들)

| | 실제 |
|---|---|
| `polar` viewport | `"polar viewport is not supported in Phase 3"` **throw** |
| `interaction` preset (`drag-radius`·`orbit-camera`·`wheel-zoom`) | 스키마에 `preset` 필드 자체가 없다. 3D 궤도·줌은 spec 이 아니라 OrbitControls(`camera.controls`)가 처리 |
| `interaction.cursor` | 구현 0건 |
| `hitTest: {ref}` | `"not supported in Phase 4"` throw. rect/circle/canvas 만 가능 |
| `layout` ↔ `viewport` 연결 | `layout` 은 `__layoutArea` 를 주입하지만 읽는 곳이 없고, `viewport.rect={ref}` 해소용 resolver 를 마운트가 넘기지 않아 **항상 throw** |
| 3D 증분 업데이트 | 매 프레임 전체 재구축(`disposeChildren` → rebuild). 설계 문서 §14.6 의 "재생성 금지 / key 기반 diff" 는 미구현 |
| 카메라 매 프레임 sync | setup 1회 pose 평가 후 OrbitControls 위임 |

### 프리미티브

25종. 조건·반복도 프리미티브와 같은 층에 있다.

| 갈래 | |
|---|---|
| 2D 도형 | `circle` `rect` `roundRect` `polygon` `polyline` `line` `path` `arc` `filledArc` `ellipse` `functionCurve` |
| 3D | `sphere` `bufferLine` `points` `light` `shaderMaterial` |
| 제어 | `group` `if` `match` `repeat` `layout` `clip` `viewport` |
| 기타 | `text` `image` |

spec 실사용이 0인 것: `path`, `image`, `clip`, `layout`, `viewport`, `points`, `shaderMaterial`.
`arc` 는 `sine-wave-2d` 하나, `filledArc` 는 `complex-plane-2d` 하나뿐이다.

---

## 함정

- **`repeat` 의 형태** — 설계 문서는 `"of": "<expr → array>"` 라고 적었지만 실제는
  `{ items: <expr> }` 객체다.
- **element 판별자** — 설계 문서 §16 완전 예제는 `"type"` 을 쓰지만 실제 스키마는
  `"kind"` 다. **그 예제를 복사하면 아무것도 그려지지 않는다.**
- **required scalar `userBindings`** — 모든 `scenes[].params` 에 fallback 기본값이
  있어야 한다. 없으면 zod 가 거부한다.
- **카탈로그 소유 필드 재선언 금지** — `parameters`/`derivedValues`/`constraints`/
  `milestones` 를 spec 이 다시 쓰면 validator 에러.
- **`dist/visualizers/` 를 고치지 말 것** — 빌드 산출물이다. `registries/default` 를
  고치고 `pnpm build`.

---

## 모방할 것

| | |
|---|---|
| 가장 짧고 전형적인 spec + 테스트 쌍 | `registries/default/pythagorean-ladder-2d/` |
| 씬을 가장 잘 쓰는 예 (4씬) | `registries/default/freefall-2d/` |
| 유일한 완성형 카탈로그 항목 | `astronomy/kepler-third` — `parameterConfig`·`effects`·`anchors`·`milestones`·`derivedValues`·`constraints` 를 전부 갖춘 유일 사례 |
| **실제로 강제되는 계약** | `src/visualizer/runtime/validator/schema.ts` — 문서보다 이쪽이 최신이다 |

`parameterConfig` 를 가진 카탈로그 항목은 223개 중 **2개**(케플러·피타고라스)뿐이다.
형식을 추가하면서 이것을 채우지 않으면 슬라이더가 `-10~10, step 0.1` 기본값으로 뜨고
값 배지도 없다. **진입점만 생기고 조작의 의미는 비어 있게 된다.**

---

## 관련 문서

- [`visualizer-design.md`](./visualizer-design.md) — 무엇을 보여줄 것인가
- [`formula-priority.md`](./formula-priority.md) — 어떤 수식부터 만들 것인가
- `rules/concerns/C9-visualizer-spec-first.md` — spec-first 규칙
- `rules/concerns/C11-visualizer-manifest-test.md` — manifest·테스트 의무
- `rules/concerns/C8-catalog-test.md` — 형식 등재
- [`visualizer-spec-schema.md`](./visualizer-spec-schema.md) — 스키마 백과사전 (**설계 이력**. 구현 상태는 위 표가 우선)
- [`lessons.md`](./lessons.md) — 사용자 피드백에서 추출한 교훈
