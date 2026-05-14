/**
 * 커서 정책 테스트
 *
 * 정책표 단위 테스트(getSlotPolicy/canonicalSlotName/getSlotPolicyByParent)와
 * MathEditor 키 시퀀스 행동 회귀 테스트를 함께 다룬다. 행동 테스트는 사용자가
 * 보고한 paren 자동 탈출 버그를 영구히 잠근다.
 */

import { describe, it, expect, vi } from 'vitest';
import type {
  CursorPosition,
  BoundaryCursor,
  ParenNode,
  AbsNode,
  SqrtNode,
  RowNode,
  VariableNode,
  OperatorNode,
  FracNode,
  PowerNode,
  SubscriptNode,
  NumberNode,
} from './types';
import {
  CONTAINER_POLICY,
  canonicalSlotName,
  getSlotPolicy,
  getSlotPolicyByParent,
  isContainerNodeType,
  type ContainerNodeType,
} from './cursor-policy';
import { MathEditor, keyToInputAction } from './editor';

function bc(c: CursorPosition): BoundaryCursor {
  if (c.kind !== 'boundary') throw new Error('expected boundary cursor');
  return c;
}

/** 키 시퀀스로 에디터를 구동한다 */
function typeKeys(editor: MathEditor, keys: string[]): void {
  for (const k of keys) {
    const action = keyToInputAction(k);
    if (action) editor.dispatchInputAction(action);
  }
}

describe('cursor-policy — 단위', () => {
  describe('getSlotPolicy', () => {
    it('paren.content 는 명시 닫힘, 자동 종료 없음', () => {
      expect(getSlotPolicy('paren', 'content')).toEqual({
        autoExitOnBinop: false,
        hasExplicitClose: true,
      });
    });

    it('abs.content 도 명시 닫힘', () => {
      expect(getSlotPolicy('abs', 'content')).toEqual({
        autoExitOnBinop: false,
        hasExplicitClose: true,
      });
    });

    it('frac.numerator / denominator 는 term-shaped (자동 종료)', () => {
      expect(getSlotPolicy('frac', 'numerator')).toMatchObject({ autoExitOnBinop: true });
      expect(getSlotPolicy('frac', 'denominator')).toMatchObject({ autoExitOnBinop: true });
    });

    it('power.exponent / subscript.subscript 는 term-shaped', () => {
      expect(getSlotPolicy('power', 'exponent')).toMatchObject({ autoExitOnBinop: true });
      expect(getSlotPolicy('subscript', 'subscript')).toMatchObject({ autoExitOnBinop: true });
    });

    it('sqrt.content 는 sub-expression (자동 종료 없음)', () => {
      expect(getSlotPolicy('sqrt', 'content')).toMatchObject({
        autoExitOnBinop: false,
        hasExplicitClose: false,
      });
    });

    it('overline / accent / cancel content 는 sub-expression', () => {
      for (const t of ['overline', 'accent', 'cancel'] as const) {
        expect(getSlotPolicy(t, 'content')).toMatchObject({ autoExitOnBinop: false });
      }
    });

    it('integral.integrand / sum.body / product.body / limit.body 는 sub-expression', () => {
      expect(getSlotPolicy('integral', 'integrand')).toMatchObject({ autoExitOnBinop: false });
      expect(getSlotPolicy('sum', 'body')).toMatchObject({ autoExitOnBinop: false });
      expect(getSlotPolicy('product', 'body')).toMatchObject({ autoExitOnBinop: false });
      expect(getSlotPolicy('limit', 'body')).toMatchObject({ autoExitOnBinop: false });
    });

    it('integral / sum / product 의 lower·upper 는 term-shaped', () => {
      for (const t of ['integral', 'sum', 'product'] as const) {
        expect(getSlotPolicy(t, 'lower')).toMatchObject({ autoExitOnBinop: true });
        expect(getSlotPolicy(t, 'upper')).toMatchObject({ autoExitOnBinop: true });
      }
    });

    it('컨테이너 아닌 부모(row/root) 는 null', () => {
      expect(getSlotPolicy('row', 'children')).toBeNull();
      expect(getSlotPolicy('root', 'children')).toBeNull();
    });

    it('등록되지 않은 슬롯명은 null', () => {
      expect(getSlotPolicy('frac', 'bogus')).toBeNull();
      expect(getSlotPolicy('paren', 'numerator')).toBeNull();
    });
  });

  describe('canonicalSlotName', () => {
    it('matrix / align / cases / array 의 rows 는 cell', () => {
      for (const t of ['matrix', 'align', 'cases', 'array'] as const) {
        expect(canonicalSlotName(t, 'rows')).toBe('cell');
      }
    });

    it('gather 의 rows 는 row', () => {
      expect(canonicalSlotName('gather', 'rows')).toBe('row');
    });

    it('opaque 의 args 는 arg', () => {
      expect(canonicalSlotName('opaque', 'args')).toBe('arg');
    });

    it('단일/명명 슬롯은 필드명 그대로', () => {
      expect(canonicalSlotName('frac', 'numerator')).toBe('numerator');
      expect(canonicalSlotName('paren', 'content')).toBe('content');
      expect(canonicalSlotName('integral', 'integrand')).toBe('integrand');
    });
  });

  describe('getSlotPolicyByParent', () => {
    it('matrix.rows → cell 슬롯의 SUBEXPR 정책', () => {
      expect(getSlotPolicyByParent('matrix', 'rows')).toMatchObject({
        autoExitOnBinop: false,
        hasExplicitClose: false,
      });
    });

    it('gather.rows → row 슬롯', () => {
      expect(getSlotPolicyByParent('gather', 'rows')).toMatchObject({
        autoExitOnBinop: false,
      });
    });

    it('opaque.args → arg 슬롯', () => {
      expect(getSlotPolicyByParent('opaque', 'args')).toMatchObject({
        autoExitOnBinop: false,
      });
    });

    it('비컨테이너 부모는 null', () => {
      expect(getSlotPolicyByParent('row', 'children')).toBeNull();
    });
  });

  describe('정책표 완전성', () => {
    it('모든 ContainerNodeType 에 적어도 하나의 슬롯 정책이 존재', () => {
      const types = Object.keys(CONTAINER_POLICY) as ContainerNodeType[];
      expect(types.length).toBeGreaterThan(0);
      for (const t of types) {
        const slots = CONTAINER_POLICY[t];
        expect(Object.keys(slots).length).toBeGreaterThan(0);
      }
    });

    it('isContainerNodeType 가드 일관성', () => {
      expect(isContainerNodeType('frac')).toBe(true);
      expect(isContainerNodeType('paren')).toBe(true);
      expect(isContainerNodeType('matrix')).toBe(true);
      expect(isContainerNodeType('row')).toBe(false);
      expect(isContainerNodeType('root')).toBe(false);
      expect(isContainerNodeType('number')).toBe(false);
      expect(isContainerNodeType('variable')).toBe(false);
    });
  });
});

describe('cursor-policy — 키 시퀀스 행동 회귀', () => {
  describe('paren·abs 자동 탈출 버그 (사용자 보고)', () => {
    it('`(`, `a`, `*`, `b`, `)` 키 시퀀스가 paren 안에 a×b 를 만든다', () => {
      const editor = new MathEditor(vi.fn());
      typeKeys(editor, ['(', 'a', '*', 'b', ')']);

      const state = editor.getState();
      expect(state.ast.children).toHaveLength(1);
      const paren = state.ast.children[0] as ParenNode;
      expect(paren.type).toBe('paren');

      const content = paren.content[0] as RowNode;
      expect(content.children).toHaveLength(3);
      expect((content.children[0] as VariableNode).name).toBe('a');
      expect((content.children[1] as OperatorNode).operator).toBe('×');
      expect((content.children[2] as VariableNode).name).toBe('b');
    });

    it('`(`, `a`, `+`, `b`, `)` 도 paren 안에 a+b 를 만든다', () => {
      const editor = new MathEditor(vi.fn());
      typeKeys(editor, ['(', 'a', '+', 'b', ')']);

      const state = editor.getState();
      const paren = state.ast.children[0] as ParenNode;
      const content = paren.content[0] as RowNode;
      expect(content.children).toHaveLength(3);
      expect((content.children[1] as OperatorNode).operator).toBe('+');
    });

    it('`|`, `a`, `+`, `b`, `|` 키 시퀀스가 abs 안에 a+b 를 만든다', () => {
      const editor = new MathEditor(vi.fn());
      typeKeys(editor, ['|', 'a', '+', 'b']);

      const state = editor.getState();
      const abs = state.ast.children[0] as AbsNode;
      expect(abs.type).toBe('abs');

      const content = abs.content[0] as RowNode;
      expect(content.children).toHaveLength(3);
      expect((content.children[0] as VariableNode).name).toBe('a');
      expect((content.children[1] as OperatorNode).operator).toBe('+');
      expect((content.children[2] as VariableNode).name).toBe('b');
    });

    it('`)` 입력으로 paren 명시 닫힘 — 커서가 paren 다음으로 이동', () => {
      const editor = new MathEditor(vi.fn());
      typeKeys(editor, ['(', 'a', ')']);

      const state = editor.getState();
      const paren = state.ast.children[0] as ParenNode;
      // 커서가 루트의 paren 다음(인덱스 1)에 위치
      expect(bc(state.cursor).parentId).toBe(state.ast.id);
      expect(bc(state.cursor).index).toBe(1);
      // paren 안 내용물 보존
      const content = paren.content[0] as RowNode;
      expect(content.children).toHaveLength(1);
      expect((content.children[0] as VariableNode).name).toBe('a');
    });
  });

  describe('sqrt·overline 등 sub-expression 슬롯 보존', () => {
    it('sqrt 안에서 `a+b` 입력 시 + 가 sqrt 안에 머문다', () => {
      const editor = new MathEditor(vi.fn());
      editor.insertSqrt();
      typeKeys(editor, ['a', '+', 'b']);

      const state = editor.getState();
      const sqrt = state.ast.children[0] as SqrtNode;
      const content = sqrt.content[0] as RowNode;
      expect(content.children).toHaveLength(3);
      expect((content.children[1] as OperatorNode).operator).toBe('+');
    });
  });

  describe('term-shaped 슬롯 자동 탈출 (기존 동작 보존)', () => {
    it('`1`, `/`, `2`, `+`, `3` 시퀀스: + 가 분수 밖으로 나간다', () => {
      const editor = new MathEditor(vi.fn());
      typeKeys(editor, ['1', '/', '2', '+', '3']);

      const state = editor.getState();
      // 루트 children: [Frac(1/2), +, 3]
      expect(state.ast.children).toHaveLength(3);
      const frac = state.ast.children[0] as FracNode;
      expect(frac.type).toBe('frac');
      const numRow = frac.numerator[0] as RowNode;
      const denRow = frac.denominator[0] as RowNode;
      expect((numRow.children[0] as NumberNode).value).toBe('1');
      expect((denRow.children[0] as NumberNode).value).toBe('2');
      expect((state.ast.children[1] as OperatorNode).operator).toBe('+');
      expect((state.ast.children[2] as NumberNode).value).toBe('3');
    });

    it('`x`, `^`, `2`, `+`, `1` 시퀀스: + 가 지수 밖으로 나간다', () => {
      const editor = new MathEditor(vi.fn());
      typeKeys(editor, ['x', '^', '2', '+', '1']);

      const state = editor.getState();
      // 루트 children: [x_or_power, ...] — collectPrecedingTerm 이 x 를 base 로 흡수
      // power, +, 1 구조
      expect(state.ast.children).toHaveLength(3);
      const power = state.ast.children[0] as PowerNode;
      expect(power.type).toBe('power');
      const expRow = power.exponent[0] as RowNode;
      expect((expRow.children[0] as NumberNode).value).toBe('2');
      expect((state.ast.children[1] as OperatorNode).operator).toBe('+');
      expect((state.ast.children[2] as NumberNode).value).toBe('1');
    });

    it('`x`, `_`, `1`, `+`, `2` 시퀀스: + 가 아래첨자 밖으로 나간다', () => {
      const editor = new MathEditor(vi.fn());
      typeKeys(editor, ['x', '_', '1', '+', '2']);

      const state = editor.getState();
      expect(state.ast.children).toHaveLength(3);
      const sub = state.ast.children[0] as SubscriptNode;
      expect(sub.type).toBe('subscript');
      const subRow = sub.subscript[0] as RowNode;
      expect((subRow.children[0] as NumberNode).value).toBe('1');
      expect((state.ast.children[1] as OperatorNode).operator).toBe('+');
      expect((state.ast.children[2] as NumberNode).value).toBe('2');
    });
  });

  describe('중첩: paren 안의 frac', () => {
    it('paren 안에서 분수를 만들고 분자에 + 입력 — 분자만 탈출, paren 은 유지', () => {
      const editor = new MathEditor(vi.fn());
      // (1/2+3) 입력
      typeKeys(editor, ['(', '1', '/', '2', '+', '3', ')']);

      const state = editor.getState();
      // 루트는 paren 하나
      expect(state.ast.children).toHaveLength(1);
      const paren = state.ast.children[0] as ParenNode;
      expect(paren.type).toBe('paren');

      const content = paren.content[0] as RowNode;
      // paren 안: [Frac(1/2), +, 3]
      expect(content.children).toHaveLength(3);
      expect((content.children[0] as FracNode).type).toBe('frac');
      expect((content.children[1] as OperatorNode).operator).toBe('+');
      expect((content.children[2] as NumberNode).value).toBe('3');
    });
  });
});
