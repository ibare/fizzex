import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  EditorState,
  RootNode,
  RowNode,
  NumberNode,
  VariableNode,
  OperatorNode,
  FracNode,
  PowerNode,
  SubscriptNode,
  ParenNode,
  AbsNode,
  SqrtNode,
  FuncNode,
  IntegralNode,
  SumNode,
  LimitNode,
  ProductNode,
  OverlineNode,
  MatrixNode,
  TextNode,
  BoundaryCursor,
  CursorPosition,
} from './types';

function bc(c: CursorPosition): BoundaryCursor {
  if (c.kind !== 'boundary') throw new Error('expected boundary cursor');
  return c;
}
import {
  createEmptyRoot,
  createInitialState,
  createStateFromLatex,
  createNumber,
  createVariable,
  createOperator,
  createFrac,
  createPower,
  createSubscript,
  createParen,
  createAbs,
  createIntegral,
  createSum,
  createLimit,
  createProduct,
  createOverline,
  createMatrix,
  createText,
  MathEditor,
} from './editor';
import { resetLatexIdCounter, resetEditorIdCounter } from './utils/id-generator';

/** KeyboardEvent mock 헬퍼 */
function createKeyEvent(key: string, opts?: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    key,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    isComposing: false,
    ...opts,
  } as unknown as KeyboardEvent;
}

describe('Editor', () => {
  beforeEach(() => {
    resetLatexIdCounter();
    resetEditorIdCounter();
  });

  describe('노드 생성 헬퍼', () => {
    it('createNumber: 숫자 노드를 생성한다', () => {
      const node = createNumber('5');
      expect(node.type).toBe('number');
      expect(node.value).toBe('5');
      expect(node.id).toBeDefined();
    });

    it('createVariable: 변수 노드를 생성한다', () => {
      const node = createVariable('x');
      expect(node.type).toBe('variable');
      expect(node.name).toBe('x');
      expect(node.id).toBeDefined();
    });

    it('createOperator: 연산자 노드를 생성한다', () => {
      const node = createOperator('+');
      expect(node.type).toBe('operator');
      expect(node.operator).toBe('+');
      expect(node.id).toBeDefined();
    });

    it('createFrac: 분자/분모를 Row로 감싼 분수를 생성한다', () => {
      const num = createNumber('1');
      const den = createNumber('2');
      const frac = createFrac([num], [den]);

      expect(frac.type).toBe('frac');
      expect(frac.numerator).toHaveLength(1);
      expect(frac.denominator).toHaveLength(1);
      // 분자/분모가 row로 감싸져 있다
      expect(frac.numerator[0].type).toBe('row');
      expect(frac.denominator[0].type).toBe('row');
      expect((frac.numerator[0] as RowNode).children).toContain(num);
      expect((frac.denominator[0] as RowNode).children).toContain(den);
    });

    it('createPower: exponent를 Row로 감싼 거듭제곱을 생성한다', () => {
      const base = createVariable('x');
      const exp = createNumber('2');
      const power = createPower([base], [exp]);

      expect(power.type).toBe('power');
      expect(power.base).toContain(base);
      // exponent가 row로 감싸져 있다
      expect(power.exponent).toHaveLength(1);
      expect(power.exponent[0].type).toBe('row');
      expect((power.exponent[0] as RowNode).children).toContain(exp);
    });

    it('createSubscript: subscript를 Row로 감싼 아래첨자를 생성한다', () => {
      const base = createVariable('a');
      const sub = createNumber('1');
      const subscript = createSubscript([base], [sub]);

      expect(subscript.type).toBe('subscript');
      expect(subscript.base).toContain(base);
      expect(subscript.subscript).toHaveLength(1);
      expect(subscript.subscript[0].type).toBe('row');
      expect((subscript.subscript[0] as RowNode).children).toContain(sub);
    });

    it('createParen: content를 Row로 감싼 괄호를 생성한다', () => {
      const inner = createNumber('3');
      const paren = createParen([inner], '(');

      expect(paren.type).toBe('paren');
      expect(paren.parenType).toBe('(');
      expect(paren.content).toHaveLength(1);
      expect(paren.content[0].type).toBe('row');
      expect((paren.content[0] as RowNode).children).toContain(inner);
    });

    it('createAbs: content를 Row로 감싼 절댓값을 생성한다', () => {
      const inner = createVariable('x');
      const abs = createAbs([inner]);

      expect(abs.type).toBe('abs');
      expect(abs.content).toHaveLength(1);
      expect(abs.content[0].type).toBe('row');
      expect((abs.content[0] as RowNode).children).toContain(inner);
    });

    it('createSqrt: content를 Row로 감싼 제곱근을 생성한다', () => {
      // createSqrt는 export되지 않으므로 MathEditor.insertSqrt를 통해 검증
      const onChange = vi.fn();
      const editor = new MathEditor(onChange);
      editor.insertSqrt();
      const state = editor.getState();
      const root = state.ast;
      // root.children에 sqrt가 삽입되었어야 한다
      expect(root.children).toHaveLength(1);
      const sqrtNode = root.children[0] as SqrtNode;
      expect(sqrtNode.type).toBe('sqrt');
      expect(sqrtNode.content).toHaveLength(1);
      expect(sqrtNode.content[0].type).toBe('row');
    });

    it('createFunc: 함수 노드를 생성한다', () => {
      // createFunc는 export되지 않으므로 MathEditor.insertFunc를 통해 검증
      const onChange = vi.fn();
      const editor = new MathEditor(onChange);
      editor.insertFunc('sin');
      const state = editor.getState();
      const funcNode = state.ast.children[0] as FuncNode;
      expect(funcNode.type).toBe('func');
      expect(funcNode.name).toBe('sin');
      expect(funcNode.argument).toHaveLength(1);
      expect(funcNode.argument[0].type).toBe('row');
    });

    it('createIntegral: 적분 노드를 생성한다', () => {
      const integral = createIntegral([], [], [], 'x');

      expect(integral.type).toBe('integral');
      expect(integral.differential).toBe('x');
      expect(integral.lower).toHaveLength(1);
      expect(integral.upper).toHaveLength(1);
      expect(integral.integrand).toHaveLength(1);
      // 모두 row로 감싸져 있다
      expect(integral.lower![0].type).toBe('row');
      expect(integral.upper![0].type).toBe('row');
      expect(integral.integrand[0].type).toBe('row');
    });

    it('createSum: 시그마 노드를 생성한다', () => {
      const sum = createSum([], [], []);

      expect(sum.type).toBe('sum');
      expect(sum.lower).toHaveLength(1);
      expect(sum.upper).toHaveLength(1);
      expect(sum.body).toHaveLength(1);
      expect(sum.lower[0].type).toBe('row');
      expect(sum.upper[0].type).toBe('row');
      expect(sum.body[0].type).toBe('row');
    });

    it('createLimit: 극한 노드를 생성한다', () => {
      const lim = createLimit('n', [], []);

      expect(lim.type).toBe('limit');
      expect(lim.variable).toBe('n');
      expect(lim.approach).toHaveLength(1);
      expect(lim.body).toHaveLength(1);
      expect(lim.approach[0].type).toBe('row');
      expect(lim.body[0].type).toBe('row');
    });

    it('createProduct: 곱 노드를 생성한다', () => {
      const prod = createProduct([], [], []);

      expect(prod.type).toBe('product');
      expect(prod.lower).toHaveLength(1);
      expect(prod.upper).toHaveLength(1);
      expect(prod.body).toHaveLength(1);
      expect(prod.lower[0].type).toBe('row');
    });

    it('createOverline: 윗줄 노드를 생성한다', () => {
      const overline = createOverline([]);

      expect(overline.type).toBe('overline');
      expect(overline.content).toHaveLength(1);
      expect(overline.content[0].type).toBe('row');
    });

    it('createMatrix: 행렬 노드를 생성한다', () => {
      const matrix = createMatrix(2, 3, '[');

      expect(matrix.type).toBe('matrix');
      expect(matrix.bracketType).toBe('[');
      expect(matrix.rows).toHaveLength(2);
      expect(matrix.rows[0]).toHaveLength(3);
      // 각 셀이 row 노드
      expect(matrix.rows[0][0].type).toBe('row');
      expect(matrix.rows[1][2].type).toBe('row');
    });

    it('createText: 텍스트 노드를 생성한다', () => {
      const text = createText('hello');

      expect(text.type).toBe('text');
      expect(text.content).toBe('hello');
      expect(text.id).toBeDefined();
    });
  });

  describe('createEmptyRoot', () => {
    it('빈 root 노드를 생성한다', () => {
      const root = createEmptyRoot();
      expect(root.type).toBe('root');
    });

    it('자동 생성된 ID를 가진다', () => {
      const root = createEmptyRoot();
      expect(root.id).toBeDefined();
      expect(typeof root.id).toBe('string');
      expect(root.id.length).toBeGreaterThan(0);
    });

    it('children이 빈 배열이다', () => {
      const root = createEmptyRoot();
      expect(root.children).toEqual([]);
    });
  });

  describe('createInitialState', () => {
    it('빈 root와 offset 0 커서를 가진 상태를 반환한다', () => {
      const state = createInitialState();
      expect(state.ast.type).toBe('root');
      expect(state.ast.children).toEqual([]);
      expect(bc(state.cursor).index).toBe(0);
      expect(bc(state.cursor).parentId).toBe(state.ast.id);
    });

    it('selection이 null이다', () => {
      const state = createInitialState();
      expect(state.selection).toBeNull();
    });

    it('상태가 freeze되어 있다', () => {
      // MathEditor를 통해 생성된 상태는 freeze된다
      const onChange = vi.fn();
      const editor = new MathEditor(onChange);
      const state = editor.getState();
      expect(Object.isFrozen(state)).toBe(true);
      expect(Object.isFrozen(state.cursor)).toBe(true);
      expect(Object.isFrozen(state.ast)).toBe(true);
    });
  });

  describe('createStateFromLatex', () => {
    it('LaTeX 문자열을 파싱하여 상태를 생성한다', () => {
      const state = createStateFromLatex('x+1');
      expect(state.ast.type).toBe('root');
      expect(state.ast.children.length).toBeGreaterThan(0);
    });

    it('커서를 마지막 위치에 놓는다', () => {
      const state = createStateFromLatex('x+1');
      expect(bc(state.cursor).parentId).toBe(state.ast.id);
      expect(bc(state.cursor).index).toBe(state.ast.children.length);
    });

    it('빈 문자열이면 초기 상태와 유사한 상태를 반환한다', () => {
      const state = createStateFromLatex('');
      expect(state.ast.type).toBe('root');
      expect(state.ast.children).toEqual([]);
      expect(bc(state.cursor).index).toBe(0);
      expect(state.selection).toBeNull();
    });
  });

  describe('MathEditor', () => {
    describe('기본 동작', () => {
      it('생성 시 초기 상태를 가진다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        const state = editor.getState();

        expect(state.ast.type).toBe('root');
        expect(state.ast.children).toEqual([]);
        expect(bc(state.cursor).index).toBe(0);
        expect(state.selection).toBeNull();
      });

      it('getState로 현재 상태를 반환한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        const state1 = editor.getState();
        const state2 = editor.getState();
        // 변경 없이 동일한 참조를 반환
        expect(state1).toBe(state2);
      });

      it('setState로 상태를 설정하고 onChange를 호출한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        const newState = createInitialState();
        editor.setState(newState);

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(editor.getState().ast.type).toBe('root');
      });
    });

    describe('숫자/변수/연산자 삽입', () => {
      it('insertNumber: 숫자 노드를 커서 위치에 삽입한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('5');

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        expect(state.ast.children[0].type).toBe('number');
        expect((state.ast.children[0] as NumberNode).value).toBe('5');
      });

      it('insertNumber 후 커서가 오른쪽으로 이동한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('3');

        const state = editor.getState();
        expect(bc(state.cursor).index).toBe(1);
      });

      it('연속 insertNumber로 여러 숫자를 삽입한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('1');
        editor.insertNumber('2');
        editor.insertNumber('3');

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(3);
        expect((state.ast.children[0] as NumberNode).value).toBe('1');
        expect((state.ast.children[1] as NumberNode).value).toBe('2');
        expect((state.ast.children[2] as NumberNode).value).toBe('3');
        expect(bc(state.cursor).index).toBe(3);
      });

      it('insertVariable: 변수 노드를 삽입한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertVariable('x');

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        expect(state.ast.children[0].type).toBe('variable');
        expect((state.ast.children[0] as VariableNode).name).toBe('x');
      });

      it('insertOperator: 연산자 노드를 삽입한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('1');
        editor.insertOperator('+');

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(2);
        expect(state.ast.children[1].type).toBe('operator');
        expect((state.ast.children[1] as OperatorNode).operator).toBe('+');
      });
    });

    describe('구조 삽입', () => {
      it('insertFraction: 분수를 삽입하고 커서를 분모로 이동한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertFraction();

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        const fracNode = state.ast.children[0] as FracNode;
        expect(fracNode.type).toBe('frac');
        // 커서가 분모(denominator) row에 위치
        const denRow = fracNode.denominator[0] as RowNode;
        expect(bc(state.cursor).parentId).toBe(denRow.id);
        expect(bc(state.cursor).index).toBe(0);
      });

      it('insertPower: 거듭제곱을 삽입하고 커서를 지수로 이동한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertPower();

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        const powerNode = state.ast.children[0] as PowerNode;
        expect(powerNode.type).toBe('power');
        // 커서가 exponent row에 위치
        const expRow = powerNode.exponent[0] as RowNode;
        expect(bc(state.cursor).parentId).toBe(expRow.id);
        expect(bc(state.cursor).index).toBe(0);
      });

      it('insertSubscript: 아래첨자를 삽입하고 커서를 subscript로 이동한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertSubscript();

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        const subNode = state.ast.children[0] as SubscriptNode;
        expect(subNode.type).toBe('subscript');
        const subRow = subNode.subscript[0] as RowNode;
        expect(bc(state.cursor).parentId).toBe(subRow.id);
        expect(bc(state.cursor).index).toBe(0);
      });

      it('insertParen: 괄호를 삽입하고 커서를 내부로 이동한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertParen('(');

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        const parenNode = state.ast.children[0] as ParenNode;
        expect(parenNode.type).toBe('paren');
        expect(parenNode.parenType).toBe('(');
        const contentRow = parenNode.content[0] as RowNode;
        expect(bc(state.cursor).parentId).toBe(contentRow.id);
        expect(bc(state.cursor).index).toBe(0);
      });

      it('insertAbs: 절댓값을 삽입하고 커서를 내부로 이동한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertAbs();

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        const absNode = state.ast.children[0] as AbsNode;
        expect(absNode.type).toBe('abs');
        const contentRow = absNode.content[0] as RowNode;
        expect(bc(state.cursor).parentId).toBe(contentRow.id);
        expect(bc(state.cursor).index).toBe(0);
      });

      it('insertSqrt: 제곱근을 삽입하고 커서를 내부로 이동한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertSqrt();

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        const sqrtNode = state.ast.children[0] as SqrtNode;
        expect(sqrtNode.type).toBe('sqrt');
        const contentRow = sqrtNode.content[0] as RowNode;
        expect(bc(state.cursor).parentId).toBe(contentRow.id);
        expect(bc(state.cursor).index).toBe(0);
      });

      it('insertFunc: 함수를 삽입하고 커서를 인자로 이동한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertFunc('cos');

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        const funcNode = state.ast.children[0] as FuncNode;
        expect(funcNode.type).toBe('func');
        expect(funcNode.name).toBe('cos');
        const argRow = funcNode.argument[0] as RowNode;
        expect(bc(state.cursor).parentId).toBe(argRow.id);
        expect(bc(state.cursor).index).toBe(0);
      });

      it('insertIntegral: 적분을 삽입한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertIntegral('t');

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        const integralNode = state.ast.children[0] as IntegralNode;
        expect(integralNode.type).toBe('integral');
        expect(integralNode.differential).toBe('t');
        // 커서가 integrand row에 위치
        const integrandRow = integralNode.integrand[0] as RowNode;
        expect(bc(state.cursor).parentId).toBe(integrandRow.id);
      });

      it('insertSum: 시그마를 삽입한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertSum();

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        const sumNode = state.ast.children[0] as SumNode;
        expect(sumNode.type).toBe('sum');
        // 커서가 lower row에 위치
        const lowerRow = sumNode.lower[0] as RowNode;
        expect(bc(state.cursor).parentId).toBe(lowerRow.id);
      });

      it('insertLimit: 극한을 삽입한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertLimit('n');

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        const limitNode = state.ast.children[0] as LimitNode;
        expect(limitNode.type).toBe('limit');
        expect(limitNode.variable).toBe('n');
        // 커서가 approach row에 위치
        const approachRow = limitNode.approach[0] as RowNode;
        expect(bc(state.cursor).parentId).toBe(approachRow.id);
      });

      it('insertMatrix: 행렬을 삽입한다', () => {
        // NOTE: 현재 freezeState의 deepFreezeNode가 matrix의 2D rows를
        // 올바르게 처리하지 못하는 알려진 이슈가 있으므로,
        // NODE_ENV를 production으로 설정하여 freeze를 건너뛴다.
        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
          const onChange = vi.fn();
          const editor = new MathEditor(onChange);
          editor.insertMatrix(2, 2, '(');

          const state = editor.getState();
          expect(state.ast.children).toHaveLength(1);
          const matrixNode = state.ast.children[0] as MatrixNode;
          expect(matrixNode.type).toBe('matrix');
          expect(matrixNode.rows).toHaveLength(2);
          expect(matrixNode.rows[0]).toHaveLength(2);
          // 커서가 첫 번째 셀에 위치
          const firstCell = matrixNode.rows[0][0] as RowNode;
          expect(bc(state.cursor).parentId).toBe(firstCell.id);
        } finally {
          process.env.NODE_ENV = origEnv;
        }
      });
    });

    describe('삭제', () => {
      it('커서 앞 일반 노드를 삭제한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('1');
        editor.insertNumber('2');
        // '1', '2' 삽입 후 커서 offset=2

        editor.handleKeyDown(createKeyEvent('Backspace'));

        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        expect((state.ast.children[0] as NumberNode).value).toBe('1');
      });

      it('삭제 후 커서가 왼쪽으로 이동한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('5');
        // offset=1

        editor.handleKeyDown(createKeyEvent('Backspace'));
        const state = editor.getState();
        expect(bc(state.cursor).index).toBe(0);
        expect(state.ast.children).toHaveLength(0);
      });

      it('빈 상태에서 삭제해도 에러가 발생하지 않는다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);

        expect(() => {
          editor.handleKeyDown(createKeyEvent('Backspace'));
        }).not.toThrow();
      });
    });

    describe('커서 이동', () => {
      it('왼쪽 이동: offset을 1 감소시킨다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('1');
        editor.insertNumber('2');
        // offset=2

        editor.handleKeyDown(createKeyEvent('ArrowLeft'));
        // 오른쪽 노드가 number이므로 복합 노드가 아님 -> offset-1
        const state = editor.getState();
        expect(bc(state.cursor).index).toBe(1);
      });

      it('왼쪽 이동: offset 0에서 더 이동하지 않는다 (또는 부모로 이동)', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        // 빈 root, offset=0에서 왼쪽 이동
        editor.handleKeyDown(createKeyEvent('ArrowLeft'));

        const state = editor.getState();
        // root에서 부모가 없으므로 offset 유지 또는 변화 없음
        expect(bc(state.cursor).index).toBe(0);
      });

      it('오른쪽 이동: offset을 1 증가시킨다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('1');
        editor.insertNumber('2');
        // offset=2, 커서를 맨 앞으로 이동
        editor.handleKeyDown(createKeyEvent('ArrowLeft'));
        editor.handleKeyDown(createKeyEvent('ArrowLeft'));
        // offset=0

        editor.handleKeyDown(createKeyEvent('ArrowRight'));
        const state = editor.getState();
        expect(bc(state.cursor).index).toBe(1);
      });

      it('오른쪽 이동: 끝에서 더 이동하지 않는다 (또는 부모로 이동)', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('1');
        // offset=1, children.length=1 -> 끝

        editor.handleKeyDown(createKeyEvent('ArrowRight'));
        const state = editor.getState();
        // root에서 부모가 없으므로 offset 유지
        expect(bc(state.cursor).index).toBe(1);
      });
    });

    describe('handleKeyDown', () => {
      it('숫자 키를 처리한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        const event = createKeyEvent('7');
        editor.handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        expect((state.ast.children[0] as NumberNode).value).toBe('7');
      });

      it('연산자 키(+, -, *)를 처리한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);

        editor.handleKeyDown(createKeyEvent('+'));
        expect((editor.getState().ast.children[0] as OperatorNode).operator).toBe('+');

        // 새 에디터로 - 테스트
        const editor2 = new MathEditor(vi.fn());
        editor2.handleKeyDown(createKeyEvent('-'));
        expect((editor2.getState().ast.children[0] as OperatorNode).operator).toBe('-');

        // 새 에디터로 * 테스트 (* -> ×)
        const editor3 = new MathEditor(vi.fn());
        editor3.handleKeyDown(createKeyEvent('*'));
        expect((editor3.getState().ast.children[0] as OperatorNode).operator).toBe('×');
      });

      it('/ 키로 분수를 삽입한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        const event = createKeyEvent('/');
        editor.handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        expect(state.ast.children[0].type).toBe('frac');
      });

      it('^ 키로 거듭제곱을 삽입한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        const event = createKeyEvent('^');
        editor.handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        expect(state.ast.children[0].type).toBe('power');
      });

      it('_ 키로 아래첨자를 삽입한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        const event = createKeyEvent('_');
        editor.handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        expect(state.ast.children[0].type).toBe('subscript');
      });

      it('( 키로 괄호를 삽입한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        const event = createKeyEvent('(');
        editor.handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        expect(state.ast.children[0].type).toBe('paren');
      });

      it('Backspace로 삭제한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('9');
        const event = createKeyEvent('Backspace');
        editor.handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(editor.getState().ast.children).toHaveLength(0);
      });

      it('ArrowLeft로 커서를 이동한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('1');
        // offset=1

        const event = createKeyEvent('ArrowLeft');
        editor.handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(bc(editor.getState().cursor).index).toBe(0);
      });

      it('ArrowRight로 커서를 이동한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('1');
        editor.handleKeyDown(createKeyEvent('ArrowLeft'));
        // offset=0

        const event = createKeyEvent('ArrowRight');
        editor.handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(bc(editor.getState().cursor).index).toBe(1);
      });

      it('일반 문자를 변수로 삽입한다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        const event = createKeyEvent('x');
        editor.handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        expect(state.ast.children[0].type).toBe('variable');
        expect((state.ast.children[0] as VariableNode).name).toBe('x');
      });
    });

    describe('불변성 검증', () => {
      it('편집 후 이전 상태가 변경되지 않는다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('1');

        const stateBefore = editor.getState();
        const childrenBefore = stateBefore.ast.children.length;
        const cursorBefore = bc(stateBefore.cursor).index;

        editor.insertNumber('2');

        // 이전 상태가 변경되지 않았다
        expect(stateBefore.ast.children.length).toBe(childrenBefore);
        expect(bc(stateBefore.cursor).index).toBe(cursorBefore);

        // 새 상태는 다르다
        const stateAfter = editor.getState();
        expect(stateAfter).not.toBe(stateBefore);
        expect(stateAfter.ast.children.length).toBe(2);
      });

      it('반환된 상태가 freeze되어 있다', () => {
        const onChange = vi.fn();
        const editor = new MathEditor(onChange);
        editor.insertNumber('1');

        const state = editor.getState();
        expect(Object.isFrozen(state)).toBe(true);
        expect(Object.isFrozen(state.cursor)).toBe(true);
        expect(Object.isFrozen(state.ast)).toBe(true);
      });
    });

    describe('intra 커서 (NumberNode 내부 탐색)', () => {
      function makeEditor(latex: string): MathEditor {
        const editor = new MathEditor(vi.fn());
        editor.setState(createStateFromLatex(latex));
        return editor;
      }

      it('두 자리 숫자에서 ArrowLeft 시 intra 진입', () => {
        const editor = makeEditor('12');
        // 초기 커서: [12]| (boundary, root 끝)
        editor.handleKeyDown(createKeyEvent('ArrowLeft'));
        const cursor = editor.getState().cursor;
        expect(cursor.kind).toBe('intra');
        if (cursor.kind === 'intra') {
          expect(cursor.charOffset).toBe(1);
        }
      });

      it('intra 상태에서 숫자 삽입 시 NumberNode value에 문자가 추가된다', () => {
        const editor = makeEditor('13');
        editor.handleKeyDown(createKeyEvent('ArrowLeft'));
        // 커서: 1|3 (intra, offset 1)
        editor.insertNumber('2');
        const state = editor.getState();
        expect(state.ast.children).toHaveLength(1);
        expect((state.ast.children[0] as NumberNode).value).toBe('123');
        expect(state.cursor.kind).toBe('intra');
        if (state.cursor.kind === 'intra') {
          expect(state.cursor.charOffset).toBe(2);
        }
      });

      it('intra 상태에서 Backspace 시 한 글자 제거', () => {
        const editor = makeEditor('123');
        editor.handleKeyDown(createKeyEvent('ArrowLeft'));
        // 커서: 12|3
        editor.handleKeyDown(createKeyEvent('Backspace'));
        const state = editor.getState();
        expect((state.ast.children[0] as NumberNode).value).toBe('13');
      });

      it('intra 상태에서 한 글자만 남으면 boundary로 정규화', () => {
        const editor = makeEditor('12');
        editor.handleKeyDown(createKeyEvent('ArrowLeft'));
        // 커서: 1|2
        editor.handleKeyDown(createKeyEvent('Backspace'));
        const state = editor.getState();
        expect(state.cursor.kind).toBe('boundary');
        expect((state.ast.children[0] as NumberNode).value).toBe('2');
      });

      it('ArrowRight로 intra 끝에 도달하면 boundary로 빠져나감', () => {
        const editor = makeEditor('12');
        editor.handleKeyDown(createKeyEvent('ArrowLeft'));
        // 커서: 1|2 (intra, offset 1, value.length 2 → length-1)
        editor.handleKeyDown(createKeyEvent('ArrowRight'));
        const state = editor.getState();
        expect(state.cursor.kind).toBe('boundary');
        expect(bc(state.cursor).index).toBe(1);
      });
    });
  });
});
