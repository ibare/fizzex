/**
 * 다항식 프로파일 — 정규화 IR 위의 공개 파사드
 *
 * `analyzeExpression().polynomial` 은 다항식이 아닌 식에도 차수를 답한다
 * (`2^x`·`\frac{1}{x}`·`\sin x` 가 전부 1차, `x^2y + y^2` 가 3차가 아니라 2차).
 * 정확한 판정은 `canonical/` 의 정규화 IR 위에 이미 있는데, 그 층은
 * 형식 매칭 전용이라 밖으로 나가지 않았다.
 *
 * 이 파일은 그 결과만 내보낸다. `ExprNode`·`NormalizedExpr` 같은 IR 타입은
 * 반환값에 싣지 않는다 — IR 은 형식 매칭을 위해 계속 바뀌는 내부 구조이고,
 * 공개하면 그 변경이 전부 파괴적 변경이 된다.
 */

import type { MathNode } from '../types.js';
import { normalizeAst } from './canonical/from-ast.js';
import { classifyExpr } from './canonical/classify.js';
import { symKey } from './canonical/polynomial.js';
import type { ExprNode } from './canonical/expr.js';

/** 식의 형태. 차수는 `expression`·`definition`·`equation` 에서만 산출된다. */
export type PolynomialShape =
  | 'expression'
  | 'equation'
  | 'inequality'
  | 'definition'
  | 'multi-relation';

/**
 * 계수. 수치면 `number`, 단일 심볼이면 그 이름(정규형).
 *
 * 복합식 계수(`(a+b)x^2` 의 `a+b`)는 표현하지 않는다 — IR 을 문자열로
 * 인코딩해 내보내면 감춘 의미가 없다.
 */
export type PolynomialCoefficient = number | string;

export interface PolynomialProfile {
  shape: PolynomialShape;
  /** `definition` 일 때 좌변 종속변수 (`y = ...` 의 `y`) */
  dependent?: string;
  /**
   * 부정원으로 취급한 심볼 (정규형). `definition` 이면 우변 기준이다.
   */
  mainVariables: string[];
  /** 계수·파라미터로 취급한 심볼 (정규형) */
  parameters: string[];
  /**
   * 수학 상수 이름과 겹치는 심볼 (정규형).
   *
   * **분할이 아니라 태그다.** `\varphi` 는 `φ` 로 정규화되는데 `φ` 는 황금비이기도
   * 하다. 각도인지 황금비인지는 이 층에서 알 수 없으므로 판단하지 않고, 여기 실린
   * 심볼은 `mainVariables`/`parameters` 에도 그대로 남는다.
   *
   * 다만 `definition` 에서는 산출 범위가 다르다 — 이 목록은 식 전체에서,
   * 나머지 둘은 우변에서 모은다. 종속변수가 상수명과 겹치면(`e = mc^2` 의 `e`)
   * 여기에만 실린다.
   */
  constants: string[];
  /**
   * 항별 total degree 의 최댓값.
   *
   * `null` 은 두 경우다 — 다항식이 아니거나(`2^x`, `\frac{1}{x}`, `\sin x`),
   * shape 가 차수 산출 대상이 아니거나(`inequality`, `multi-relation`).
   * 후자는 `x^2 + 1 > 0` 처럼 다항식이어도 `null` 이다.
   */
  degree: number | null;
  /**
   * 차수 → 계수. 부정원이 **하나일 때만** 채운다.
   *
   * 복합식 계수가 하나라도 있으면 통째로 생략한다. 일부만 주면 호스트가
   * 빠진 차수를 0 으로 오해한다.
   */
  coefficients?: Readonly<Record<number, PolynomialCoefficient>>;
  /**
   * 정규화가 완전했는가.
   *
   * `false` 여도 나머지 필드는 유효하다 — `±` 나 `∈` 처럼 모델링하지 않는
   * 연산자가 섞이면 내려간다. 차수는 대개 `null` 이 된다.
   */
  normalized: boolean;
}

/** 계수 노드를 IR 없이 낮춘다. 수치·단일 심볼만 표현하고 나머지는 포기한다. */
function lowerCoefficient(e: ExprNode): PolynomialCoefficient | null {
  if (e.kind === 'num') return e.value;
  if (e.kind === 'sym') return symKey(e.name, e.sub);
  return null;
}

function lowerCoefficients(
  c: ReadonlyMap<number, ExprNode>,
): Readonly<Record<number, PolynomialCoefficient>> | undefined {
  const out: Record<number, PolynomialCoefficient> = {};
  for (const [degree, node] of c) {
    const value = lowerCoefficient(node);
    if (value === null) return undefined; // 하나라도 복합이면 전부 포기
    out[degree] = value;
  }
  return out;
}

/**
 * 식의 다항식 프로파일을 구한다.
 *
 * 심볼 이름은 전부 정규형이다 — `\pi` 가 아니라 `π`, `x_0` 는 `x_0`.
 *
 * 어떤 입력에도 실패하지 않는다. 정규화가 불완전하면 `normalized: false` 로
 * 알리고 나머지 필드는 그대로 채운다.
 */
export function analyzePolynomialProfile(ast: MathNode): PolynomialProfile {
  const normalized = normalizeAst(ast);
  const c = classifyExpr(normalized);

  const profile: PolynomialProfile = {
    shape: c.shape,
    mainVariables: [...c.mainVariables],
    parameters: [...c.parameters],
    constants: [...c.constants],
    degree: c.poly?.degree ?? null,
    normalized: normalized.ok,
  };
  if (c.dependent !== undefined) profile.dependent = c.dependent;

  const coefficients = c.poly?.coefficients ? lowerCoefficients(c.poly.coefficients) : undefined;
  if (coefficients !== undefined) return { ...profile, coefficients };
  return profile;
}
