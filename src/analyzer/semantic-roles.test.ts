import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex/latex-parser.js';
import { resetLatexIdCounter } from '../utils/id-generator.js';
import {
  getSemanticMeaning,
  buildAstAncestorMap,
  buildSemanticMap,
  containsVariable,
} from './semantic-roles.js';
import type { MathNode } from '../types.js';

/** ID로 AST 노드 찾기 */
function findNode(node: MathNode, predicate: (n: MathNode) => boolean): MathNode | null {
  if (predicate(node)) return node;
  for (const children of getChildArrays(node)) {
    for (const child of children) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
  }
  return null;
}

function getChildArrays(node: MathNode): MathNode[][] {
  switch (node.type) {
    case 'root': case 'row': return [node.children];
    case 'frac': return [node.numerator, node.denominator];
    case 'power': return [node.base, node.exponent];
    case 'subscript': return [node.base, node.subscript];
    case 'sqrt': return node.index ? [node.content, node.index] : [node.content];
    case 'paren': case 'abs': case 'overline': case 'accent': case 'cancel': return [node.content];
    case 'func': return [node.argument];
    case 'integral': {
      const a: MathNode[][] = [node.integrand];
      if (node.lower) a.push(node.lower);
      if (node.upper) a.push(node.upper);
      return a;
    }
    case 'sum': case 'product': return [node.lower, node.upper, node.body];
    case 'limit': return [node.approach, node.body];
    case 'overset': return [node.base, node.annotation];
    case 'xarrow': return node.below ? [node.above, node.below] : [node.above];
    case 'matrix': case 'align': case 'cases': case 'array': return node.rows;
    case 'gather': return [node.rows];
    case 'opaque': return node.args;
    default: return [];
  }
}

describe('Semantic Roles', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('containsVariable', () => {
    it('변수 노드를 감지한다', () => {
      const { ast } = parseLatex('x');
      const varNode = findNode(ast, n => n.type === 'variable');
      expect(varNode).not.toBeNull();
      expect(containsVariable(varNode!)).toBe(true);
    });

    it('숫자 노드는 변수가 아니다', () => {
      const { ast } = parseLatex('42');
      const numNode = findNode(ast, n => n.type === 'number');
      expect(numNode).not.toBeNull();
      expect(containsVariable(numNode!)).toBe(false);
    });

    it('분수 안의 변수를 감지한다', () => {
      const { ast } = parseLatex('\\frac{x}{2}');
      const fracNode = findNode(ast, n => n.type === 'frac');
      expect(fracNode).not.toBeNull();
      expect(containsVariable(fracNode!)).toBe(true);
    });
  });

  describe('buildAstAncestorMap', () => {
    it('루트 노드의 조상은 비어있다', () => {
      const { ast } = parseLatex('x + 1');
      const map = buildAstAncestorMap(ast);
      expect(map.get(ast.id)).toEqual([]);
    });

    it('분수의 분자 노드는 조상에 frac(numerator)을 가진다', () => {
      const { ast } = parseLatex('\\frac{x}{2}');
      const map = buildAstAncestorMap(ast);
      const varNode = findNode(ast, n => n.type === 'variable' && n.name === 'x');
      expect(varNode).not.toBeNull();

      const ancestors = map.get(varNode!.id)!;
      const fracAncestor = ancestors.find(a => a.node.type === 'frac');
      expect(fracAncestor).toBeDefined();
      expect(fracAncestor!.childPosition).toBe('numerator');
    });

    it('분수의 분모 노드는 조상에 frac(denominator)을 가진다', () => {
      const { ast } = parseLatex('\\frac{1}{x}');
      const map = buildAstAncestorMap(ast);
      const varNode = findNode(ast, n => n.type === 'variable' && n.name === 'x');
      expect(varNode).not.toBeNull();

      const ancestors = map.get(varNode!.id)!;
      const fracAncestor = ancestors.find(a => a.node.type === 'frac');
      expect(fracAncestor).toBeDefined();
      expect(fracAncestor!.childPosition).toBe('denominator');
    });

    it('거듭제곱의 지수 노드는 power(exponent) 조상을 가진다', () => {
      const { ast } = parseLatex('x^2');
      const map = buildAstAncestorMap(ast);
      const numNode = findNode(ast, n => n.type === 'number' && n.value === '2');
      expect(numNode).not.toBeNull();

      const ancestors = map.get(numNode!.id)!;
      const powerAncestor = ancestors.find(a => a.node.type === 'power');
      expect(powerAncestor).toBeDefined();
      expect(powerAncestor!.childPosition).toBe('exponent');
    });
  });

  describe('getSemanticMeaning — Layer 1', () => {
    it('분수 분자의 의미를 반환한다', () => {
      const { ast } = parseLatex('\\frac{x}{2}');
      const map = buildAstAncestorMap(ast);
      const varNode = findNode(ast, n => n.type === 'variable' && n.name === 'x')!;
      const result = getSemanticMeaning(varNode, map.get(varNode.id)!);

      expect(result.role).toBe('분자');
      expect(result.layer).toBe('layer1');
      // 변수 포함 refinement
      expect(result.description).toContain('변수');
    });

    it('분수 분모의 의미를 반환한다', () => {
      const { ast } = parseLatex('\\frac{1}{2}');
      const map = buildAstAncestorMap(ast);
      const numNode = findNode(ast, n => n.type === 'number' && n.value === '2')!;
      const result = getSemanticMeaning(numNode, map.get(numNode.id)!);

      expect(result.role).toBe('분모');
      expect(result.layer).toBe('layer1');
      expect(result.description).toContain('상수');
    });

    it('거듭제곱 지수 2를 제곱으로 설명한다', () => {
      const { ast } = parseLatex('x^2');
      const map = buildAstAncestorMap(ast);
      const numNode = findNode(ast, n => n.type === 'number' && n.value === '2')!;
      const result = getSemanticMeaning(numNode, map.get(numNode.id)!);

      expect(result.role).toBe('지수');
      expect(result.description).toContain('제곱');
    });

    it('시그마의 일반항 의미를 반환한다', () => {
      const { ast } = parseLatex('\\sum_{n=1}^{10} n');
      const map = buildAstAncestorMap(ast);
      // sum.body에서 변수 n 찾기
      const sumNode = findNode(ast, n => n.type === 'sum');
      expect(sumNode).not.toBeNull();
      if (sumNode && sumNode.type === 'sum') {
        const bodyVar = sumNode.body.find(n => n.type === 'variable');
        if (bodyVar) {
          const result = getSemanticMeaning(bodyVar, map.get(bodyVar.id)!);
          expect(result.role).toBe('일반항');
        }
      }
    });

    it('적분의 피적분함수 의미를 반환한다', () => {
      const { ast } = parseLatex('\\int_0^1 x^2 \\, dx');
      const map = buildAstAncestorMap(ast);
      // integral 노드 찾기
      const integralNode = findNode(ast, n => n.type === 'integral');
      expect(integralNode).not.toBeNull();
      if (integralNode && integralNode.type === 'integral') {
        // integrand 중 power 노드 찾기
        const powerInIntegrand = integralNode.integrand.find(n => n.type === 'power');
        if (powerInIntegrand) {
          const result = getSemanticMeaning(powerInIntegrand, map.get(powerInIntegrand.id)!);
          expect(result.role).toBe('피적분함수');
        }
      }
    });

    it('함수 인자의 의미를 반환한다', () => {
      const { ast } = parseLatex('\\sin(x)');
      const map = buildAstAncestorMap(ast);
      const funcNode = findNode(ast, n => n.type === 'func');
      expect(funcNode).not.toBeNull();
      if (funcNode && funcNode.type === 'func') {
        const argVar = funcNode.argument.find(n => n.type === 'variable' || n.type === 'paren');
        if (argVar) {
          const result = getSemanticMeaning(argVar, map.get(argVar.id)!);
          // func의 argument 또는 paren의 content
          expect(['catalog', 'layer2', 'layer1', 'fallback']).toContain(result.layer);
        }
      }
    });
  });

  describe('getSemanticMeaning — Layer 2', () => {
    it('급수 분모의 거듭제곱 지수를 p-급수로 설명한다', () => {
      const { ast } = parseLatex('\\sum_{n=1}^{\\infty} \\frac{1}{n^2}');
      const map = buildAstAncestorMap(ast);

      // n^2의 2를 찾기: sum.body > frac.denominator > power.exponent
      const sumNode = findNode(ast, n => n.type === 'sum');
      if (sumNode && sumNode.type === 'sum') {
        const fracInBody = sumNode.body.find(n => n.type === 'frac');
        if (fracInBody && fracInBody.type === 'frac') {
          const powerInDenom = fracInBody.denominator.find(n => n.type === 'power');
          if (powerInDenom && powerInDenom.type === 'power') {
            const exp = powerInDenom.exponent[0];
            if (exp) {
              const result = getSemanticMeaning(exp, map.get(exp.id)!);
              expect(result.layer).toBe('layer2');
              expect(result.description).toContain('p-급수');
            }
          }
        }
      }
    });

    it('급수 분모를 조합 의미로 설명한다', () => {
      const { ast } = parseLatex('\\sum_{n=1}^{\\infty} \\frac{1}{n}');
      const map = buildAstAncestorMap(ast);

      const sumNode = findNode(ast, n => n.type === 'sum');
      if (sumNode && sumNode.type === 'sum') {
        const fracInBody = sumNode.body.find(n => n.type === 'frac');
        if (fracInBody && fracInBody.type === 'frac') {
          const denomVar = fracInBody.denominator[0];
          if (denomVar) {
            const result = getSemanticMeaning(denomVar, map.get(denomVar.id)!);
            expect(result.layer).toBe('layer2');
            expect(result.description).toContain('급수');
          }
        }
      }
    });
  });

  describe('getSemanticMeaning — 폴백', () => {
    it('최상위 숫자 노드에 기본 설명을 반환한다', () => {
      const { ast } = parseLatex('5');
      const map = buildAstAncestorMap(ast);
      const numNode = findNode(ast, n => n.type === 'number')!;
      const result = getSemanticMeaning(numNode, map.get(numNode.id)!);

      expect(result.role).toBe('숫자');
      expect(result.layer).toBe('fallback');
      expect(result.description).toContain('5');
    });

    it('최상위 변수 노드에 기본 설명을 반환한다', () => {
      const { ast } = parseLatex('x');
      const map = buildAstAncestorMap(ast);
      const varNode = findNode(ast, n => n.type === 'variable')!;
      const result = getSemanticMeaning(varNode, map.get(varNode.id)!);

      expect(result.role).toBe('변수');
      expect(result.layer).toBe('fallback');
      expect(result.description).toContain('x');
    });

    it('자연상수 e에 특별 설명을 반환한다', () => {
      const { ast } = parseLatex('e');
      const map = buildAstAncestorMap(ast);
      const varNode = findNode(ast, n => n.type === 'variable' && n.name === 'e')!;
      const result = getSemanticMeaning(varNode, map.get(varNode.id)!);

      expect(result.description).toContain('자연상수');
    });

    it('연산자에 설명을 반환한다', () => {
      const { ast } = parseLatex('x + y');
      const map = buildAstAncestorMap(ast);
      const opNode = findNode(ast, n => n.type === 'operator' && n.operator === '+')!;
      const result = getSemanticMeaning(opNode, map.get(opNode.id)!);

      expect(result.role).toBe('연산자');
      expect(result.description).toContain('덧셈');
    });

    it('등호 연산자에 설명을 반환한다', () => {
      const { ast } = parseLatex('x = 1');
      const map = buildAstAncestorMap(ast);
      const opNode = findNode(ast, n => n.type === 'operator' && n.operator === '=')!;
      const result = getSemanticMeaning(opNode, map.get(opNode.id)!);

      expect(result.description).toContain('등호');
    });
  });

  describe('buildSemanticMap', () => {
    it('AST의 모든 노드에 대해 semantic 결과를 생성한다', () => {
      const { ast } = parseLatex('\\frac{x}{2}');
      const semanticMap = buildSemanticMap(ast);

      // 최소한 root, frac, x, 2 노드에 대한 결과가 있어야 함
      expect(semanticMap.size).toBeGreaterThanOrEqual(4);

      // frac 노드
      const fracNode = findNode(ast, n => n.type === 'frac')!;
      expect(semanticMap.has(fracNode.id)).toBe(true);

      // x 변수 (분자)
      const varNode = findNode(ast, n => n.type === 'variable')!;
      const varSemantic = semanticMap.get(varNode.id)!;
      expect(varSemantic.role).toBe('분자');
    });

    it('복잡한 수식에서도 모든 노드를 커버한다', () => {
      const { ast } = parseLatex('\\sum_{n=1}^{\\infty} \\frac{1}{n^2}');
      const semanticMap = buildSemanticMap(ast);

      // 모든 노드에 대해 결과가 있는지 확인
      expect(semanticMap.size).toBeGreaterThan(5);

      // 모든 결과는 유효한 SemanticResult
      for (const [, result] of semanticMap) {
        expect(result).toHaveProperty('role');
        expect(result).toHaveProperty('description');
        expect(result).toHaveProperty('layer');
        expect(typeof result.role).toBe('string');
        expect(typeof result.description).toBe('string');
      }
    });
  });

  describe('카탈로그 매칭', () => {
    it('E=mc^2를 질량-에너지 등가 원리로 인식한다', () => {
      const { ast } = parseLatex('E=mc^2');
      const semanticMap = buildSemanticMap(ast);
      const rootResult = semanticMap.get(ast.id)!;

      expect(rootResult.catalogId).toBe('mass-energy');
      expect(rootResult.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('F=ma를 뉴턴의 운동 제2법칙으로 인식한다', () => {
      const { ast } = parseLatex('F=ma');
      const semanticMap = buildSemanticMap(ast);
      const rootResult = semanticMap.get(ast.id)!;

      expect(rootResult.catalogId).toBe('newton-second');
      expect(rootResult.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('단순한 수식 x+1에는 카탈로그 매칭이 없다', () => {
      const { ast } = parseLatex('x+1');
      const semanticMap = buildSemanticMap(ast);
      const rootResult = semanticMap.get(ast.id)!;

      expect(rootResult.catalogId).toBeUndefined();
    });

    it('카탈로그 매칭 시 요소에 풍부한 의미를 부여한다', () => {
      const { ast } = parseLatex('E=mc^2');
      const semanticMap = buildSemanticMap(ast);

      // E 변수 → 에너지 역할
      const eNode = findNode(ast, n => n.type === 'variable' && n.name === 'E');
      expect(eNode).not.toBeNull();
      const eSemantic = semanticMap.get(eNode!.id)!;
      expect(eSemantic.layer).toBe('catalog');
      expect(eSemantic.role).toBe('에너지');

      // m 변수 → 질량 역할
      const mNode = findNode(ast, n => n.type === 'variable' && n.name === 'm');
      expect(mNode).not.toBeNull();
      const mSemantic = semanticMap.get(mNode!.id)!;
      expect(mSemantic.layer).toBe('catalog');
      expect(mSemantic.role).toBe('질량');
    });

    it('카탈로그 매칭에서 복합 키(power 노드)도 매핑한다', () => {
      const { ast } = parseLatex('E=mc^2');
      const semanticMap = buildSemanticMap(ast);

      // c^2 power 노드 → 광속의 제곱
      const powerNode = findNode(ast, n => n.type === 'power');
      expect(powerNode).not.toBeNull();
      const powerSemantic = semanticMap.get(powerNode!.id)!;
      expect(powerSemantic.layer).toBe('catalog');
      expect(powerSemantic.role).toBe('광속의 제곱');
    });

    it('exact 패턴이 structural 패턴보다 높은 confidence를 가진다', () => {
      // E=mc^2는 exact 패턴
      const { ast: ast1 } = parseLatex('E=mc^2');
      const map1 = buildSemanticMap(ast1);
      const root1 = map1.get(ast1.id)!;

      expect(root1.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('카탈로그 미매칭 요소는 기존 레이어로 폴백한다', () => {
      const { ast } = parseLatex('E=mc^2');
      const semanticMap = buildSemanticMap(ast);

      // = 연산자는 카탈로그 elementMeanings에 없으므로 폴백
      const eqNode = findNode(ast, n => n.type === 'operator' && n.operator === '=');
      expect(eqNode).not.toBeNull();
      const eqSemantic = semanticMap.get(eqNode!.id)!;
      expect(eqSemantic.layer).not.toBe('catalog');
    });

    it('SemanticResult에 catalogId와 confidence가 포함된다', () => {
      const { ast } = parseLatex('F=ma');
      const semanticMap = buildSemanticMap(ast);

      // F 변수 (catalog 레이어)
      const fNode = findNode(ast, n => n.type === 'variable' && n.name === 'F');
      expect(fNode).not.toBeNull();
      const fSemantic = semanticMap.get(fNode!.id)!;

      expect(fSemantic.catalogId).toBe('newton-second');
      expect(fSemantic.confidence).toBeDefined();
      expect(typeof fSemantic.confidence).toBe('number');
    });
  });

  describe('특수 노드 타입', () => {
    it('절댓값 내용에 적절한 역할을 부여한다', () => {
      const { ast } = parseLatex('|x|');
      const map = buildAstAncestorMap(ast);
      const absNode = findNode(ast, n => n.type === 'abs');
      if (absNode && absNode.type === 'abs') {
        const content = absNode.content[0];
        if (content) {
          const result = getSemanticMeaning(content, map.get(content.id)!);
          expect(result.role).toBe('절댓값 대상');
        }
      }
    });

    it('제곱근 내용에 피근호수 역할을 부여한다', () => {
      const { ast } = parseLatex('\\sqrt{x}');
      const map = buildAstAncestorMap(ast);
      const sqrtNode = findNode(ast, n => n.type === 'sqrt');
      if (sqrtNode && sqrtNode.type === 'sqrt') {
        const content = sqrtNode.content[0];
        if (content) {
          const result = getSemanticMeaning(content, map.get(content.id)!);
          expect(result.role).toBe('피근호수');
        }
      }
    });

    it('행렬 성분에 적절한 역할을 부여한다', () => {
      const { ast } = parseLatex('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}');
      const map = buildAstAncestorMap(ast);
      const matrixNode = findNode(ast, n => n.type === 'matrix');
      if (matrixNode && matrixNode.type === 'matrix') {
        const firstCell = matrixNode.rows[0]?.[0];
        if (firstCell) {
          const result = getSemanticMeaning(firstCell, map.get(firstCell.id)!);
          expect(result.role).toBe('행렬 성분');
        }
      }
    });
  });
});
