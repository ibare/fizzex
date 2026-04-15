/**
 * Fizzex 데모 페이지
 *
 * 지원하는 모든 수식 표현을 보여주는 종합 데모
 */

import { useState, useMemo, useCallback } from 'react';
import { EditorView } from 'fizzex/react';
import {
  createEmptyRoot,
  createNumber,
  createVariable,
  createOperator,
  createFrac,
  createPower,
  createParen,
  createSubscript,
  createAbs,
  createIntegral,
  createSum,
  createLimit,
  createProduct,
  createOverline,
  createMatrix,
  createText,
  parseLatex,
  astToLatex,
  analyzeExpression,
  FizzexI18nProvider,
  // CAS 함수
  simplify,
  expand,
  factor,
  solve,
  diff,
  integrate,
  // 시각화
  FunctionGraph,
  UnitCircle,
  NumberLine,
  PolarGraph,
  AutoVisualizer,
  canGraph,
  type PartialFizzexLabels,
  type ExpressionAnalysis,
  type CASResult,
} from 'fizzex';
import type { EditorState, RootNode, MathNode, RowNode } from 'fizzex';

/** 한국어 라벨 */
const koLabels: PartialFizzexLabels = {
  placeholder: '수식을 입력하세요...',
  debugToggle: '디버그 모드 토글',
  structureViewer: '수식 구조 보기',
  showMore: '더보기...',
  showLess: '접기',
  showAll: '모든 수식',
  keyboard: {
    move: '↑↓ 이동',
    select: 'Enter 선택',
    close: 'Esc 닫기',
  },
  categories: {
    operator: '연산자',
    structure: '구조',
    function: '함수',
    symbol: '기호',
    calculus: '미적분',
  },
  suggestions: {
    // 미적분
    integral: { label: '적분', description: '정적분/부정적분' },
    sum: { label: '시그마', description: '합계' },
    product: { label: '곱', description: '곱셈 기호' },
    limit: { label: '극한', description: '극한값' },
    // 구조
    sqrt: { label: '제곱근', description: '루트' },
    frac: { label: '분수', description: '분수 형태로 입력' },
    power: { label: '거듭제곱', description: '위 첨자 (지수)' },
    subscript: { label: '아래첨자', description: '아래 첨자 (인덱스)' },
    paren_round: { label: '괄호' },
    paren_square: { label: '대괄호' },
    abs: { label: '절댓값' },
    // 기호
    pi: { label: '파이' },
    infinity: { label: '무한대' },
    alpha: { label: '알파' },
    beta: { label: '베타' },
    theta: { label: '세타' },
    delta: { label: '델타' },
    lambda: { label: '람다' },
    mu: { label: '뮤' },
    epsilon: { label: '엡실론' },
    gamma: { label: '감마' },
    omega: { label: '오메가' },
    phi: { label: '파이(대)' },
    psi: { label: '프사이' },
    xi: { label: '크시' },
    nabla: { label: '나블라', description: '그래디언트' },
    partial: { label: '편미분' },
    transpose: { label: '전치' },
    cdot: { label: '점곱' },
    parallel: { label: '평행', description: '평행/노름' },
    factorial: { label: '팩토리얼', description: 'n!' },
    // mathbb 집합
    natural: { label: '자연수', description: '자연수 집합' },
    integer: { label: '정수', description: '정수 집합' },
    rational: { label: '유리수', description: '유리수 집합' },
    real: { label: '실수', description: '실수 집합' },
    complex: { label: '복소수', description: '복소수 집합' },
    // mathcal 스크립트
    fourier: { label: '푸리에', description: '푸리에 변환' },
    laplace: { label: '라플라스', description: '라플라스 변환' },
    hilbert: { label: '힐베르트', description: '힐베르트 공간' },
    // 함수
    sin: { label: 'sin' },
    cos: { label: 'cos' },
    tan: { label: 'tan' },
    log: { label: 'log' },
    ln: { label: 'ln' },
    det: { label: 'det', description: '행렬식' },
    tr: { label: 'tr', description: '트레이스' },
    // 연산자
    leq: { label: '이하' },
    geq: { label: '이상' },
    add: { label: '덧셈' },
    subtract: { label: '뺄셈' },
    multiply: { label: '곱셈' },
    divide_op: { label: '나눗셈' },
    equals: { label: '등호' },
    less_than: { label: '미만' },
    greater_than: { label: '초과' },
  },
};

/** 예시 수식 생성 헬퍼 */
function createExampleState(children: MathNode[]): EditorState {
  const root: RootNode = {
    id: 'example_root',
    type: 'root',
    children,
  };
  return {
    ast: root,
    cursor: { nodeId: root.id, offset: children.length },
    selection: null,
  };
}

// ==================== 기본 수식 ====================

/** y = x² + 2x + 1 */
function createQuadraticExample(): EditorState {
  return createExampleState([
    createVariable('y'),
    createOperator('='),
    createPower([createVariable('x')], [createNumber('2')]),
    createOperator('+'),
    createNumber('2'),
    createVariable('x'),
    createOperator('+'),
    createNumber('1'),
  ]);
}

/** 1/2 + 1/3 = 5/6 */
function createFractionExample(): EditorState {
  return createExampleState([
    createFrac([createNumber('1')], [createNumber('2')]),
    createOperator('+'),
    createFrac([createNumber('1')], [createNumber('3')]),
    createOperator('='),
    createFrac([createNumber('5')], [createNumber('6')]),
  ]);
}

/** (a + b)² = a² + 2ab + b² */
function createBinomialExample(): EditorState {
  return createExampleState([
    createPower(
      [createParen([
        createVariable('a'),
        createOperator('+'),
        createVariable('b'),
      ])],
      [createNumber('2')]
    ),
    createOperator('='),
    createPower([createVariable('a')], [createNumber('2')]),
    createOperator('+'),
    createNumber('2'),
    createVariable('a'),
    createVariable('b'),
    createOperator('+'),
    createPower([createVariable('b')], [createNumber('2')]),
  ]);
}

/** E = mc² */
function createEinsteinExample(): EditorState {
  return createExampleState([
    createVariable('E'),
    createOperator('='),
    createVariable('m'),
    createPower([createVariable('c')], [createNumber('2')]),
  ]);
}

/** a² + b² = c² (피타고라스) */
function createPythagorasExample(): EditorState {
  return createExampleState([
    createPower([createVariable('a')], [createNumber('2')]),
    createOperator('+'),
    createPower([createVariable('b')], [createNumber('2')]),
    createOperator('='),
    createPower([createVariable('c')], [createNumber('2')]),
  ]);
}

// ==================== Phase 1: 아래첨자, 절댓값, 부등호 ====================

/** aₙ = aₙ₋₁ + d (등차수열) */
function createSubscriptExample(): EditorState {
  return createExampleState([
    createSubscript([createVariable('a')], [createVariable('n')]),
    createOperator('='),
    createSubscript([createVariable('a')], [
      createVariable('n'),
      createOperator('-'),
      createNumber('1'),
    ]),
    createOperator('+'),
    createVariable('d'),
  ]);
}

/** |x - 3| < 5 */
function createAbsExample(): EditorState {
  return createExampleState([
    createAbs([
      createVariable('x'),
      createOperator('-'),
      createNumber('3'),
    ]),
    createOperator('<'),
    createNumber('5'),
  ]);
}

/** x² + y² ≤ r² */
function createInequalityExample(): EditorState {
  return createExampleState([
    createPower([createVariable('x')], [createNumber('2')]),
    createOperator('+'),
    createPower([createVariable('y')], [createNumber('2')]),
    createOperator('≤'),
    createPower([createVariable('r')], [createNumber('2')]),
  ]);
}

// ==================== Phase 2: 적분, 시그마, 극한 ====================

/** ∫₀¹ x² dx */
function createIntegralExample(): EditorState {
  return createExampleState([
    createIntegral(
      [createNumber('0')],
      [createNumber('1')],
      [createPower([createVariable('x')], [createNumber('2')])],
      'x'
    ),
  ]);
}

/** Σᵢ₌₁ⁿ i = n(n+1)/2 */
function createSumExample(): EditorState {
  return createExampleState([
    createSum(
      [createVariable('i'), createOperator('='), createNumber('1')],
      [createVariable('n')],
      [createVariable('i')]
    ),
    createOperator('='),
    createFrac(
      [
        createVariable('n'),
        createParen([
          createVariable('n'),
          createOperator('+'),
          createNumber('1'),
        ]),
      ],
      [createNumber('2')]
    ),
  ]);
}

/** lim(x→∞) 1/x = 0 */
function createLimitExample(): EditorState {
  return createExampleState([
    createLimit(
      'x',
      [createVariable('∞')],
      [createFrac([createNumber('1')], [createVariable('x')])]
    ),
    createOperator('='),
    createNumber('0'),
  ]);
}

// ==================== Phase 3: 곱, 윗줄, 행렬, 텍스트 ====================

/** ∏ᵢ₌₁ⁿ i = n! */
function createProductExample(): EditorState {
  return createExampleState([
    createProduct(
      [createVariable('i'), createOperator('='), createNumber('1')],
      [createVariable('n')],
      [createVariable('i')]
    ),
    createOperator('='),
    createVariable('n'),
    createVariable('!'),
  ]);
}

/** x̄ = (x₁ + x₂ + ... + xₙ) / n */
function createOverlineExample(): EditorState {
  return createExampleState([
    createOverline([createVariable('x')]),
    createOperator('='),
    createFrac(
      [
        createSubscript([createVariable('x')], [createNumber('1')]),
        createOperator('+'),
        createSubscript([createVariable('x')], [createNumber('2')]),
        createOperator('+'),
        createVariable('·'),
        createVariable('·'),
        createVariable('·'),
        createOperator('+'),
        createSubscript([createVariable('x')], [createVariable('n')]),
      ],
      [createVariable('n')]
    ),
  ]);
}

/** 2x2 행렬 */
function createMatrixExample(): EditorState {
  const matrix = createMatrix(2, 2, '(');
  // 행렬 값 채우기
  const rows = matrix.rows as RowNode[][];
  (rows[0][0] as RowNode).children = [createVariable('a'), createVariable('b')];
  (rows[0][1] as RowNode).children = [createVariable('c'), createVariable('d')];
  (rows[1][0] as RowNode).children = [createVariable('e'), createVariable('f')];
  (rows[1][1] as RowNode).children = [createVariable('g'), createVariable('h')];

  return createExampleState([matrix]);
}

/** 텍스트가 포함된 수식 */
function createTextExample(): EditorState {
  return createExampleState([
    createVariable('v'),
    createOperator('='),
    createFrac(
      [createVariable('d')],
      [createVariable('t')]
    ),
    createText(' (속력 = 거리 / 시간)'),
  ]);
}

// ==================== Phase 4: LaTeX 환경 (align, cases, gather, array, Vmatrix) ====================

/** align 환경 - 정렬된 여러 줄 수식 */
function createAlignExample(): EditorState {
  const ast = parseLatex('\\begin{align}x + y &= 5 \\\\2x - y &= 1\\end{align}');
  return {
    ast,
    cursor: { nodeId: ast.id, offset: ast.children.length },
    selection: null,
  };
}

/** align* 환경 - 번호 없는 정렬 */
function createAlignStarExample(): EditorState {
  const ast = parseLatex('\\begin{align*}a^2 + b^2 &= c^2 \\\\a &= 3 \\\\b &= 4\\end{align*}');
  return {
    ast,
    cursor: { nodeId: ast.id, offset: ast.children.length },
    selection: null,
  };
}

/** cases 환경 - 조건부 함수 */
function createCasesExample(): EditorState {
  const ast = parseLatex('f(x) = \\begin{cases}x^2 & x \\geq 0 \\\\-x & x < 0\\end{cases}');
  return {
    ast,
    cursor: { nodeId: ast.id, offset: ast.children.length },
    selection: null,
  };
}

/** 절댓값 함수 cases */
function createAbsCasesExample(): EditorState {
  const ast = parseLatex('|x| = \\begin{cases}x & x \\geq 0 \\\\-x & x < 0\\end{cases}');
  return {
    ast,
    cursor: { nodeId: ast.id, offset: ast.children.length },
    selection: null,
  };
}

/** gather 환경 - 중앙 정렬 여러 줄 */
function createGatherExample(): EditorState {
  const ast = parseLatex('\\begin{gather}a + b = c \\\\x^2 + y^2 = r^2 \\\\E = mc^2\\end{gather}');
  return {
    ast,
    cursor: { nodeId: ast.id, offset: ast.children.length },
    selection: null,
  };
}

/** array 환경 - 정렬 지정 테이블 */
function createArrayExample(): EditorState {
  const ast = parseLatex('\\begin{array}{lcr}a & b & c \\\\d & e & f\\end{array}');
  return {
    ast,
    cursor: { nodeId: ast.id, offset: ast.children.length },
    selection: null,
  };
}

/** Vmatrix - 이중 세로줄 행렬 (행렬식) */
function createVmatrixExample(): EditorState {
  const ast = parseLatex('\\begin{Vmatrix}a & b \\\\c & d\\end{Vmatrix} = ad - bc');
  return {
    ast,
    cursor: { nodeId: ast.id, offset: ast.children.length },
    selection: null,
  };
}

/** vmatrix - 단일 세로줄 행렬 */
function createvmatrixExample(): EditorState {
  const ast = parseLatex('\\det(A) = \\begin{vmatrix}1 & 2 \\\\3 & 4\\end{vmatrix}');
  return {
    ast,
    cursor: { nodeId: ast.id, offset: ast.children.length },
    selection: null,
  };
}

// ==================== 복합 예시 ====================

/** 이차방정식 근의 공식 */
function createQuadraticFormulaExample(): EditorState {
  return createExampleState([
    createVariable('x'),
    createOperator('='),
    createFrac(
      [
        createOperator('-'),
        createVariable('b'),
        createOperator('±'),
        createPower(
          [createParen([
            createPower([createVariable('b')], [createNumber('2')]),
            createOperator('-'),
            createNumber('4'),
            createVariable('a'),
            createVariable('c'),
          ])],
          [createFrac([createNumber('1')], [createNumber('2')])]
        ),
      ],
      [
        createNumber('2'),
        createVariable('a'),
      ]
    ),
  ]);
}

/** 오일러 공식 */
function createEulerFormulaExample(): EditorState {
  return createExampleState([
    createPower([createVariable('e')], [
      createVariable('i'),
      createVariable('π'),
    ]),
    createOperator('+'),
    createNumber('1'),
    createOperator('='),
    createNumber('0'),
  ]);
}

/** 테일러 전개 */
function createTaylorExample(): EditorState {
  return createExampleState([
    createPower([createVariable('e')], [createVariable('x')]),
    createOperator('='),
    createSum(
      [createVariable('n'), createOperator('='), createNumber('0')],
      [createVariable('∞')],
      [createFrac(
        [createPower([createVariable('x')], [createVariable('n')])],
        [createVariable('n'), createVariable('!')]
      )]
    ),
  ]);
}

type Language = 'en' | 'ko';

export default function App() {
  const [state, setState] = useState<EditorState | null>(null);
  const [analysis, setAnalysis] = useState<ExpressionAnalysis | null>(null);
  const [latexInput, setLatexInput] = useState('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  const [latexState, setLatexState] = useState<EditorState | null>(null);
  const [latexAnalysis, setLatexAnalysis] = useState<ExpressionAnalysis | null>(null);
  const [language, setLanguage] = useState<Language>('en');

  // CAS 관련 state
  const [casKey, setCasKey] = useState(0); // EditorView 리셋용 키
  const [casInitialState, setCasInitialState] = useState<EditorState | undefined>(undefined);
  const [casLatex, setCasLatex] = useState('');
  const [casAnalysis, setCasAnalysis] = useState<ExpressionAnalysis | null>(null);
  const [casResult, setCasResult] = useState<CASResult | null>(null);
  const [casLoading, setCasLoading] = useState(false);

  // 인터랙티브 시각화 state
  const [coefficientValues, setCoefficientValues] = useState<Record<string, number>>({});
  const [showCasGraph, setShowCasGraph] = useState(true);


  // 적용 가능한 CAS 연산 판단
  const applicableOperations = useMemo(() => {
    if (!casAnalysis || !casLatex) return [];

    const ops: Array<{
      id: 'simplify' | 'expand' | 'factor' | 'solve' | 'diff' | 'integrate';
      label: string;
      color: string;
      description: string;
    }> = [];

    const { form, features, polynomial, variables } = casAnalysis;

    // 방정식이면 풀이 추천
    if (form === 'equation') {
      ops.push({
        id: 'solve',
        label: '풀이',
        color: 'orange',
        description: '방정식의 해 구하기',
      });
    }

    // 변수가 있으면 미분/적분 가능
    if (variables.length > 0) {
      ops.push({
        id: 'diff',
        label: '미분',
        color: 'red',
        description: `${variables[0]}에 대해 미분`,
      });
      ops.push({
        id: 'integrate',
        label: '적분',
        color: 'indigo',
        description: `${variables[0]}에 대해 적분`,
      });
    }

    // 거듭제곱이 있으면 전개 가능성
    if (features.includes('has-power') || casLatex.includes('^')) {
      ops.push({
        id: 'expand',
        label: '전개',
        color: 'green',
        description: '괄호 전개',
      });
    }

    // 다항식이면 인수분해 가능성
    if (polynomial && polynomial.degree >= 2) {
      ops.push({
        id: 'factor',
        label: '인수분해',
        color: 'purple',
        description: '인수분해',
      });
    }

    // 분수가 있으면 단순화 추천
    if (features.includes('has-fraction') || casLatex.includes('frac')) {
      ops.push({
        id: 'simplify',
        label: '단순화',
        color: 'blue',
        description: '분수 약분/단순화',
      });
    }

    // 복잡도가 높으면 단순화 추천
    if (casAnalysis.complexity >= 3 && !ops.some(o => o.id === 'simplify')) {
      ops.push({
        id: 'simplify',
        label: '단순화',
        color: 'blue',
        description: '식 정리',
      });
    }

    return ops;
  }, [casAnalysis, casLatex]);

  // 계수 목록 (분석에서 추출)
  const coefficients = useMemo(() => {
    if (!casAnalysis?.variableClassification) return [];
    return casAnalysis.variableClassification.coefficients;
  }, [casAnalysis]);

  // 주변수 (그래프 x축)
  const mainVariable = useMemo(() => {
    if (!casAnalysis?.variableClassification) return 'x';
    const mainVars = casAnalysis.variableClassification.mainVariables;
    return mainVars.length > 0 ? mainVars[0] : 'x';
  }, [casAnalysis]);

  // 계수 기본값 초기화는 loadCasExample에서 처리

  // 계수를 치환한 수식 (그래프용)
  const substitutedExpression = useMemo(() => {
    if (!casLatex || coefficients.length === 0) return casLatex;

    let expr = casLatex;
    // 계수를 실제 값으로 치환
    // 앞에 알파벳이 없고, 뒤에 주변수가 오거나 알파벳이 아닌 경우 매칭
    const mainVarEscaped = mainVariable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    coefficients.forEach((coef) => {
      const value = coefficientValues[coef] ?? 1;
      // 계수 뒤에 주변수가 오거나, 알파벳이 아닌 문자가 오거나, 끝인 경우
      const regex = new RegExp(
        `(?<![a-zA-Z])${coef}(?=${mainVarEscaped}|[^a-zA-Z]|$)`,
        'g'
      );
      expr = expr.replace(regex, `(${value})`);
    });
    return expr;
  }, [casLatex, coefficients, coefficientValues, mainVariable]);

  // 그래프 가능 여부 (CAS 섹션)
  const isCasGraphable = useMemo(() => {
    if (!substitutedExpression) return false;
    // 등호가 있으면 우변만 사용
    const parts = substitutedExpression.split('=');
    const expr = parts.length > 1 ? parts[1].trim() : substitutedExpression;
    return canGraph(expr);
  }, [substitutedExpression]);

  // 그래프용 수식 (등호 처리)
  const graphExpression = useMemo(() => {
    if (!substitutedExpression) return '';
    const parts = substitutedExpression.split('=');
    return parts.length > 1 ? parts[1].trim() : substitutedExpression;
  }, [substitutedExpression]);

  // 현재 언어에 맞는 라벨 (영어는 undefined로 기본값 사용)
  const currentLabels = useMemo(() => {
    return language === 'ko' ? koLabels : undefined;
  }, [language]);

  // 상태 변경 핸들러 (새 객체로 복사하여 React 리렌더링 트리거)
  const handleStateChange = (newState: EditorState) => {
    setState({ ...newState });
    // 수식 분석
    if (newState.ast.children.length > 0) {
      try {
        const result = analyzeExpression(newState.ast);
        setAnalysis(result);
      } catch (e) {
        console.error('분석 오류:', e);
        setAnalysis(null);
      }
    } else {
      setAnalysis(null);
    }
  };

  // LaTeX 파싱 핸들러
  const handleLatexParse = () => {
    try {
      const ast = parseLatex(latexInput);
      setLatexState({
        ast,
        cursor: { nodeId: ast.id, offset: ast.children.length },
        selection: null,
      });
      // 수식 분석
      if (ast.children.length > 0) {
        const result = analyzeExpression(ast);
        setLatexAnalysis(result);
      } else {
        setLatexAnalysis(null);
      }
    } catch (e) {
      console.error('LaTeX 파싱 오류:', e);
      setLatexAnalysis(null);
    }
  };

  // CAS 상태 변경 핸들러 (EditorView 내부 변경 시)
  const handleCasStateChange = useCallback((newState: EditorState) => {
    if (newState.ast.children.length > 0) {
      const latex = astToLatex(newState.ast);
      setCasLatex(latex);
      setCasResult(null);
      // 수식 분석
      try {
        const analysisResult = analyzeExpression(newState.ast);
        setCasAnalysis(analysisResult);
      } catch (e) {
        console.error('CAS 분석 오류:', e);
        setCasAnalysis(null);
      }
    } else {
      setCasLatex('');
      setCasAnalysis(null);
      setCasResult(null);
    }
  }, []);

  // CAS 예시 로드
  const loadCasExample = useCallback((latex: string) => {
    try {
      const ast = parseLatex(latex);
      const newState: EditorState = {
        ast,
        cursor: { nodeId: ast.id, offset: ast.children.length },
        selection: null,
      };
      // 키를 변경하여 EditorView 리마운트
      setCasInitialState(newState);
      setCasKey((k) => k + 1);
      setCasLatex(latex);
      setCasResult(null);
      // 수식 분석
      try {
        const analysisResult = analyzeExpression(ast);
        setCasAnalysis(analysisResult);
        // 계수 초기화 (기본값 1)
        if (analysisResult.variableClassification) {
          const coefs = analysisResult.variableClassification.coefficients;
          const defaults: Record<string, number> = {};
          coefs.forEach((c) => { defaults[c] = 1; });
          setCoefficientValues(defaults);
        }
      } catch {
        setCasAnalysis(null);
      }
    } catch (e) {
      console.error('CAS 예시 로드 오류:', e);
    }
  }, []);

  // CAS 연산 핸들러
  const handleCasOperation = async (
    operation: 'simplify' | 'expand' | 'factor' | 'solve' | 'diff' | 'integrate'
  ) => {
    if (!casLatex) return;

    setCasLoading(true);
    setCasResult(null);
    try {
      let result: CASResult;
      switch (operation) {
        case 'simplify':
          result = await simplify(casLatex);
          break;
        case 'expand':
          result = await expand(casLatex);
          break;
        case 'factor':
          result = await factor(casLatex);
          break;
        case 'solve':
          result = await solve(casLatex);
          break;
        case 'diff':
          result = await diff(casLatex);
          break;
        case 'integrate':
          result = await integrate(casLatex);
          break;
      }
      setCasResult(result);
    } catch (e) {
      console.error('CAS 연산 오류:', e);
      setCasResult({
        success: false,
        operation,
        inputLatex: casLatex,
        error: e instanceof Error ? e.message : 'CAS 연산 실패',
      });
    }
    setCasLoading(false);
  };

  const basicExamples = [
    { name: 'y = x² + 2x + 1', state: createQuadraticExample() },
    { name: '분수 연산', state: createFractionExample() },
    { name: '(a + b)² 전개', state: createBinomialExample() },
    { name: 'E = mc²', state: createEinsteinExample() },
    { name: '피타고라스', state: createPythagorasExample() },
  ];

  const phase1Examples = [
    { name: '아래첨자 (수열)', state: createSubscriptExample() },
    { name: '절댓값', state: createAbsExample() },
    { name: '부등호 (원의 영역)', state: createInequalityExample() },
  ];

  const phase2Examples = [
    { name: '정적분', state: createIntegralExample() },
    { name: '시그마 (합)', state: createSumExample() },
    { name: '극한', state: createLimitExample() },
  ];

  const phase3Examples = [
    { name: '곱 (팩토리얼)', state: createProductExample() },
    { name: '평균 (윗줄)', state: createOverlineExample() },
    { name: '2×2 행렬', state: createMatrixExample() },
    { name: '텍스트 포함', state: createTextExample() },
  ];

  const phase4Examples = [
    { name: 'align (정렬)', state: createAlignExample() },
    { name: 'align* (번호 없음)', state: createAlignStarExample() },
    { name: 'cases (조건부)', state: createCasesExample() },
    { name: 'cases (절댓값)', state: createAbsCasesExample() },
    { name: 'gather (중앙 정렬)', state: createGatherExample() },
    { name: 'array (배열)', state: createArrayExample() },
    { name: 'vmatrix (행렬식)', state: createvmatrixExample() },
    { name: 'Vmatrix (이중선)', state: createVmatrixExample() },
  ];

  const advancedExamples = [
    { name: '근의 공식', state: createQuadraticFormulaExample() },
    { name: '오일러 공식', state: createEulerFormulaExample() },
    { name: '테일러 전개', state: createTaylorExample() },
  ];

  // 도메인 라벨
  const domainLabels: Record<string, string> = {
    arithmetic: '산술',
    polynomial: '다항식',
    rational: '유리식',
    trigonometric: '삼각함수',
    exponential: '지수함수',
    logarithmic: '로그함수',
    calculus: '미적분',
    'linear-algebra': '선형대수',
    statistics: '통계',
  };

  // 특성 라벨
  const featureLabels: Record<string, string> = {
    constant: '상수',
    linear: '1차',
    quadratic: '2차',
    cubic: '3차',
    'single-variable': '단일 변수',
    'multi-variable': '다변수',
    'has-fraction': '분수 포함',
    'has-power': '거듭제곱 포함',
    'has-sqrt': '제곱근 포함',
    periodic: '주기함수',
    'has-integral': '적분 포함',
    'has-sum': '시그마 포함',
    'has-limit': '극한 포함',
    'has-matrix': '행렬 포함',
  };

  // 분석 결과 렌더링
  const renderAnalysis = (analysisData: ExpressionAnalysis) => (
    <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
      <h3 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-2">
        <span>📊</span> 수식 분석 결과
      </h3>

      {/* 요약 */}
      <div className="mb-3 p-2 bg-white rounded border border-indigo-100">
        <span className="text-sm font-medium text-gray-700">{analysisData.summary}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        {/* 수식 형태 */}
        <div className="bg-white p-2 rounded border">
          <span className="text-xs text-gray-500 block">형태</span>
          <span className="font-medium">
            {analysisData.form === 'expression' && '수식'}
            {analysisData.form === 'equation' && '방정식'}
            {analysisData.form === 'inequality' && '부등식'}
          </span>
        </div>

        {/* 주요 도메인 */}
        <div className="bg-white p-2 rounded border">
          <span className="text-xs text-gray-500 block">주요 분야</span>
          <span className="font-medium text-indigo-700">
            {domainLabels[analysisData.primaryDomain] || analysisData.primaryDomain}
          </span>
        </div>

        {/* 복잡도 */}
        <div className="bg-white p-2 rounded border">
          <span className="text-xs text-gray-500 block">복잡도</span>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400"
                style={{ width: `${analysisData.complexity * 10}%` }}
              />
            </div>
            <span className="font-medium text-xs">{analysisData.complexity}/10</span>
          </div>
        </div>

        {/* 변수 분류 */}
        <div className="bg-white p-2 rounded border col-span-2">
          <span className="text-xs text-gray-500 block mb-1">변수 분류</span>
          <div className="flex gap-4 font-mono text-sm">
            <div>
              <span className="text-xs text-indigo-600 mr-1">주 변수:</span>
              <span className="font-medium">
                {analysisData.variableClassification?.mainVariables.length > 0
                  ? analysisData.variableClassification.mainVariables.join(', ')
                  : '-'}
              </span>
            </div>
            <div>
              <span className="text-xs text-purple-600 mr-1">계수:</span>
              <span className="font-medium">
                {analysisData.variableClassification?.coefficients.length > 0
                  ? analysisData.variableClassification.coefficients.join(', ')
                  : '-'}
              </span>
            </div>
            {analysisData.variableClassification && (
              <div className="text-xs text-gray-400">
                (신뢰도: {Math.round(analysisData.variableClassification.confidence * 100)}%)
              </div>
            )}
          </div>
        </div>

        {/* 다항식 차수 */}
        {analysisData.polynomial && (
          <div className="bg-white p-2 rounded border">
            <span className="text-xs text-gray-500 block">다항식 차수</span>
            <span className="font-medium">
              {analysisData.polynomial.degree}차 ({analysisData.polynomial.mainVariable})
            </span>
          </div>
        )}

        {/* 함수 */}
        {analysisData.functions.length > 0 && (
          <div className="bg-white p-2 rounded border">
            <span className="text-xs text-gray-500 block">함수</span>
            <span className="font-medium font-mono">
              {analysisData.functions.map(f => f.name).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* 도메인 태그 */}
      <div className="mt-3 flex flex-wrap gap-1">
        {analysisData.domains.map(domain => (
          <span
            key={domain}
            className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full"
          >
            {domainLabels[domain] || domain}
          </span>
        ))}
      </div>

      {/* 특성 태그 */}
      {analysisData.features.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {analysisData.features.map(feature => (
            <span
              key={feature}
              className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full"
            >
              {featureLabels[feature] || feature}
            </span>
          ))}
        </div>
      )}

      {/* 시각화 가능 여부 */}
      <div className="mt-3 pt-3 border-t border-indigo-100">
        <span className="text-xs text-gray-500 block mb-1">시각화 가능</span>
        <div className="flex gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded ${analysisData.visualization.graphable2D ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            2D 그래프 {analysisData.visualization.graphable2D ? '✓' : '✗'}
          </span>
          <span className={`px-2 py-0.5 rounded ${analysisData.visualization.graphable3D ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            3D 그래프 {analysisData.visualization.graphable3D ? '✓' : '✗'}
          </span>
          <span className={`px-2 py-0.5 rounded ${analysisData.visualization.numberLine ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            수직선 {analysisData.visualization.numberLine ? '✓' : '✗'}
          </span>
        </div>
      </div>
    </div>
  );

  const renderExampleSection = (title: string, examples: { name: string; state: EditorState }[]) => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="space-y-4">
        {examples.map((example, i) => (
          <div key={i} className="flex items-center gap-4">
            <span className="text-sm text-gray-500 w-36 flex-shrink-0">{example.name}</span>
            <div className="flex-1">
              <EditorView
                width={450}
                height={70}
                theme="light"
                initialState={example.state}
                readOnly
                showStructureToggle
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <FizzexI18nProvider labels={currentLabels}>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">Fizzex 데모</h1>
          {/* 언어 전환 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Language:</span>
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded text-sm ${
                language === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('ko')}
              className={`px-3 py-1 rounded text-sm ${
                language === 'ko'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              한국어
            </button>
          </div>
        </div>
          <p className="text-gray-600 mb-8">
            거품처럼 가볍고 쉬운 수식 입력기 - Canvas 기반 수학 수식 에디터
          </p>

          {/* 입력 테스트 - 라이트 테마 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">직접 입력해보기</h2>
            <EditorView
              width={600}
              height={80}
              theme="light"
              onChange={handleStateChange}
              showDebugToggle
              showSuggestions
              showStructureToggle
            />
            <div className="mt-4 text-sm text-gray-500">
            <p>숫자, 영문자(변수), +, -, *, /, ^, _, =, |, &lt;, &gt;, (, )</p>
          </div>
          {state && state.ast.children.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">LaTeX: </span>
              <code className="text-sm bg-white px-2 py-1 rounded border font-mono">
                {astToLatex(state.ast)}
              </code>
            </div>
          )}
          {/* 수식 분석 결과 */}
          {analysis && renderAnalysis(analysis)}
        </div>

        {/* LaTeX 입력 테스트 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">LaTeX 입력</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
              placeholder="LaTeX 수식 입력..."
            />
            <button
              onClick={handleLatexParse}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              렌더링
            </button>
          </div>
          {latexState && (
            <>
              <EditorView
                width={600}
                height={80}
                theme="light"
                initialState={latexState}
                readOnly
                showDebugToggle
                showStructureToggle
              />
              <div className="mt-4 text-sm text-gray-500">
                <strong>LaTeX 출력:</strong>{' '}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {astToLatex(latexState.ast)}
                </code>
              </div>
              {/* 수식 분석 결과 */}
              {latexAnalysis && renderAnalysis(latexAnalysis)}
            </>
          )}

        </div>

        {/* CAS (Computer Algebra System) 데모 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">CAS (Computer Algebra System)</h2>
          <p className="text-sm text-gray-500 mb-4">
            심볼릭 연산: 단순화, 전개, 인수분해, 방정식 풀이, 미분, 적분
          </p>

          {/* Fizzex 수식 입력기 */}
          <div className="mb-4">
            <EditorView
              key={casKey}
              width={600}
              height={60}
              theme="light"
              initialState={casInitialState}
              onChange={handleCasStateChange}
              showSuggestions
            />
            {casLatex && (
              <div className="mt-2 text-xs text-gray-400 font-mono">
                LaTeX: {casLatex}
              </div>
            )}
          </div>

          {/* CAS 수식 분석 결과 */}
          {casAnalysis && renderAnalysis(casAnalysis)}

          {/* CAS 연산 버튼 - 적용 가능한 것만 표시 */}
          {applicableOperations.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-4">
              {applicableOperations.map((op) => {
                // Tailwind 동적 클래스 대신 정적 매핑
                const colorStyles: Record<string, string> = {
                  blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
                  green: 'bg-green-100 text-green-700 hover:bg-green-200',
                  purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
                  orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
                  red: 'bg-red-100 text-red-700 hover:bg-red-200',
                  indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
                };
                return (
                  <button
                    key={op.id}
                    onClick={() => handleCasOperation(op.id)}
                    disabled={casLoading}
                    className={`px-3 py-1.5 rounded text-sm disabled:opacity-50 transition-colors ${colorStyles[op.color] || 'bg-gray-100 text-gray-700'}`}
                    title={op.description}
                  >
                    {op.label}
                  </button>
                );
              })}
            </div>
          ) : casLatex ? (
            <div className="text-sm text-gray-400 mb-4">
              적용 가능한 연산을 분석 중...
            </div>
          ) : (
            <div className="text-sm text-gray-400 mb-4">
              수식을 입력하면 적용 가능한 연산이 표시됩니다
            </div>
          )}

          {/* 로딩 */}
          {casLoading && (
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <span className="text-gray-500">계산 중...</span>
            </div>
          )}

          {/* CAS 결과 */}
          {casResult && !casLoading && (
            <div className={`p-4 rounded-lg ${casResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm font-medium ${casResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {casResult.success ? '✓ 성공' : '✗ 실패'}
                </span>
                <span className="text-xs text-gray-500">
                  ({casResult.operation})
                </span>
              </div>

              {casResult.success ? (
                <>
                  <div className="mb-2">
                    <span className="text-xs text-gray-500">결과 LaTeX:</span>
                    <code className="block mt-1 p-2 bg-white rounded border font-mono text-sm">
                      {casResult.resultLatex}
                    </code>
                  </div>

                  {/* 결과 렌더링 */}
                  {casResult.resultAst && (
                    <div className="mt-3">
                      <span className="text-xs text-gray-500">렌더링:</span>
                      <div className="mt-1 bg-white p-2 rounded border">
                        <EditorView
                          width={500}
                          height={60}
                          theme="light"
                          initialState={{
                            ast: casResult.resultAst,
                            cursor: { nodeId: casResult.resultAst.id, offset: 0 },
                            selection: null,
                          }}
                          readOnly
                        />
                      </div>
                    </div>
                  )}

                  {/* 방정식 해 */}
                  {casResult.solutions && casResult.solutions.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs text-gray-500">해:</span>
                      <div className="flex gap-2 mt-1">
                        {casResult.solutions.map((sol, i) => (
                          <span key={i} className="px-2 py-1 bg-white rounded border font-mono text-sm">
                            x = {sol}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-red-600 text-sm">
                  {casResult.error}
                </div>
              )}
            </div>
          )}

          {/* 인터랙티브 시각화 (AutoVisualizer) */}
          {casLatex && casAnalysis && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <span>📊</span> 자동 시각화
                  {casAnalysis.visualization.bestFit && (
                    <span className="text-xs font-normal text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                      추천: {casAnalysis.visualization.bestFit}
                    </span>
                  )}
                </h3>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={showCasGraph}
                    onChange={(e) => setShowCasGraph(e.target.checked)}
                    className="rounded"
                  />
                  시각화 표시
                </label>
              </div>

              {/* 계수 슬라이더 (계수가 있는 경우) */}
              {coefficients.length > 0 && (
                <div className="mb-4 p-3 bg-white rounded border">
                  <p className="text-xs text-gray-500 mb-2">
                    계수 조절 (주변수: <span className="font-mono font-medium text-indigo-600">{mainVariable}</span>)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {coefficients.map((coef) => (
                      <div key={coef} className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-purple-700 w-6">{coef}</span>
                        <input
                          type="range"
                          min="-5"
                          max="5"
                          step="0.5"
                          value={coefficientValues[coef] ?? 1}
                          onChange={(e) => {
                            setCoefficientValues((prev) => ({
                              ...prev,
                              [coef]: parseFloat(e.target.value),
                            }));
                          }}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs font-mono w-8 text-right text-gray-600">
                          {coefficientValues[coef] ?? 1}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* 치환된 수식 표시 */}
                  <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                    <span className="font-medium">적용된 수식:</span>{' '}
                    <code className="font-mono bg-gray-100 px-1 rounded">{graphExpression || casLatex}</code>
                  </div>
                </div>
              )}

              {/* AutoVisualizer */}
              {showCasGraph && (
                <AutoVisualizer
                  analysis={casAnalysis}
                  latex={casLatex}
                  height={350}
                  lineColor="#3b82f6"
                  showSelector
                  coefficientValues={coefficientValues}
                />
              )}
            </div>
          )}

          {/* CAS 예시 */}
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-500 mb-2">
              예시 수식 (클릭하면 입력됨)
              <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">
                보라색 = 슬라이더로 계수 조절 가능
              </span>
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {/* 다항식 */}
              <button onClick={() => loadCasExample('x^2 - 1')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
                x² - 1
              </button>
              <button onClick={() => loadCasExample('a x^2 + b x + c')} className="px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-200 hover:bg-purple-100 font-medium">
                ax² + bx + c
              </button>
              <button onClick={() => loadCasExample('a x + b')} className="px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-200 hover:bg-purple-100 font-medium">
                ax + b
              </button>
              {/* 삼각함수 */}
              <button onClick={() => loadCasExample('\\sin(x)')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
                sin(x)
              </button>
              <button onClick={() => loadCasExample('a \\sin(b x)')} className="px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-200 hover:bg-purple-100 font-medium">
                a·sin(bx)
              </button>
              <button onClick={() => loadCasExample('\\cos(x)')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
                cos(x)
              </button>
              <button onClick={() => loadCasExample('\\sin(\\theta)')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
                sin(θ)
              </button>
              {/* 지수/로그 */}
              <button onClick={() => loadCasExample('e^x')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
                eˣ
              </button>
              <button onClick={() => loadCasExample('a \\cdot e^{b x}')} className="px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-200 hover:bg-purple-100 font-medium">
                a·eᵇˣ
              </button>
              <button onClick={() => loadCasExample('\\ln(x)')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
                ln(x)
              </button>
              {/* 유리함수 */}
              <button onClick={() => loadCasExample('\\frac{1}{x}')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
                1/x
              </button>
              <button onClick={() => loadCasExample('\\frac{a}{x + b}')} className="px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-200 hover:bg-purple-100 font-medium">
                a/(x+b)
              </button>
              {/* 기타 */}
              <button onClick={() => loadCasExample('\\sqrt{x}')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
                √x
              </button>
              <button onClick={() => loadCasExample('|x|')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
                |x|
              </button>
              {/* 부등식 → 수직선 */}
              <button onClick={() => loadCasExample('x < 3')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
                x {'<'} 3
              </button>
              <button onClick={() => loadCasExample('x \\geq -2')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
                x ≥ -2
              </button>
              <button onClick={() => loadCasExample('|x - 1| < 3')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
                |x-1| {'<'} 3
              </button>
              {/* 극좌표 */}
              <button onClick={() => loadCasExample('r = 1 + \\cos(\\theta)')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
                r = 1+cos(θ)
              </button>
            </div>
          </div>
        </div>

        {/* 추가 시각화 도구 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">추가 시각화 도구</h2>
          <p className="text-sm text-gray-500 mb-6">
            수식을 이해하기 위한 다양한 시각화 방법
          </p>

          {/* 단위원 */}
          <div className="mb-8 p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-100">
            <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
              <span>🔵</span> 단위원 (Unit Circle)
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              삼각함수 sin, cos의 기하학적 의미를 직관적으로 이해할 수 있습니다.
              점을 드래그하거나 슬라이더를 조절하여 각도를 변경해보세요.
            </p>
            <div className="flex justify-center">
              <UnitCircle
                size={300}
                lineColor="#22c55e"
                onAngleChange={(angle, sin, cos) => {
                  // 콘솔에서 확인 가능
                  console.log(`θ=${(angle * 180 / Math.PI).toFixed(1)}°, sin=${sin.toFixed(3)}, cos=${cos.toFixed(3)}`);
                }}
              />
            </div>
          </div>

          {/* 수직선 */}
          <div className="mb-8 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100">
            <h3 className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-2">
              <span>📏</span> 수직선 (Number Line)
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              부등식의 해집합이나 구간을 시각적으로 표현합니다.
            </p>

            {/* 예시 1: 점 표시 */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">점 표시: x = -2, 0, 3</p>
              <NumberLine
                points={[
                  { value: -2, label: '-2', color: '#ef4444' },
                  { value: 0, label: '0', color: '#22c55e' },
                  { value: 3, label: '3', color: '#3b82f6' },
                ]}
                height={80}
              />
            </div>

            {/* 예시 2: 구간 표시 */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">구간: -2 ≤ x {'<'} 3</p>
              <NumberLine
                intervals={[
                  { start: -2, end: 3, startIncluded: true, endIncluded: false, color: '#8b5cf6', label: '-2 ≤ x < 3' },
                ]}
                height={80}
              />
            </div>

            {/* 예시 3: 절댓값 부등식 */}
            <div>
              <p className="text-xs text-gray-500 mb-2">|x - 1| ≤ 2 → -1 ≤ x ≤ 3</p>
              <NumberLine
                points={[
                  { value: 1, label: '중심', color: '#f97316', included: true },
                ]}
                intervals={[
                  { start: -1, end: 3, startIncluded: true, endIncluded: true, color: '#22c55e', label: '|x-1| ≤ 2' },
                ]}
                height={80}
              />
            </div>
          </div>

          {/* 극좌표 그래프 */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
            <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
              <span>🌀</span> 극좌표 그래프 (Polar Graph)
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              r = f(θ) 형태의 극좌표 함수를 시각화합니다.
              각도 θ에 따른 반지름 r의 변화를 보여줍니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 심장 곡선 (카디오이드) */}
              <div className="bg-white p-3 rounded border">
                <p className="text-xs text-gray-500 mb-2">카디오이드: r = 1 + cos(θ)</p>
                <div className="flex justify-center">
                  <PolarGraph
                    expression="1 + \\cos(t)"
                    size={250}
                    lineColor="#ec4899"
                    showGrid
                  />
                </div>
              </div>

              {/* 장미 곡선 */}
              <div className="bg-white p-3 rounded border">
                <p className="text-xs text-gray-500 mb-2">장미 곡선: r = 2·sin(3θ)</p>
                <div className="flex justify-center">
                  <PolarGraph
                    expression="2 * \\sin(3 * t)"
                    size={250}
                    lineColor="#8b5cf6"
                    showGrid
                  />
                </div>
              </div>

              {/* 나선 */}
              <div className="bg-white p-3 rounded border">
                <p className="text-xs text-gray-500 mb-2">아르키메데스 나선: r = θ/π</p>
                <div className="flex justify-center">
                  <PolarGraph
                    expression="t / 3.14159"
                    size={250}
                    lineColor="#22c55e"
                    thetaRange={[0, Math.PI * 4]}
                    showGrid
                  />
                </div>
              </div>

              {/* 레미니스케이트 */}
              <div className="bg-white p-3 rounded border">
                <p className="text-xs text-gray-500 mb-2">렘니스케이트: r² = 4·cos(2θ)</p>
                <div className="flex justify-center">
                  <PolarGraph
                    expression="2 * Math.sqrt(Math.abs(\\cos(2 * t)))"
                    size={250}
                    lineColor="#f97316"
                    showGrid
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LaTeX 입력 (계속) */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {/* LaTeX 예시 목록 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium text-sm mb-3">LaTeX 예시 (복사해서 사용):</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
              <code className="bg-white p-2 rounded border">{'\\frac{1}{2} + \\frac{1}{3}'}</code>
              <code className="bg-white p-2 rounded border">{'x^2 + y^2 = r^2'}</code>
              <code className="bg-white p-2 rounded border">{'\\sqrt{x^2 + y^2}'}</code>
              <code className="bg-white p-2 rounded border">{'a_n = a_{n-1} + d'}</code>
              <code className="bg-white p-2 rounded border">{'\\int_0^1 x^2 dx'}</code>
              <code className="bg-white p-2 rounded border">{'\\sum_{i=1}^{n} i'}</code>
              <code className="bg-white p-2 rounded border">{'\\lim_{x \\to \\infty} \\frac{1}{x}'}</code>
              <code className="bg-white p-2 rounded border">{'\\prod_{i=1}^{n} i'}</code>
              <code className="bg-white p-2 rounded border">{'\\overline{x}'}</code>
              <code className="bg-white p-2 rounded border">{'\\text{hello}'}</code>
              <code className="bg-white p-2 rounded border">{'|x - 3| \\leq 5'}</code>
              <code className="bg-white p-2 rounded border">{'e^{i\\pi} + 1 = 0'}</code>
            </div>
            <p className="font-medium text-sm mt-4 mb-3">LaTeX 환경:</p>
            <div className="grid grid-cols-1 gap-2 text-xs font-mono">
              <code className="bg-white p-2 rounded border">{'\\begin{align}x + y &= 5 \\\\2x - y &= 1\\end{align}'}</code>
              <code className="bg-white p-2 rounded border">{'f(x) = \\begin{cases}x^2 & x \\geq 0 \\\\-x & x < 0\\end{cases}'}</code>
              <code className="bg-white p-2 rounded border">{'\\begin{gather}a + b = c \\\\E = mc^2\\end{gather}'}</code>
              <code className="bg-white p-2 rounded border">{'\\begin{array}{lcr}a & b & c \\\\d & e & f\\end{array}'}</code>
              <code className="bg-white p-2 rounded border">{'\\begin{Vmatrix}a & b \\\\c & d\\end{Vmatrix} = ad - bc'}</code>
            </div>
          </div>

          {/* 복잡한 수식 테스트 */}
          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="font-medium text-sm mb-2 text-amber-800">복잡한 수식 테스트 (미지원 기능 포함)</p>
            <p className="text-xs text-amber-600 mb-3">일부 기호가 지원되지 않아 렌더링이 불완전할 수 있습니다.</p>
            <div className="space-y-2 text-xs font-mono">
              <div className="bg-white p-2 rounded border">
                <span className="text-amber-700 font-medium">1. 중첩 적분 + 급수:</span>
                <code className="block mt-1 text-gray-600 break-all">{'\\mathcal{F}(x)=\\int_{0}^{\\infty}\\left(\\sum_{n=1}^{\\infty}\\frac{(-1)^n}{n!}\\left(\\int_{0}^{1}x^{n t} e^{-t^2} \\, dt\\right)\\right)\\ln\\!\\left(1 + e^{-x^2}\\right)\\, dx'}</code>
              </div>
              <div className="bg-white p-2 rounded border">
                <span className="text-amber-700 font-medium">2. 행렬 + 지수 + 고유값:</span>
                <code className="block mt-1 text-gray-600 break-all">{'\\Phi(A)=\\frac{\\det\\!\\left(A^\\top A + \\lambda I\\right)}{\\operatorname{tr}\\!\\left(e^{A} + \\sum_{k=1}^{m} \\frac{A^k}{k!}\\right)}\\cdot\\prod_{i=1}^{n}\\sqrt{|\\mu_i(A)|}'}</code>
              </div>
              <div className="bg-white p-2 rounded border">
                <span className="text-amber-700 font-medium">3. 변분 문제:</span>
                <code className="block mt-1 text-gray-600 break-all">{'\\mathcal{L}[u]=\\int_{\\Omega}\\left(\\frac{1}{2}\\sum_{i,j=1}^{n}a_{ij}(x)\\frac{\\partial u}{\\partial x_i}\\frac{\\partial u}{\\partial x_j}+V(x) u^2-f(x) u\\right)\\, dx+\\epsilon\\int_{\\partial \\Omega}|\\nabla u|^3 \\, dS'}</code>
              </div>
              <div className="bg-white p-2 rounded border">
                <span className="text-amber-700 font-medium">4. 확률 + 정보이론:</span>
                <code className="block mt-1 text-gray-600 break-all">{'\\Psi(X,Y)=\\mathbb{E}\\left[\\left.\\sum_{i=1}^{N}\\frac{P(X_i \\mid Y)^2}{\\int_{\\mathcal{Y}} P(X_i \\mid y)\\, dy}\\right| Y\\right]+\\beta H(X \\mid Y)-\\gamma D_{\\mathrm{KL}}(P \\Vert Q)'}</code>
              </div>
              <div className="bg-white p-2 rounded border">
                <span className="text-amber-700 font-medium">5. 렌더러 스트레스 테스트:</span>
                <code className="block mt-1 text-gray-600 break-all">{'\\Xi=\\left(\\sum_{k=0}^{\\infty}\\frac{(-1)^k}{(2k+1)!}\\left[\\prod_{j=1}^{k}\\left(\\int_{0}^{1}\\frac{\\sqrt{1 + x^{2j}}}{1 + \\ln(1+x)} \\, dx\\right)\\right]\\right)^{1/\\pi}\\Bigg/\\left|\\lim_{n\\to\\infty}\\frac{1}{n}\\sum_{m=1}^{n}e^{i m \\theta}\\right|'}</code>
              </div>
            </div>
          </div>
        </div>

        {/* AST 디버그 */}
        {state && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">AST 구조</h2>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-60">
              {JSON.stringify(state.ast, null, 2)}
            </pre>
            <div className="mt-4 text-sm">
              <strong>커서 위치:</strong> nodeId={state.cursor.nodeId}, offset={state.cursor.offset}
            </div>
          </div>
        )}

        {/* 기본 수식 */}
        {renderExampleSection('기본 수식', basicExamples)}

        {/* Phase 1 */}
        {renderExampleSection('Phase 1: 아래첨자 · 절댓값 · 부등호', phase1Examples)}

        {/* Phase 2 */}
        {renderExampleSection('Phase 2: 적분 · 시그마 · 극한', phase2Examples)}

        {/* Phase 3 */}
        {renderExampleSection('Phase 3: 곱 · 윗줄 · 행렬 · 텍스트', phase3Examples)}

        {/* Phase 4: LaTeX 환경 */}
        {renderExampleSection('Phase 4: LaTeX 환경 (align · cases · gather · array)', phase4Examples)}

        {/* 고급 예시 */}
        {renderExampleSection('복합 수식', advancedExamples)}

        {/* 지원 문법 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">지원 LaTeX 문법</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium mb-2 text-blue-800">기본</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• 분수: <code>\frac{'{a}'}{'{b}'}</code></li>
                <li>• 거듭제곱: <code>x^2, x^{'{n}'}</code></li>
                <li>• 아래첨자: <code>a_n, a_{'{i,j}'}</code></li>
                <li>• 루트: <code>\sqrt{'{x}'}, \sqrt[n]{'{x}'}</code></li>
                <li>• 괄호: <code>(, [, \{'{'}, \{'}'}</code></li>
                <li>• 절댓값: <code>|x|</code></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-blue-800">연산자</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• 기본: <code>+, -, =</code></li>
                <li>• 곱셈: <code>\times, \cdot</code></li>
                <li>• 나눗셈: <code>\div</code></li>
                <li>• 부등호: <code>&lt;, &gt;, \leq, \geq, \neq</code></li>
                <li>• 플마: <code>\pm</code></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-blue-800">고급</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• 적분: <code>\int_{'{a}'}^{'{b}'} f(x) dx</code></li>
                <li>• 시그마: <code>\sum_{'{i=1}'}^{'{n}'}</code></li>
                <li>• 곱: <code>\prod_{'{i=1}'}^{'{n}'}</code></li>
                <li>• 극한: <code>\lim_{'{x \\to \\infty}'}</code></li>
                <li>• 윗줄: <code>\overline{'{x}'}</code></li>
                <li>• 텍스트: <code>\text{'{내용}'}</code></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-blue-800">그리스 문자</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• α: <code>\alpha</code></li>
                <li>• β: <code>\beta</code></li>
                <li>• γ: <code>\gamma</code></li>
                <li>• π: <code>\pi</code></li>
                <li>• θ: <code>\theta</code></li>
                <li>• ∞: <code>\infty</code></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-blue-800">LaTeX 환경</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• 정렬: <code>\begin{'{align}'} ... \end{'{align}'}</code></li>
                <li>• 조건부: <code>\begin{'{cases}'} ... \end{'{cases}'}</code></li>
                <li>• 중앙정렬: <code>\begin{'{gather}'} ... \end{'{gather}'}</code></li>
                <li>• 배열: <code>\begin{'{array}{lcr}'} ... \end{'{array}'}</code></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-blue-800">행렬 환경</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• 기본: <code>\begin{'{matrix}'}</code></li>
                <li>• 소괄호: <code>\begin{'{pmatrix}'}</code></li>
                <li>• 대괄호: <code>\begin{'{bmatrix}'}</code></li>
                <li>• 중괄호: <code>\begin{'{Bmatrix}'}</code></li>
                <li>• 행렬식: <code>\begin{'{vmatrix}'}</code></li>
                <li>• 노름: <code>\begin{'{Vmatrix}'}</code></li>
              </ul>
            </div>
          </div>
        </div>

        {/* 사용법 */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3 text-blue-900">키보드 단축키</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <kbd className="bg-white px-1 rounded">0-9</kbd> 숫자 입력</li>
              <li>• <kbd className="bg-white px-1 rounded">a-z</kbd> 변수 입력</li>
              <li>• <kbd className="bg-white px-1 rounded">+</kbd> <kbd className="bg-white px-1 rounded">-</kbd> <kbd className="bg-white px-1 rounded">*</kbd> 연산자</li>
              <li>• <kbd className="bg-white px-1 rounded">/</kbd> 분수 생성</li>
              <li>• <kbd className="bg-white px-1 rounded">^</kbd> 거듭제곱</li>
              <li>• <kbd className="bg-white px-1 rounded">_</kbd> 아래첨자</li>
            </ul>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <kbd className="bg-white px-1 rounded">(</kbd> <kbd className="bg-white px-1 rounded">[</kbd> <kbd className="bg-white px-1 rounded">{'{'}</kbd> 괄호</li>
              <li>• <kbd className="bg-white px-1 rounded">|</kbd> 절댓값</li>
              <li>• <kbd className="bg-white px-1 rounded">&lt;</kbd> <kbd className="bg-white px-1 rounded">&gt;</kbd> 부등호</li>
              <li>• <kbd className="bg-white px-1 rounded">=</kbd> 등호</li>
              <li>• <kbd className="bg-white px-1 rounded">←</kbd> <kbd className="bg-white px-1 rounded">→</kbd> 커서 이동</li>
              <li>• <kbd className="bg-white px-1 rounded">Backspace</kbd> 삭제</li>
            </ul>
            </div>
          </div>
        </div>
      </div>
    </FizzexI18nProvider>
  );
}
