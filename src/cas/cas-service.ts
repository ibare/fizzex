/**
 * Fizzex CAS Service - Nerdamer 기반 Computer Algebra System
 *
 * 수식의 심볼릭 연산 수행:
 * - 단순화, 전개, 인수분해
 * - 방정식 풀이
 * - 미분, 적분
 */

import type { RootNode } from '../types';
import type {
  CASResult,
  CASOperation,
  DiffOptions,
  IntegrateOptions,
  SolveOptions,
} from './types';
import { latexToNerdamer, cleanNerdamerLatex, splitEquation } from './latex-converter';
import { parseLatex } from '../latex';

// Nerdamer 타입 (간소화)
interface NerdamerExpr {
  toTeX(): string;
  text(option?: string): string;
  toString(): string;
  simplify(): NerdamerExpr;
  evaluate(): NerdamerExpr;
}

interface NerdamerAPI {
  (expr: string, subs?: Record<string, string>): NerdamerExpr;
  solve(expr: string, variable?: string): NerdamerExpr;
  factor(expr: string): NerdamerExpr;
  expand(expr: string): NerdamerExpr;
  diff(expr: string, variable?: string, times?: number): NerdamerExpr;
  integrate(expr: string, variable?: string): NerdamerExpr;
  defint(expr: string, from: number, to: number, variable?: string): NerdamerExpr;
  convertToLaTeX(expr: string): string;
}

// Nerdamer 모듈 동적 로드 (모든 기능 포함)
let nerdamer: NerdamerAPI | null = null;
let nerdamerLoaded = false;

/**
 * Nerdamer 초기화 (지연 로딩)
 */
async function ensureNerdamer(): Promise<NerdamerAPI> {
  if (nerdamerLoaded && nerdamer) {
    return nerdamer;
  }

  try {
    // 기본 모듈
    const nerdamerModule = await import('nerdamer');
    // 확장 모듈 로드
    await import('nerdamer/Algebra');
    await import('nerdamer/Calculus');
    await import('nerdamer/Solve');

    // default export 또는 모듈 자체
    nerdamer = (nerdamerModule.default || nerdamerModule) as unknown as NerdamerAPI;
    nerdamerLoaded = true;
    return nerdamer;
  } catch (error) {
    console.error('[CAS] Nerdamer 로딩 실패:', error);
    throw new Error('CAS 엔진 로딩 실패');
  }
}

/**
 * CAS 연산 결과 생성 헬퍼
 */
function createResult(
  operation: CASOperation,
  inputLatex: string,
  options: Partial<CASResult> = {}
): CASResult {
  return {
    success: false,
    operation,
    inputLatex,
    ...options,
  };
}

/**
 * Nerdamer 결과를 LaTeX로 안전하게 변환
 */
function exprToLatex(expr: NerdamerExpr, nerd: NerdamerAPI): string {
  try {
    // 먼저 toTeX() 시도
    if (typeof expr.toTeX === 'function') {
      return expr.toTeX();
    }
  } catch {
    // toTeX 실패 시 다른 방법 시도
  }

  try {
    // text() 결과를 convertToLaTeX로 변환
    const textResult = expr.text ? expr.text() : expr.toString();
    if (typeof nerd.convertToLaTeX === 'function') {
      return nerd.convertToLaTeX(textResult);
    }
    return textResult;
  } catch {
    // 최후의 수단: toString
    return String(expr);
  }
}

/**
 * 결과 LaTeX를 AST로 파싱
 */
function parseResultToAst(latex: string): RootNode | undefined {
  try {
    const cleaned = cleanNerdamerLatex(latex);
    return parseLatex(cleaned).ast;
  } catch {
    return undefined;
  }
}

/**
 * 수식 단순화
 *
 * @example
 * simplify('x^2 + 2x + 1') → '(x+1)^2' (경우에 따라)
 * simplify('\\frac{2x}{2}') → 'x'
 */
export async function simplify(latex: string): Promise<CASResult> {
  const result = createResult('simplify', latex);

  try {
    const nerd = await ensureNerdamer();
    const expr = latexToNerdamer(latex);

    const simplified = nerd(expr).simplify();
    const resultLatex = exprToLatex(simplified, nerd);

    result.success = true;
    result.resultLatex = resultLatex;
    result.resultAst = parseResultToAst(resultLatex);
  } catch (error) {
    result.error = error instanceof Error ? error.message : '단순화 실패';
  }

  return result;
}

/**
 * 수식 전개
 *
 * @example
 * expand('(x+1)^2') → 'x^2 + 2x + 1'
 * expand('(a+b)(a-b)') → 'a^2 - b^2'
 */
export async function expand(latex: string): Promise<CASResult> {
  const result = createResult('expand', latex);

  try {
    const nerd = await ensureNerdamer();
    const expr = latexToNerdamer(latex);

    const expanded = nerd.expand(expr);
    const resultLatex = exprToLatex(expanded, nerd);

    result.success = true;
    result.resultLatex = resultLatex;
    result.resultAst = parseResultToAst(resultLatex);
  } catch (error) {
    result.error = error instanceof Error ? error.message : '전개 실패';
  }

  return result;
}

/**
 * 인수분해
 *
 * @example
 * factor('x^2 - 1') → '(x-1)(x+1)'
 * factor('x^2 + 2x + 1') → '(x+1)^2'
 */
export async function factor(latex: string): Promise<CASResult> {
  const result = createResult('factor', latex);

  try {
    const nerd = await ensureNerdamer();
    const expr = latexToNerdamer(latex);

    const factored = nerd.factor(expr);
    const resultLatex = exprToLatex(factored, nerd);

    result.success = true;
    result.resultLatex = resultLatex;
    result.resultAst = parseResultToAst(resultLatex);
  } catch (error) {
    result.error = error instanceof Error ? error.message : '인수분해 실패';
  }

  return result;
}

/**
 * 방정식 풀이
 *
 * @example
 * solve('x^2 - 4 = 0') → solutions: ['2', '-2']
 * solve('ax^2 + bx + c = 0', { variable: 'x' }) → 근의 공식
 */
export async function solve(
  latex: string,
  options: SolveOptions = {}
): Promise<CASResult> {
  const result = createResult('solve', latex);

  try {
    const nerd = await ensureNerdamer();
    const [leftMinusRight] = splitEquation(latex);

    const variable = options.variable || detectMainVariable(leftMinusRight);
    const solved = nerd.solve(leftMinusRight, variable);

    // 해를 배열로 추출
    const solutionsText = solved.text ? solved.text() : String(solved);
    const solutions = parseSolutions(solutionsText);

    result.success = true;
    result.resultLatex = exprToLatex(solved, nerd);
    result.solutions = solutions;
    result.resultAst = parseResultToAst(result.resultLatex);
  } catch (error) {
    result.error = error instanceof Error ? error.message : '풀이 실패';
  }

  return result;
}

/**
 * 미분
 *
 * @example
 * diff('x^3') → '3x^2'
 * diff('sin(x)') → 'cos(x)'
 * diff('x^2', { times: 2 }) → '2' (2차 미분)
 */
export async function diff(
  latex: string,
  options: DiffOptions = {}
): Promise<CASResult> {
  const result = createResult('diff', latex);

  try {
    const nerd = await ensureNerdamer();
    const expr = latexToNerdamer(latex);

    const variable = options.variable || detectMainVariable(expr);
    const times = options.times || 1;

    const diffed = nerd.diff(expr, variable, times);
    const resultLatex = exprToLatex(diffed, nerd);

    result.success = true;
    result.resultLatex = resultLatex;
    result.resultAst = parseResultToAst(resultLatex);
  } catch (error) {
    result.error = error instanceof Error ? error.message : '미분 실패';
  }

  return result;
}

/**
 * 적분
 *
 * @example
 * integrate('x^2') → 'x^3/3'
 * integrate('cos(x)') → 'sin(x)'
 * integrate('x', { from: 0, to: 1 }) → '0.5' (정적분)
 */
export async function integrate(
  latex: string,
  options: IntegrateOptions = {}
): Promise<CASResult> {
  const result = createResult('integrate', latex);

  try {
    const nerd = await ensureNerdamer();
    const expr = latexToNerdamer(latex);

    const variable = options.variable || detectMainVariable(expr);

    let integrated;
    if (options.from !== undefined && options.to !== undefined) {
      // 정적분
      integrated = nerd.defint(expr, options.from, options.to, variable);
    } else {
      // 부정적분
      integrated = nerd.integrate(expr, variable);
    }

    const resultLatex = exprToLatex(integrated, nerd);

    result.success = true;
    result.resultLatex = resultLatex;
    result.resultAst = parseResultToAst(resultLatex);
  } catch (error) {
    result.error = error instanceof Error ? error.message : '적분 실패';
  }

  return result;
}

/**
 * 수치 계산 (변수 값 대입)
 *
 * @example
 * evaluate('x^2 + 1', { x: 3 }) → '10'
 */
export async function evaluate(
  latex: string,
  variables: Record<string, number> = {}
): Promise<CASResult> {
  const result = createResult('evaluate', latex);

  try {
    const nerd = await ensureNerdamer();
    const expr = latexToNerdamer(latex);

    // 변수 값 대입
    const subs: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      subs[key] = String(value);
    }

    const evaluated = nerd(expr, subs).evaluate();
    const resultLatex = exprToLatex(evaluated, nerd);

    result.success = true;
    result.resultLatex = resultLatex;
    result.resultAst = parseResultToAst(resultLatex);
  } catch (error) {
    result.error = error instanceof Error ? error.message : '계산 실패';
  }

  return result;
}

/**
 * 주 변수 자동 감지
 * x, y, z, t 순서로 우선 탐지
 */
function detectMainVariable(expr: string): string {
  const priority = ['x', 'y', 'z', 't', 'u', 'v', 'w'];

  for (const v of priority) {
    // 변수로 사용된 것만 체크 (함수명 제외)
    const regex = new RegExp(`(?<![a-zA-Z])${v}(?![a-zA-Z])`, 'g');
    if (regex.test(expr)) {
      return v;
    }
  }

  // 기본값
  return 'x';
}

/**
 * Nerdamer 해 텍스트를 배열로 파싱
 * "[2, -2]" → ['2', '-2']
 */
function parseSolutions(text: string): string[] {
  // 괄호 제거 후 쉼표로 분리
  const cleaned = text.replace(/^\[|\]$/g, '');
  if (!cleaned) return [];

  return cleaned.split(',').map((s) => s.trim());
}

/**
 * AST에서 직접 CAS 연산 수행
 */
export async function performOperation(
  ast: RootNode,
  operation: CASOperation,
  options?: DiffOptions | IntegrateOptions | SolveOptions
): Promise<CASResult> {
  // AST를 LaTeX로 변환
  const { astToLatex } = await import('../latex');
  const latex = astToLatex(ast);

  switch (operation) {
    case 'simplify':
      return simplify(latex);
    case 'expand':
      return expand(latex);
    case 'factor':
      return factor(latex);
    case 'solve':
      return solve(latex, options as SolveOptions);
    case 'diff':
      return diff(latex, options as DiffOptions);
    case 'integrate':
      return integrate(latex, options as IntegrateOptions);
    case 'evaluate':
      return evaluate(latex);
    default:
      return createResult(operation, latex, {
        error: `지원하지 않는 연산: ${operation}`,
      });
  }
}
