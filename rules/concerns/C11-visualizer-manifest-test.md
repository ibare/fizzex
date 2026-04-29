---
version: 1
last_verified: 2026-04-29
---

# Visualizer Manifest·Spec 검증 테스트 규칙 (C11)

## When to Apply
`registries/default/<id>/spec.json`이나 `registries/default/manifest.json`을 추가/수정할 때, 또는 `src/visualizer/runtime/registry.ts`를 수정할 때.

## MUST
- 새 viz spec 추가 시 해당 디렉터리의 `spec-validation.test.ts`에 회귀 테스트 케이스를 추가한다 (자연스러운 입력 + 기대 출력)
- `manifest.json`에 등록된 모든 viz id는 대응 `<id>/spec.json`이 존재해야 한다
- `<id>/spec.json`이 존재하는 모든 디렉터리는 `manifest.json`에 등록되어야 한다 (고아 spec 금지)
- spec scene·viewport·state·localFormulas의 필수 필드가 누락된 경우 빌드/테스트가 실패해야 한다

## MUST NOT
- 테스트 케이스 없이 viz spec을 추가하지 않는다
- 검증 실패를 해결하기 위해 테스트 케이스를 삭제하지 않는다 (spec 또는 런타임 검증 로직을 수정한다)
- manifest 편집과 spec 디렉터리 추가/삭제를 분리된 커밋으로 두지 않는다 (정합성 단일 단위로 유지)

## PREFER
- 테스트 LaTeX/입력은 실제 사용자 시나리오에 가까운 자연스러운 형태를 사용한다
- viz id는 `<topic>-<dim>` 패턴(예: `pythagorean-explore-2d`)을 따른다
