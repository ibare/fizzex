/**
 * 정규화 IR — MathNode → ExprNode.
 *
 * 검증 축 셋:
 *   1. 평평한 시퀀스가 올바른 식 트리로 세워지는가 (암묵적 곱·우선순위·관계 연산자)
 *   2. row 래핑 3경로(파서 / node-factory / editor)가 동일 IR 로 수렴하는가
 *   3. 서로 다른 대상이 서로 다른 canonicalKey 를 갖는가 (거짓 동등성 방지)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser.js';
import { resetLatexIdCounter } from '../../utils/id-generator.js';
import * as nf from '../../latex/node-factory.js';
import { createPower, createNumber, createVariable, createOperator } from '../../editor.js';
import { normalizeAst, flattenSequence } from './from-ast.js';
import { canonicalKey } from './expr.js';

beforeEach(() => {
  resetLatexIdCounter();
});

const key = (latex: string): string => canonicalKey(normalizeAst(parseLatex(latex).ast).root);
const norm = (latex: string) => normalizeAst(parseLatex(latex).ast);

describe('정규화 IR — 식 트리 구축', () => {
  it('등호가 좌·우변을 가른다', () => {
    expect(key('a^2 + b^2 = c^2')).toBe(
      'rel=(add(pow(sym:a,num:2),pow(sym:b,num:2)),pow(sym:c,num:2))',
    );
  });

  it('암묵적 곱을 해소하고 상수항을 뒤로 민다', () => {
    // 2x 는 파서에서 인접 배치일 뿐 곱셈 노드가 없다.
    expect(key('x^2 + 2x - 3 = 0')).toBe(
      'rel=(add(mul(sym:x,num:2),pow(sym:x,num:2),num:-3),num:0)',
    );
  });

  it('뺄셈을 add + 곱셈으로 정규화하고 상수는 부호를 값으로 흡수한다', () => {
    expect(key('x - 3')).toBe('add(sym:x,num:-3)');
    expect(key('x - y')).toBe('add(mul(sym:y,num:-1),sym:x)');
  });

  it('부호를 곱셈으로 흡수해 표기 차이를 없앤다', () => {
    // 별도 neg 노드로 두면 -x^2 와 (-1)x^2 가 다른 키가 되고,
    // x^2 - 2x 의 -2x 항이 mul 이 아니라 별도 노드가 되어 곱셈 패턴에 안 붙는다.
    expect(key('-2x')).toBe(key('(-2)x'));
    expect(key('-x^2 + 3')).toBe(key('(-1)x^2 + 3'));
    expect(key('x - 2x')).toBe(key('x + (-2)x'));
    expect(key('x^2 - 2x - 3')).toBe('add(mul(sym:x,num:-2),pow(sym:x,num:2),num:-3)');
  });

  it('교환법칙 위치의 상수를 접는다', () => {
    expect(key('2 + 3 + x')).toBe('add(sym:x,num:5)');
    expect(key('2 \\cdot 3 \\cdot x')).toBe('mul(sym:x,num:6)');
  });

  it('교환법칙 피연산자는 정준 순서로 정렬된다', () => {
    expect(key('a + b')).toBe(key('b + a'));
    expect(key('a b')).toBe(key('b a'));
  });

  it('괄호의 그룹핑이 우선순위로 흡수된다', () => {
    expect(key('(a + b) c')).toBe('mul(add(sym:a,sym:b),sym:c)');
    expect(key('a + b c')).toBe('add(mul(sym:b,sym:c),sym:a)');
  });

  it('아래첨자 변수를 단일 심볼로 읽는다', () => {
    expect(key('v_0')).toBe('sym:v_0');
    expect(key('s = v_0 t + \\frac{1}{2}at^2')).toContain('sym:v_0');
  });

  it('관계 연산자 2개 이상이면 relationCount 로 드러난다', () => {
    expect(norm('x = 1').relationCount).toBe(1);
    expect(norm('x = 1 = 2').relationCount).toBe(2);
    expect(norm('x + 1').relationCount).toBe(0);
  });

  it('문자열로 저장된 변수도 IR 에 들어온다', () => {
    // integral.differential / limit.variable 은 MathNode 가 아니라 문자열이라
    // 자식 순회로는 잡히지 않는다.
    expect(key('\\int_0^1 x dx')).toContain('sym:x');
    expect(key('\\lim_{h \\to 0} h')).toContain('sym:h');
  });
});

describe('정규화 IR — row 래핑 3경로 수렴', () => {
  it('파서 / node-factory / editor 가 같은 IR 을 낸다', () => {
    // 파서와 editor 는 지수를 [RowNode] 로 감싸고 node-factory 는 감싸지 않는다.
    const fromParser = canonicalKey(normalizeAst(parseLatex('x^2').ast).root);
    const fromFactory = canonicalKey(
      normalizeAst(nf.power([nf.variable('x')], [nf.num('2')])).root,
    );
    const fromEditor = canonicalKey(
      normalizeAst(createPower([createVariable('x')], [createNumber('2')])).root,
    );
    expect(fromFactory).toBe(fromParser);
    expect(fromEditor).toBe(fromParser);
    expect(fromParser).toBe('pow(sym:x,num:2)');
  });

  it('flattenSequence 는 원본을 변형하지 않는다', () => {
    const children = [createVariable('a'), createOperator('+'), createVariable('b')];
    const snapshot = [...children];
    const flat = flattenSequence(children);
    expect(children).toEqual(snapshot);
    expect(flat).not.toBe(children);
  });

  it('표시 전용 space 는 시퀀스에서 제거된다', () => {
    // 남겨두면 토크나이저가 피연산자로 보고 암묵적 곱을 삽입한다.
    expect(key('a \\, b')).toBe(key('ab'));
    expect(key('a \\quad b')).toBe(key('ab'));
  });
});

describe('정규화 IR — 거짓 동등성 방지', () => {
  it('binom 은 분수가 아니다', () => {
    // \binom{n}{k} 도 FracNode 로 파싱된다. div 로 매핑하면 이항계수가 나눗셈이 된다.
    expect(key('\\binom{n}{k}')).toBe('call:binom(sym:n,sym:k)');
    expect(key('\\frac{n}{k}')).toBe('div(sym:n,sym:k)');
    expect(key('\\binom{n}{k}')).not.toBe(key('\\frac{n}{k}'));
  });

  it('악센트 종류를 구분한다', () => {
    const keys = ['\\vec{v}', '\\hat{v}', '\\bar{v}', 'v'].map(key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('행렬과 행렬식을 구분한다', () => {
    const m = key('\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}');
    const d = key('\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}');
    expect(m).not.toBe(d);
  });

  it('행렬 셀 경계가 붕괴하지 않는다', () => {
    // rows 에 flattenSequence 를 적용하면 한 행의 셀들이 곱으로 병합된다.
    expect(key('\\begin{bmatrix} a & b \\end{bmatrix}')).not.toContain('mul');
  });

  it('행렬 행 경계가 붕괴하지 않는다', () => {
    // 셀만 펼치면 2×2 와 1×4 가 같은 키가 된다.
    const m2x2 = key('\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}');
    const m1x4 = key('\\begin{bmatrix} a & b & c & d \\end{bmatrix}');
    expect(m2x2).not.toBe(m1x4);
  });

  it('환경의 표시 변형을 구분한다', () => {
    // small / isInline / colLines 는 자식이 아닌 스칼라 필드라 순회로 안 잡힌다.
    expect(key('\\begin{matrix} a \\end{matrix}')).not.toBe(
      key('\\begin{smallmatrix} a \\end{smallmatrix}'),
    );
    expect(key('\\begin{array}{|c|} a \\end{array}')).not.toBe(
      key('\\begin{array}{c} a \\end{array}'),
    );
  });

  it('자유 텍스트가 구조 키를 위조하지 못한다', () => {
    // 이스케이프하지 않으면 `(`/`,`/`)` 가 구조 문법으로 읽힌다.
    // 따옴표로 감싸는 것 자체가 경계를 만든다.
    expect(key('\\text{a,b)}')).toContain('text:"a,b)"');
    // 따옴표를 포함한 내용은 이스케이프된다.
    expect(key('\\text{a"b}')).toContain('\\"');
  });

  it('구간·집합 괄호는 통과시키지 않는다', () => {
    expect(key('[a + b]')).not.toBe(key('(a + b)'));
  });

  it('적분 종류를 구분한다', () => {
    expect(key('\\int x dx')).not.toBe(key('\\oint x dx'));
  });
});

describe('정규화 IR — throw 금지', () => {
  it('어떤 입력에도 예외를 던지지 않는다', () => {
    const cases = [
      '',
      '\\digamma^{\\eta} = W^{\\dagger}_{\\iota}',
      '\\frac{}{}',
      'x = 1 \\pm 2',
      '\\begin{pmatrix} \\end{pmatrix}',
      '\\textsterling',
      '+ + +',
      '\\left\\lfloor \\bot \\right\\rfloor',
    ];
    for (const src of cases) {
      expect(() => normalizeAst(parseLatex(src).ast)).not.toThrow();
      const r = normalizeAst(parseLatex(src).ast);
      expect(r.root).toBeTruthy();
    }
  });

  it('모델링 못 한 입력은 ok:false 로 드러난다', () => {
    expect(norm('x = 1 \\pm 2').ok).toBe(false);
    expect(norm('a^2 + b^2 = c^2').ok).toBe(true);
  });

  it('hasOpaque 가 모델링 밖 구조를 알린다', () => {
    expect(norm('a^2 + b^2 = c^2').hasOpaque).toBe(false);
    expect(norm('\\int_0^1 x dx').hasOpaque).toBe(true);
  });
});

describe('정규화 IR — provenance', () => {
  // canonicalKey 는 src 를 무시하므로 키 테스트로는 회귀가 잡히지 않는다.
  it('leaf 는 원본 노드 id 를 싣는다', () => {
    const { ast } = parseLatex('x');
    const r = normalizeAst(ast);
    expect(r.root.src.length).toBeGreaterThan(0);
  });

  it('합성 노드는 자식들의 id 를 합친다', () => {
    // 암묵적 곱으로 생긴 mul 에는 대응하는 MathNode 가 없다.
    const r = normalizeAst(parseLatex('2x').ast);
    expect(r.root.kind).toBe('app');
    expect(r.root.src.length).toBeGreaterThanOrEqual(2);
  });
});
