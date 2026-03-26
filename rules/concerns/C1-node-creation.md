---
version: 1
last_verified: 2026-03-26
---

# AST 노드 생성 규칙 (C1)

## When to Apply
MathNode를 생성하거나 새 노드 타입을 추가할 때.

## MUST
- 모든 노드 생성 함수는 `generateEditorId()` 또는 `generateLatexId()`를 호출하여 고유 ID를 부여한다
- 새 MathNode 타입 추가 시 `astToBox()`에 해당 분기를 반드시 추가한다
- 새 MathNode 타입 추가 시 `astToLatex()`에 해당 분기를 반드시 추가한다
- 복합 노드(frac, power, sqrt 등)의 children 슬롯은 RowNode로 감싼다

## MUST NOT
- ID를 수동으로 문자열 지정하지 않는다 (테스트 제외)
- `generateEditorId()`와 `generateLatexId()`를 혼용하지 않는다 (에디터 생성 시 editor, 파서 생성 시 latex)

## PREFER
- `node-factory.ts`의 제네릭 팩토리(`createNode`, `num`, `frac`, `power` 등)를 사용한다
- `COMPLEX_NODE_SUFFIXES` 상수를 사용하여 슬롯을 식별한다
