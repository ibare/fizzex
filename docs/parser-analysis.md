# Fizzex LaTeX 파서 분석

Tolerant & Streaming Parser 구현을 위한 기반 분석 문서.

## 1. 파서 구조

| 항목 | 현황 |
|------|------|
| 방식 | One-pass 재귀 하강 (recursive descent) |
| 토크나이저 | 별도 분리 없음 — 문자 단위 순회 |
| 위치 추적 | `pos` 변수 (character offset, 0-based) |
| 반환 형식 | `{ nodes: MathNode[], consumed: number }` |
| 에러 처리 | ParseErrorCollector (collector pattern) — 파싱 중단 없이 에러 수집 |

**핵심 함수 체인:**
```
parseLatexWithErrors(latex)
  └─ parseExpression(latex, pos, stopChars)
       ├─ parseNumber()        — 숫자 (각 자릿수 별도 노드)
       ├─ parseCommand()       — LaTeX 명령어 (\frac, \alpha 등)
       │    └─ CommandHandler   — 레지스트리 기반 (150+ 명령어)
       ├─ parseGroup()         — 그룹 ({...}, (...), 단일 문자)
       ├─ parseBeginEnvironment() — 환경 (matrix, align, cases 등)
       └─ 리프 노드 (변수, 연산자, 구두점 등)
```

**파일:** `src/latex/latex-parser.ts` (1160줄)

## 2. AST 노드 타입 (32개)

| 카테고리 | 타입 |
|---------|------|
| 컨테이너 | `root`, `row` |
| 리프 | `number`, `variable`, `operator`, `text`, `space` |
| 구조 | `frac`, `power`, `subscript`, `sqrt`, `paren`, `abs`, `func` |
| 대형 연산자 | `integral`, `sum`, `limit`, `product` |
| 장식 | `overline`, `accent`, `overset`, `cancel`, `xarrow` |
| 환경 | `matrix`, `align`, `cases`, `gather`, `array` |

**기본 인터페이스:**
```typescript
interface MathNodeBase {
  id: string;
  type: MathNodeType;
  sourceRange?: SourceRange;  // [보강됨] 원본 LaTeX 위치
}
```

**자식 참조 방식:**
- 컨테이너 노드: `children: MathNode[]`
- 복합 노드: 명명된 필드 (`numerator`, `denominator`, `base`, `exponent` 등)
- 모든 자식 배열은 `RowNode`로 래핑

## 3. 에러 정보 품질

```typescript
interface ParseError {
  type: ParseErrorType;       // syntax, unsupported, incomplete, ...
  severity: 'error' | 'warning' | 'info';
  message: string;            // 한국어 에러 메시지
  position: number;           // character offset (0-based)
  context: string;            // 주변 +/-20자 + ^ 마커
  token?: string;             // 문제된 토큰
  expected?: string[];        // [보강됨] 기대한 토큰 목록
  partialAST?: MathNode;      // [보강됨] 부분 AST (단계 3에서 활용)
}
```

**에러 수집:** 전역 싱글톤 `ParseErrorCollector` — `createErrorCollector()` → `reportError()` → `clearErrorCollector()`

**에러 위치 정확도:** position은 정확한 character offset을 제공. context는 주변 텍스트 + `^` 마커로 시각적 위치 표시.

## 4. Box tree <-> AST 매핑

| 항목 | 현황 |
|------|------|
| Box 타입 | 7개: `hbox`, `vbox`, `glyph`, `rule`, `kern`, `surd`, `path` |
| AST 참조 보존 | `BoxBase.sourceId?: string` — AST node ID 저장 |
| 1 AST -> N Box | 있음 (NumberNode "123" -> 3 GlyphBox) |
| N AST -> 1 Box | 있음 (RowNode -> 1 HBox) |

**시각 피드백 전략:** `sourceId`를 통해 Box에서 AST 노드로 역추적 가능. 노드 단위 시각 피드백(물결선)의 기반이 존재함. 다만 1:N/N:1 매핑이 있어 정밀도가 수식 단위일 수 있음.

## 5. 의존성 그래프

```
src/types.ts (MathNode 타입)
  ↑
src/latex/latex-parser.ts (파서)
  ├─ src/latex/parse-errors.ts (에러 수집)
  ├─ src/latex/command-registry.ts (명령어 레지스트리)
  │    └─ src/latex/commands/*.ts (핸들러 150+)
  ├─ src/latex/known-commands.ts (표준 명령어 분류)
  └─ src/utils/id-generator.ts (ID 생성)

src/box/ast-to-box.ts (렌더러) ← 파서와 완전 독립
```

**파서는 렌더러에 의존하지 않음.** 파서만 독립적으로 수정 가능.

## 6. 단계 1 보강 사항

### a) SourceRange 추가 (`src/types.ts`)
- `SourceRange { start: number; end: number }` — 원본 LaTeX 문자열 기준 위치
- `MathNodeBase.sourceRange?: SourceRange` — 모든 노드에 optional 위치 정보

### b) ParseError 확장 (`src/latex/parse-errors.ts`)
- `expected?: string[]` — 에러 시 기대한 토큰 목록
- `partialAST?: MathNode` — 에러 이전 부분 AST (단계 3용 인터페이스)

### c) 파서 sourceRange 기록 (`src/latex/latex-parser.ts`)
- 리프 노드: 정확한 character 범위 (`{ start: pos, end: pos + 1 }`)
- 복합 노드 (power, subscript, paren, abs): base/여는기호 ~ 끝 범위
- Command handler 반환 노드: `patchSourceRange` 후보정 (command 전체 범위)
- RootNode: `{ start: 0, end: input.length }`

### d) expected 토큰 추가 (`src/latex/commands/basic.ts`)
- `unmatchedEndHandler`: `expected: ['\\begin{envName}']`
- `unmatchedRightHandler`: `expected: ['\\left']`

### e) 테스트 (19개 추가)
- sourceRange 추적: 변수, 수식, 숫자, 분수, 거듭제곱, 아래첨자, 괄호, 절댓값, 루트, 그리스 문자, 구두점, 팩토리얼, 이스케이프, 대괄호
- expected 필드: 설정/미설정/경고/정보/token 없이 expected만
