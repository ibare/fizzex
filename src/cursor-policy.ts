/**
 * 커서 정책 — (parentType, slotName) 쌍별 컴파일 타임 exhaustive 정책표.
 *
 * 편집기에서 어떤 슬롯 안에 있을 때 이항 연산자(+, -, ×, ÷, =, <, >) 가 들어오면
 * 슬롯을 자동 종료할지(`autoExitOnBinop`), 명시 닫힘 키로만 종료되는지
 * (`hasExplicitClose`) 를 결정한다.
 *
 * 정책 키가 (parentType, slotName) 쌍인 이유:
 *   row id 접미사(`_content` 등)는 paren·abs·sqrt·overline·accent·cancel 가 모두
 *   공유하지만 닫힘 정책은 서로 다르다. 접미사 단일 분기로는 표현 불가.
 *
 * 이 모듈은 노드를 생성하거나 AST 를 변경하지 않는다. 순수 정책 조회.
 */

import type { MathNode } from './types';

// ─── 타입 ───

/** 한 슬롯의 커서 정책 */
export interface SlotPolicy {
  /** 이항 연산자 입력 시 슬롯을 자동 종료할지 */
  readonly autoExitOnBinop: boolean;
  /** 명시 닫힘 키(예: `)`, `|`) 로만 종료되는 슬롯인지 */
  readonly hasExplicitClose: boolean;
}

/**
 * 자식 슬롯을 가지는 컨테이너 노드 타입.
 *
 * `src/types.ts` 의 MathNode 유니온 중 자식 MathNode[] 슬롯을 하나 이상 가진 노드.
 * leaf(number, variable, operator, text, space, literal, error) 와 구조 컨테이너
 * (row, root) 는 제외 — 이들은 커서 정책 대상이 아니다.
 *
 * 새 컨테이너 노드가 types.ts 에 추가되면, 이 유니온과 CONTAINER_POLICY 양쪽에
 * 누락 없이 더해야 한다 (mapped type 으로 컴파일 타임 강제).
 */
export type ContainerNodeType =
  | 'frac'
  | 'power'
  | 'subscript'
  | 'sqrt'
  | 'paren'
  | 'abs'
  | 'func'
  | 'integral'
  | 'sum'
  | 'product'
  | 'limit'
  | 'overline'
  | 'accent'
  | 'cancel'
  | 'overset'
  | 'xarrow'
  | 'matrix'
  | 'align'
  | 'cases'
  | 'gather'
  | 'array'
  | 'opaque';

/**
 * MathNode 유니온 중 새 컨테이너가 누락되면 컴파일 에러로 잡는 가드.
 *
 * 사용 예: `const _: ExhaustiveContainerCheck = true;`
 * MathNode 에 추가된 새 type 이 ContainerNodeType 에도, leaf set 에도 포함되지
 * 않으면 이 타입이 `false` 가 되어 컴파일 실패한다.
 */
type LeafLikeNodeType =
  | 'number' | 'variable' | 'operator'
  | 'text' | 'space' | 'literal' | 'error'
  | 'row' | 'root';

export type ExhaustiveContainerCheck =
  MathNode['type'] extends ContainerNodeType | LeafLikeNodeType ? true : false;

// 컴파일 타임 단언: MathNode 의 모든 type 이 컨테이너 / leaf-like 둘 중 하나에
// 속해야 한다. 새 노드가 추가될 때 이 줄에서 type error 가 나면 위 유니온에
// 더하라.
const _exhaustive: ExhaustiveContainerCheck = true;
void _exhaustive;

// ─── 정책 상수 ───

/** Term-shaped 슬롯: 이항 연산자에 자동 종료, 명시 닫힘 없음 */
const TERM: SlotPolicy = { autoExitOnBinop: true, hasExplicitClose: false };

/** Sub-expression 슬롯: 자동 종료 없음, 명시 닫힘도 없음 (ArrowRight 등으로만 빠져나감) */
const SUBEXPR: SlotPolicy = { autoExitOnBinop: false, hasExplicitClose: false };

/** 명시 닫힘 슬롯: paren `)`, abs `|` 등 닫힘 키로만 종료 */
const EXPLICIT_CLOSE: SlotPolicy = { autoExitOnBinop: false, hasExplicitClose: true };

// ─── 정책표 ───

/**
 * 컨테이너 노드 타입별 슬롯 정책표.
 *
 * mapped type `{ [K in ContainerNodeType]: Record<string, SlotPolicy> }` 으로
 * 모든 컨테이너 타입에 대한 정책 정의가 컴파일 타임 강제된다.
 *
 * 슬롯명은 다음 규약을 따른다:
 *   - 단일/명명 슬롯: types.ts 의 인터페이스 필드명 그대로 (e.g. `numerator`,
 *     `content`, `lower`, `body`)
 *   - 컬렉션 슬롯: 합성명 — matrix·align·cases·array 는 `cell`, gather 는 `row`,
 *     opaque 는 `arg`. row id 에서 슬롯명을 도출하는 책임은 S2 `resolveRowSlot`
 *     가 진다.
 */
export const CONTAINER_POLICY: {
  readonly [K in ContainerNodeType]: { readonly [slot: string]: SlotPolicy };
} = {
  // ── 분수 / 거듭제곱 / 첨자 ──
  frac: {
    numerator: TERM,
    denominator: TERM,
  },
  power: {
    base: SUBEXPR,
    exponent: TERM,
  },
  subscript: {
    base: SUBEXPR,
    subscript: TERM,
  },

  // ── 명시 닫힘 컨테이너 ──
  paren: {
    content: EXPLICIT_CLOSE,
  },
  abs: {
    content: EXPLICIT_CLOSE,
  },

  // ── 시각 그룹 (Sub-expression) ──
  sqrt: {
    content: SUBEXPR,
    index: TERM,
  },
  overline: {
    content: SUBEXPR,
  },
  accent: {
    content: SUBEXPR,
  },
  cancel: {
    content: SUBEXPR,
  },

  // ── 함수 ──
  func: {
    argument: TERM,
  },

  // ── 대형 연산자 (적분/합/곱/극한) ──
  integral: {
    lower: TERM,
    upper: TERM,
    integrand: SUBEXPR,
  },
  sum: {
    lower: TERM,
    upper: TERM,
    body: SUBEXPR,
  },
  product: {
    lower: TERM,
    upper: TERM,
    body: SUBEXPR,
  },
  limit: {
    approach: TERM,
    body: SUBEXPR,
  },

  // ── 위/아래 주석 / 화살표 ──
  overset: {
    base: SUBEXPR,
    annotation: TERM,
  },
  xarrow: {
    above: TERM,
    below: TERM,
  },

  // ── 표/배열 환경 ──
  matrix: {
    cell: SUBEXPR,
  },
  align: {
    cell: SUBEXPR,
  },
  cases: {
    cell: SUBEXPR,
  },
  array: {
    cell: SUBEXPR,
  },
  gather: {
    row: SUBEXPR,
  },

  // ── 불투명 ──
  opaque: {
    arg: SUBEXPR,
  },
};

// ─── 조회 API ───

/** parentType 이 컨테이너 노드 타입인지 (런타임 가드) */
export function isContainerNodeType(type: string): type is ContainerNodeType {
  return type in CONTAINER_POLICY;
}

/**
 * (parentType, slotName) 쌍의 정책을 반환. 매칭 없으면 null.
 *
 * - row/root 등 비컨테이너 parentType → null
 * - 존재하지 않는 슬롯명 → null
 */
export function getSlotPolicy(
  parentType: MathNode['type'],
  slotName: string,
): SlotPolicy | null {
  if (!isContainerNodeType(parentType)) return null;
  const slots = CONTAINER_POLICY[parentType];
  return slots[slotName] ?? null;
}
