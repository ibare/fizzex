# C8 — 카탈로그 매칭 테스트 필수

카탈로그에 수식 항목을 추가하거나 매칭 시그니처를 변경할 때 적용한다.

## MUST

- 카탈로그 항목 추가 시 `src/analyzer/semantic/matchers/catalog-matcher.test.ts`의 `CATALOG_TEST_CASES` 배열에 해당 수식의 **대표 LaTeX → expectedId** 테스트 케이스를 추가한다.
- 시그니처 또는 complexity 변경 시 기존 테스트가 깨지지 않는지 `pnpm test`로 확인한다.
- 테스트의 LaTeX는 실제 사용자가 입력할 법한 자연스러운 형태여야 한다.

## MUST NOT

- 테스트 케이스 없이 카탈로그 항목을 추가하지 않는다.
- 매칭 실패를 해결하기 위해 테스트 케이스를 삭제하지 않는다 (시그니처 또는 매처를 수정한다).
