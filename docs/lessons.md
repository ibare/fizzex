# Fizzex 작업 교훈

사용자 피드백에서 추출한 반복 가능한 패턴.

---

## L1. baseline 비교 시각화 — input 공통 요소는 차별화하지 않는다

**Date**: 2026-04-16
**Source**: 케플러 PoC 첫 구현 후 사용자 피드백 ("궤도는 공통 요소인데 빨간색으로 변하니까 매우 혼란스럽다")

### 문제
초기 구현에서 `isStandard === false` 일 때 궤도 원까지 빨간 실선으로 바꿨음.
하지만 궤도 반지름은 input 파라미터 `a` 로만 결정되고, 식 구조 변형(T²의 지수, 4π², a³의 지수)은 **derived 값(T, v)에만** 영향을 준다.
baseline 과 current 모두 같은 `a` 를 받으므로 궤도 원은 항상 같은 위치 — 색상 구분이 시각적 노이즈를 만들었다.

### 패턴
**baseline 비교 시각화에서 차별화 대상은 derived 값에 의존하는 요소뿐이다.**

| 요소 | 의존 | baseline/current 차별화? |
|------|------|------------------------|
| 위치/크기 (input parameter 만) | input | ❌ 동일 — 차별화 의미 없음 |
| 회전 속도, 색조 등 (derived 값) | derived | ✅ 차별화 — 식 구조 효과 |
| 정량 비교 (텍스트) | derived | ✅ "표준 대비 X%" |

### 적용 체크리스트
새 카탈로그 시각화에 baseline 비교를 도입할 때:
1. 해당 요소가 input 만으로 결정되는가? → 색상/위치 차별화 금지
2. 해당 요소가 derived(또는 equationValue) 에 의존하는가? → 차별화 OK
3. 의심되면 "같은 input → baseline 과 current 가 같은 값을 그릴까?" 자문

---

## L2. replace_all 치환은 방금 추가한 getter 본체까지 삼킨다

**Date**: 2026-04-19
**Source**: Phase 1.4 kepler three-core-renderer isDark getter 도입 중 self-recursion 발생, rule-guard 사후 검증에서 적발

### 문제
1. `private get isDark(): boolean { return this.theme === 'dark'; }` getter 추가
2. 동일 파일에서 `Edit(replace_all: true, old: "this.theme === 'dark'", new: "this.isDark")` 실행
3. getter 본체의 `this.theme === 'dark'`까지 함께 치환되어 `return this.isDark` → 무한 재귀
4. `pnpm tsc --noEmit`은 통과 (타입은 여전히 boolean) — 런타임 크래시를 잡지 못함

### 패턴
**같은 파일에 "소비 지점"과 "원천 정의"가 공존할 때 replace_all 금지.**

- getter/상수/파생 함수 본체는 치환 대상 패턴을 **유일하게 남겨둬야 할 장소**다
- `Edit(replace_all)`은 소비자만 바꿔야 하므로, 원천을 먼저 다른 표현으로 분리(별도 변수, 또는 getter 추가 시점 분리)하거나, 개별 Edit으로 명시적 치환할 것
- 정말 replace_all이 필요하면 치환 직후 **해당 파일의 getter/상수 정의 라인을 직접 읽어 재귀 여부 확인**

### 적용 체크리스트
- [ ] 치환 패턴이 파일 내에서 "원천 정의 라인"에 등장하는가? → replace_all 금지
- [ ] replace_all 수행 후 getter/상수 정의 본체를 grep 또는 Read로 확인했는가?
- [ ] `tsc --noEmit` PASS만으로 치환 검증을 종결하지 말 것 — self-recursion은 타입 통과

---

## L3. 문서를 고칠 때 검증 없이 쓰면 같은 문제를 재생산한다

**Date**: 2026-09-05
**Source**: 시각화 문서 재편. rule-guard 6라운드에서 내가 낸 사실 오류 12건 적발

### 문제

낡은 문서를 정리하면서 "지금 무엇이 되는가"를 적었는데, 그 서술 자체가 여러 번
틀렸다. 원래 고치려던 문제(문서가 코드와 어긋남)를 새 문서에서 그대로 재생산했다.

대표 사례:

| 내가 쓴 것 | 실제 |
|---|---|
| `warnOnce` 라 "1회뿐이라 알아채기 어렵다" | 직전 키만 억제 — 두 곳이 번갈아 던지면 **매 프레임** 경고 |
| "프레임 전체가 스킵된다" | catch 가 셋. animation 만 프레임을 건너뛰고, render 는 그 지점 이후만 누락 |
| `viewports` 사용 8 / 빈 것 9 | **9 / 8** (뒤집힘) |
| "3·4단계 누락을 테스트가 잡는다" | 4단계(form 등재)는 잡지 않는다 |
| 카탈로그 로케일 파일에 `entries[]` | 항목 id 를 키로 하는 평평한 객체 |

### 패턴

**한 겹만 확인하고 결론을 적었다.**

- 이름에서 동작을 추정했다 (`warnOnce`, `evaluable`, `analyzePolynomial`)
- 경로가 여러 개인 곳을 하나로 뭉갰다 (catch 3개, fallback 분기)
- 숫자가 우연히 맞아떨어지자 검산을 멈췄다 (`8+9=17`)
- 소스 주석을 근거로 삼았다 — 그 주석 자체가 부채였다. `render-context.ts` 가
  존재한 적 없는 `theme` 필드를 문서화하고 있었다

### 적용 체크리스트

- [ ] 동작을 주장하기 전에 스크립트로 실행해 출력을 확인했는가?
- [ ] 문서에 적은 예시 코드를 **그대로 실행해** 대조했는가?
- [ ] 분기·catch·fallback 이 여러 개인 곳을 각각 확인했는가, 요약만 했는가?
- [ ] 소스 주석을 근거로 쓰지 않았는가? (주석도 검증 대상이다)
- [ ] 내가 다른 파일에 써둔 경고를 이 변경이 위반하지 않는가?
