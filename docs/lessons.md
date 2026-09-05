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
