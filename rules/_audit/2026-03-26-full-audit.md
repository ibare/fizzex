---
date: 2026-03-26
scope: full codebase
auditor: claude-opus-4-6
rules_version: 1
---

# Fizzex 코드베이스 전수 감사 보고서

## 개요

| 항목 | 값 |
|------|-----|
| 감사 일시 | 2026-03-26 |
| 감사 범위 | src/ 전체 (88개 소스 파일, ~20,454 LOC) |
| 규칙 수 | Principles 6개 + Concerns 6개 (C1~C6) |
| **위반 (감사 시점)** | **5건** (critical 1, high 3, medium 1) |
| **수정 완료** | **5건** (V1, V2, V3, V4, V5 — 전수 해소) |
| **미수정** | **0건** |
| **경고** | **1건** |
| **준수** | **12개 규칙 전수 준수** (수정 후) |

---

## 요약 대시보드

| 규칙 | 상태 | 위반 수 | 심각도 |
|------|------|---------|--------|
| P1 — AST 진실의 원천 | ✅ PASS | 0 | — |
| P2 — 파이프라인 독립 | ✅ PASS | 0 | — |
| P3 — 프레임워크 격리 | ✅ PASS | 0 | — |
| P4 — 불변 상태 | ✅ FIXED | 0 (수정 완료) | — |
| P5 — 타입 안전 | ✅ FIXED | 0 (수정 완료) | — |
| P6 — 최소 영향 변경 | ⬜ N/A | — | — |
| C1 — 노드 생성 | ✅ FIXED | 0 (수정 완료) | — |
| C2 — 명령어 등록 | ✅ PASS | 0 | — |
| C3 — 프레임워크 격리 | ✅ FIXED | 0 (수정 완료) | — |
| C4 — Box 모델 | ✅ PASS | 0 | — |
| C5 — Headless 계약 | ✅ PASS | 0 | — |
| C6 — Subpath Export | ✅ PASS | 0 | — |

---

## 위반 상세

### V1. [critical] P4 — 불변 상태 위반: editor.ts AST 직접 변경

**파일:** `src/editor.ts`
**영향 범위:** insert/delete 관련 모든 메서드 (25+ 개소)

**현상:**
- `insertNumber()`, `insertVariable()`, `insertOperator()`, `insertFraction()` 등 모든 삽입 메서드가 AST 노드의 `children` 배열을 `.splice()`로 직접 변경
- `this.state.cursor.offset++`로 커서 상태를 직접 변경
- `backspace()` 메서드도 `.splice()`로 원본 배열 변경

**위반 개소 (대표):**
| 라인 | 메서드 | 변경 패턴 |
|-------|--------|-----------|
| 488 | insertNumber | `children.splice(offset, 0, newNode)` |
| 489 | insertNumber | `this.state.cursor.offset++` |
| 504 | insertVariable | `children.splice(...)` |
| 523 | insertOperator | `children.splice(...)` |
| 575, 580 | insertFraction | `children.splice(...)` × 2 |
| 601 | insertFraction | `result.unshift(node)` |
| 624, 629 | insertPower | `children.splice(...)` × 2 |
| 654, 659 | insertSubscript | `children.splice(...)` × 2 |
| 865, 883 | backspace | `children.splice(...)` × 2 |
| 1137, 1166 | insertSqrt, insertFunc | `children.splice(...)` |

**기대 동작:** 상태 변경 시 새 EditorState 객체를 생성하여 반환해야 함. spread 연산자, `Array.concat()`, `Array.toSpliced()` 등 불변 패턴 사용.

**수정 방향:**
```typescript
// AS-IS (위반)
children.splice(offset, 0, newNode);
this.state.cursor.offset++;

// TO-BE (준수)
const newChildren = [...children.slice(0, offset), newNode, ...children.slice(offset)];
const newState = { ...this.state, cursor: { ...this.state.cursor, offset: offset + 1 } };
```

---

### V2. [high] C1 — 수동 ID 문자열 지정 (deriveId 미사용)

**파일:** `src/editor.ts`, `src/latex/latex-parser.ts`
**영향 범위:** 복합 노드 생성 시 RowNode ID 생성 (25+ 개소)

**현상:**
editor.ts와 latex-parser.ts의 `createFrac()`, `createPower()`, `createSqrt()` 등에서 template literal로 ID를 직접 생성:
```typescript
// 위반 코드 (editor.ts)
const numRow: RowNode = { id: `${fracId}_num`, type: 'row', children: numerator };

// 올바른 코드 (latex/commands/helpers.ts)
const numRow: RowNode = { id: deriveId(fracId, '_num'), type: 'row', children: numerator };
```

**위반 개소:**

| 파일 | 라인 | 함수 | 패턴 |
|------|------|------|------|
| editor.ts | 99-100 | createFrac | `${fracId}_num`, `_den` |
| editor.ts | 107 | createPower | `${powerId}_exp` |
| editor.ts | 113 | createParen | `${parenId}_content` |
| editor.ts | 120 | createSubscript | `${subId}_sub` |
| editor.ts | 126 | createAbs | `${absId}_content` |
| editor.ts | 137-139 | createIntegral | `_lower`, `_upper`, `_integrand` |
| editor.ts | 156-158 | createSum | `_lower`, `_upper`, `_body` |
| editor.ts | 174-175 | createLimit | `_approach`, `_body` |
| editor.ts | 191-193 | createProduct | `_lower`, `_upper`, `_body` |
| editor.ts | 205 | createOverline | `_content` |
| editor.ts | 225 | createMatrix | `_cell_${i}_${j}` |
| latex-parser.ts | 468-469 | createFrac | `${fracId}_num`, `_den` |
| latex-parser.ts | 475 | createPower | `${powerId}_exp` |
| latex-parser.ts | 481 | createSubscript | `${subId}_sub` |
| latex-parser.ts | 487 | createParen | `${parenId}_content` |
| latex-parser.ts | 493 | createAbs | `${absId}_content` |
| latex-parser.ts | 499, 501 | createSqrt | `_content`, `_index` |
| latex-parser.ts | 519-521 | createIntegral | `_lower`, `_upper`, `_integrand` |
| latex-parser.ts | 535-537 | createSum | `_lower`, `_upper`, `_body` |
| latex-parser.ts | 549-550 | createLimit | `_approach`, `_body` |
| latex-parser.ts | 562-564 | createProduct | `_lower`, `_upper`, `_body` |
| latex-parser.ts | 576 | createOverline | `_content` |
| latex-parser.ts | 589 | createAccent | `_content` |
| latex-parser.ts | 621, 625 | matrix | `_cell_${i}_${j}` |

**참고:** `latex/commands/helpers.ts`는 올바르게 `deriveId()`를 사용 중. editor.ts와 latex-parser.ts만 미준수.

---

### V3. [high] C1 — astToLatex()에 accent 분기 누락

**파일:** `src/latex/ast-to-latex.ts`
**영향:** AccentNode가 LaTeX로 직렬화되지 않음 (빈 문자열 반환)

**현상:**
- `AccentNode`는 `src/types.ts` (lines 148-152)에 정의됨
- `astToBox()` (src/box/ast-to-box.ts:95)에는 accent 분기가 존재함
- `latex-parser.ts`에서 accent 노드를 생성함 (lines 584-596)
- **그러나** `astToLatex()`의 switch 문에 `'accent'` case가 누락되어 default로 빈 문자열 반환

**수정 방향:**
```typescript
case 'accent':
  return `\\${node.accent}{${astToLatex(node.content)}}`;
```

---

### V4. [high] P5 — 타입 안전: switch 문 분기 누락 + as unknown 사용

**4-A. switch 문에서 최신 노드 타입 분기 누락**

아래 파일들의 switch 문에서 `accent`, `align`, `cases`, `gather`, `array` 타입이 처리되지 않음:

| 파일 | 함수 | 누락 타입 |
|------|------|-----------|
| `src/editor.ts:274-305` | getChildKeys() | accent, align, cases, gather, array |
| `src/analyzer/ast-walker.ts:77-200` | walkNode() | accent, align, cases, gather, array |
| `src/analyzer/ast-walker.ts:231-304` | findNodes() | accent, align, cases, gather, array |
| `src/analyzer/polynomial-analyzer.ts:237-299` | getChildren() | accent, align, cases, gather, array |
| `src/analyzer/variable-classifier.ts:402-435` | getNodeChildren() | accent, integral, sum, limit, product, align, cases, gather, array |

**참고:** `astToBox()`와 `astToLatex()`는 이미 모든 타입을 올바르게 처리하고 `never` 타입으로 exhaustive check 수행.

**4-B. `as unknown` 캐스팅 사용**

| 파일 | 라인 | 코드 |
|------|------|------|
| `src/editor.ts` | 36 | `(node as unknown as Record<string, MathNode[]>)[key]` |
| `src/suggestion/suggestion-engine.ts` | 589 | `(node as unknown as Record<string, unknown>)[key]` |
| `src/analyzer/polynomial-analyzer.ts` | 69, 78, 87, 107 | `(window as unknown as { DEBUG_ANALYZER?: boolean })` |
| `src/cas/cas-service.ts` | 62 | `as unknown as NerdamerAPI` (외부 라이브러리, 허용 가능) |

---

### V5. [medium] C3 — core 모듈에서 window 전역 객체 직접 접근

**파일:** `src/analyzer/polynomial-analyzer.ts`
**라인:** 69, 78, 87, 107

**현상:**
```typescript
if (typeof window !== 'undefined' && (window as unknown as { DEBUG_ANALYZER?: boolean }).DEBUG_ANALYZER) {
  console.log(...);
}
```

core 모듈(analyzer/)에서 `window` 전역 객체에 직접 접근. `typeof` 가드가 있어 런타임 오류는 없지만, 프레임워크 격리 원칙에 위배.

**수정 방향:** 디버그 로깅을 콜백/옵션으로 주입하거나, 별도 디버그 유틸리티로 분리.

---

## 경고 (WARNING)

### W1. C1 PREFER — editor.ts, latex-parser.ts가 node-factory.ts 미사용

**파일:** `src/editor.ts`, `src/latex/latex-parser.ts`

두 파일 모두 `node-factory.ts`나 `helpers.ts`의 팩토리 함수를 사용하지 않고 자체적으로 노드 생성 함수를 정의. 코드 중복 발생.

---

## 준수 현황 (PASS)

### C2 — LaTeX 명령어 등록 규칙: 완전 준수

- 187개 명령어가 7개 카테고리 파일에 올바르게 등록
- 모든 핸들러가 `(context) => CommandResult` 시그니처 준수
- `latex-parser.ts`에 명령어별 분기 없음 (레지스트리 lookup 사용)
- 핸들러 내 파서 내부 상태 조작 없음

### C4 — Box 모델 규칙: 완전 준수

- Box의 y 좌표가 일관되게 baseline으로 해석됨
- height/depth 의미론 올바름
- 8개 Canvas 리사이즈 지점 모두 HiDPI 패턴 준수 (`canvas.width = cssWidth * dpr; ctx.scale(dpr, dpr)`)
- 리사이즈 후 CanvasFontMetrics/Projector 재생성 확인
- context transform state를 save/restore로 올바르게 관리

### C5 — Headless 계약 규칙: 완전 준수

- FizzexRenderer/FizzexEditor public API 완비
- FizzexConfig 인터페이스 안정 (optional 필드만 사용)
- destroy()가 DOM 요소, 이벤트 리스너 7개, 타이머를 모두 정리
- render()에서 잘못된 LaTeX도 silent fail (예외 미발생)
- 폰트 미로드 시 fallback 폰트로 즉시 렌더링
- headless 모듈에 프레임워크 import 없음

### C6 — Subpath Export 규칙: 완전 준수

- 4개 subpath(`.`, `./headless`, `./react`, `./tiptap`) 독립 import 가능
- headless에 React/Tiptap 코드 미포함
- tiptap에 React 코드 미포함
- react에 Tiptap 코드 미포함
- 모든 optional peerDependency에 `optional: true` 명시
- `sideEffects: false` 유지
- subpath 간 순환 의존 없음
- 각 subpath index.ts에서 명시적 re-export 사용

### P1 — AST 진실의 원천: 준수

- 모든 연산이 AST를 중심으로 동작
- EditorState가 AST(RootNode)를 핵심 상태로 보유

### P2 — 파이프라인 독립: 준수

- box/는 latex/를 import하지 않음
- latex/는 box/를 import하지 않음
- 모든 단계가 types.ts의 인터페이스만으로 연결

### P3 — 프레임워크 격리 (원칙 수준): 준수

- core 모듈(box/, latex/, types.ts, editor.ts, cas/, utils/)에 React/Konva import 없음
- 프레임워크 의존 코드가 react/, visualizer/, headless/, integrations/에만 존재

---

## 수정 이력

| 위반 | 심각도 | 상태 | 커밋 | 설명 |
|------|--------|------|------|------|
| V3: C1 astToLatex accent 누락 | high | ✅ 수정 완료 | `478936e` | accent case 추가 |
| V4: P5 switch 분기 누락 + as unknown | high | ✅ 수정 완료 | `e55d75f` | 5개 파일 switch 보완 + as unknown 제거 |
| V5: C3 window 접근 | medium | ✅ 수정 완료 | `5088adf` | 모듈 레벨 debugEnabled 플래그로 교체 |
| V2: C1 deriveId 미사용 | high | ✅ 수정 완료 | `63d9989` | deriveId()/deriveCellId()로 전면 교체 |
| V1: P4 불변 상태 | critical | ✅ 수정 완료 | `a847ca8`~`2d7cccc` | 5-phase 리팩토링: immutable utils → simple inserts → complex inserts → delete/nav → freeze |

## 잔여 이슈

없음. 모든 위반 사항이 해소되었습니다.
