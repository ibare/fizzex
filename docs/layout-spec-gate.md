# layout spec 을 게이트로 만들기

`specs/fizzex-layout-spec.json` 은 TeXbook·OpenType MATH 원전에서 뽑은 조판 규칙을
검증 케이스로 적어 둔 파일이고, `pnpm test:layout` 이 그것을 돌린다. 그런데 **지금은
게이트가 아니라 리포트다.** 이 문서는 그 사실과 게이트로 만드는 경로를 적는다.

측정 기준일 2026-09-10, 커밋 `50f468a` 직후.

## 지금 무슨 일이 일어나는가

`src/__tests__/layout/spec-runner.test.ts` 의 수치 단언은 이것 하나다.

```ts
expect(result.complianceScore).toBeGreaterThanOrEqual(0);
```

카테고리별 결과와 실패 상세는 `console.log` 로만 나가고, "unexpected regression 이
없다" 는 테스트는 `expect(true).toBe(true)` placeholder 다. **spec assertion 이 몇 개
실패하든 `pnpm test:layout` 은 초록이다.** 지금 7건이 실패 중인데 66/66 통과로 보인다.

그래서 조판 회귀의 실효 방어는 지금까지도 단위 테스트(`src/box/*.test.ts`)가 맡아
왔다. spec 은 준수율을 **보고**할 뿐 아무것도 **막지** 못한다.

그래서 "known_fail 을 뒤집으면 fail 로 잡힌다" 는 통념이 성립하지 않는다.
`known_fail: true` 를 `false` 로 바꿔도, 새 assertion 을 넣어도, 스위트는 여전히
초록이다. 조판 회귀를 막고 싶으면 단위 테스트를 함께 써야 한다.

## 현재 수치

```
총 53   pass 34   fail 7   known_fail 11   skip 1      준수율 83%
```

`50f468a` 이전에는 pass 26 / fail 12 / skip 5 / 준수율 68% 였다. 조판을 고친 것이
아니라 **이름이 어긋나 판정조차 되지 않던 9건을 되살린** 결과다.

- `expected` 식이 `xi8` 처럼 짧은 이름을 써서 치환에 실패 → skip 으로 사라짐 (4곳)
- integral 의 assertion type 에 `_min` 접미사 누락 → 매핑에 없어 "측정값 없음" (5곳)

같은 부류의 드리프트가 또 생길 수 있다. **spec 의 `type` 문자열과
`assertions.ts` 의 `typeToMeasurement` 키가 어긋나도 아무도 알려주지 않는다** —
`null` 이 조용히 "측정값 없음" 으로 흘러갈 뿐이다. 아래 1단계가 이것부터 막는다.

## 남은 것 — 측정기 미구현 15건

실패 7건과 known_fail 8건이 전부 "측정값 없음 / got null" 이다. 조판이 틀린 것이
아니라 **측정기가 값을 내지 않아 판정 자체가 불가능**하다.

| assertion type | 건수 | 케이스 | 무엇을 재야 하나 |
|---|---|---|---|
| `nolimits_style` | 3 | iint-display, oint-display, int-inline | 적분 첨자가 위아래가 아니라 옆에 붙었는가 (flag) |
| `space_around_rel` / `space_around_bin` / `space_before_ord` | 4 | spacing-* | atom 사이 kern 폭. 8×8 spacing table 미구현과 짝이다 |
| `content_style_is_cramped` / `inner_style_is_cramped` | 3 | sqrt-display, hat-lowercase, sup-cramped | 하위 박스가 cramped 스타일로 조판됐는가 (flag) |
| `sub_x_offset` / `sup_x_offset` | 2 | int-italic-correction | 적분 첨자의 x 오프셋과 이탤릭 보정 |
| `delimiter_covers_content` / `delimiter_centered_on_axis` | 2 | delim-frac | 구분자가 내용을 덮는가 / 축에 정렬됐는가 |
| `inner_frac_style` | 1 | frac-nested | 중첩 분수의 안쪽 스타일 |

`sub_x_offset` / `sup_x_offset` 는 **조판이 이미 옳다는 것을 손으로 확인했다.**
`\int_0^1` 의 박스 좌표가 path 폭 0.9990, italic kern −0.4590, 상한 x=0.9990,
하한 x=0.5400 으로 spec 기대와 정확히 맞는다. 측정기만 붙이면 pass 로 갈 항목이다.

## 진짜 조판 차이 — 3건

전부 이미 `known_fail` 로 기록돼 있다.

| 케이스 | 기대 | 실제 | 차이 |
|---|---|---|---|
| `frac-display-num-shift` denominator_shift_down | 0.6860 | 0.9460 | 0.2600 |
| `frac-text-shift` denominator_shift_down | 0.3450 | 0.7048 | 0.3598 |
| `sqrt-display` content_rule_clearance_min | 0.1477 | 0.0800 | 0.0677 |

분수 분모가 표준보다 많이 내려가고, display 근호의 여백이 모자란다.
`docs/layout-engine-analysis.md` 의 미구현 목록과 함께 봐야 한다.

## 게이트로 만드는 경로

### 1단계 — 이름 어긋남을 타입으로 막는다

지금은 spec 의 `type` 문자열과 `typeToMeasurement` 키가 어긋나도 조용하다.
`50f468a` 가 고친 9건이 그렇게 몇 달을 숨어 있었다.

- spec 의 모든 assertion `type` 이 `typeToMeasurement` 에 있는지 **테스트로 확인**한다.
  없으면 실패시킨다 — "측정값 없음" 으로 흘려보내지 않는다.
- `expected` 식에 쓰인 식별자가 `spec.parameters` 에 있는지도 같은 방식으로 본다.
  치환 실패가 skip 으로 사라지는 경로를 닫는 것이다.

이 단계는 조판을 건드리지 않고 검증 인프라만 손본다. 위험이 낮고 효과가 즉시 난다.

### 2단계 — 측정기를 채운다

위 표의 6종을 `src/__tests__/layout/measurer.ts` 에 구현하고
`typeToMeasurement` 에 매핑한다. flag 계열(`nolimits_style`,
`*_is_cramped`, `delimiter_covers_content`)은 `values` 가 아니라 `flags` 로 낸다.

`space_around_*` 는 일반 수식의 atom 분류(8×8 spacing table)가 선행돼야 한다.
`\ce{}` 작업에서는 화학식 안에만 쓰려고 최소한만 만들었다 —
`src/box/ast-to-box.ts` 의 `chemAtomClass` + `chemGapEm` 이 화살표(rel) 주변에만
간격을 넣고 나머지는 0 을 돌려준다. 표라기보다 조건 두 줄이고, 일반 수식의
atom 분류는 아직 없다.

구현하면 15건이 pass 또는 **진짜 fail** 로 갈린다. 지금은 어느 쪽인지 아무도 모른다.

### 3단계 — 게이트를 세운다

2단계에서 드러난 실패를 고치거나 `known_fail` 로 정직하게 기록한 뒤,
`spec-runner.test.ts` 에 실제 단언을 넣는다.

```ts
expect(result.failures).toHaveLength(0);   // known_fail 은 failures 에 안 들어간다
```

`complianceScore` 임계값보다 이쪽이 낫다. 점수는 assertion 을 추가하면 희석되지만
"기록되지 않은 실패가 0" 은 희석되지 않는다.

`known_fail` 이 갑자기 pass 가 되는 경우도 함께 잡아야 한다 — 고쳐 놓고 기록을
안 지우면 다음 사람이 "아직 미구현" 으로 오해한다. `spec-runner.test.ts` 의
placeholder 가 원래 그 자리다.

## 함께 기록해 둘 것

- **`_min` 은 하한만 본다.** `50f468a` 가 integral 5건을 `_min` 으로 고쳤는데,
  이제 "sigma16 보다 크다" 만 검증되고 얼마나 큰지는 보지 않는다. 상한을 잡고
  싶으면 `_max` assertion 을 따로 붙여야 한다.
- **화학식 케이스가 0건이다.** `\ce{SO4^2-}` 의 폭 2.500 / 아래첨자 +0.300 /
  위첨자 x 1.700 은 사람이 표준과 대조해 확인한 값일 뿐 어느 테스트에도
  고정돼 있지 않다. 단위 테스트는 상대 관계만 본다. 다만 spec 에 넣어도
  3단계 전에는 게이트가 되지 못한다.
- `docs/layout-compliance-report.md` 는 **`pnpm test:layout:report` 가 생성하는**
  산출물이다. `pnpm test:layout` 은 이 파일을 쓰지 않는다 — 테스트를 돌리면
  자동으로 갱신된다고 오해하면 낡은 수치가 저장소에 남는다. 실제로 그렇게
  68% 시절 수치와 지금은 없는 assertion type 이름을 담은 채 남아 있었다.
  손으로 고치지 말고 스크립트로 다시 낼 것.
