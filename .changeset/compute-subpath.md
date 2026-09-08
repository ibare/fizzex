---
"fizzex": minor
---

feat(exports): 계산 전용 서브패스 `fizzex/compute` 와 `fizzex/semantic` 을 연다

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
