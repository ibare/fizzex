---
version: 1
last_verified: 2026-03-26
---

# LaTeX 명령어 등록 규칙 (C2)

## When to Apply
새 LaTeX 명령어를 추가하거나 파서를 수정할 때.

## MUST
- 새 명령어는 `latex/commands/` 하위의 적절한 카테고리 파일에 CommandHandler로 등록한다
- CommandHandler는 `(context) => MathNode[]` 시그니처를 따른다
- 명령어 핸들러는 `latex/commands/index.ts`의 통합 레지스트리에 포함되어야 한다

## MUST NOT
- `latex-parser.ts`에 명령어별 분기(if/switch)를 직접 추가하지 않는다
- 명령어 핸들러 안에서 파서 내부 상태를 직접 조작하지 않는다

## PREFER
- 명령어 카테고리: basic, bigops, functions, accents, greek, operators, spaces
- `helpers.ts`의 노드 생성 헬퍼를 활용한다
