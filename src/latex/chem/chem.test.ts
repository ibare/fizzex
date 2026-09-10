/**
 * 화학식(`\ce{...}`) 파싱·직렬화 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../latex-parser.js';
import { astToLatex } from '../ast-to-latex.js';
import { resetLatexIdCounter } from '../../utils/id-generator.js';
import { createChemTokenizer } from './tokenizer.js';
import { preProcess } from '../tolerant/pre-processor.js';
import { StreamTokenizer } from '../streaming/tokenizer.js';
import type { ChemNode, MathNode, ScriptsNode, XArrowNode } from '../../types.js';

/** chem 노드의 본문 자식들 */
function chemChildren(latex: string): MathNode[] {
  const { ast } = parseLatex(latex);
  const chem = ast.children[0] as ChemNode;
  expect(chem.type).toBe('chem');
  const row = chem.content[0];
  return row.type === 'row' ? row.children : chem.content;
}

/** 왕복 */
const roundTrip = (s: string): string => astToLatex(parseLatex(s).ast);

describe('화학식 토크나이저', () => {
  it('화살표를 최장 일치로 끊는다 — <=>> 가 <=> 로 먼저 끊기지 않는다', () => {
    const tk = createChemTokenizer('<=>>', 0);
    const tok = tk.next('body');
    expect(tok.kind).toBe('arrow');
    expect(tok.direction).toBe('equilibriumForward');
    expect(tok.value).toBe('<=>>');
  });

  it('첨자 안에서는 화살표를 찾지 않는다 — - 는 음전하다', () => {
    const tk = createChemTokenizer('-', 0);
    expect(tk.peek('script').kind).toBe('sign');
  });

  it('Vanadium 의 v 를 침전 화살표로 오인하지 않는다', () => {
    const tk = createChemTokenizer('Vanadium', 0);
    const tok = tk.next('body');
    expect(tok.kind).toBe('element');
    expect(tok.value).toBe('Vanadium');
  });

  it('홀로 선 v 만 침전 화살표다', () => {
    const tk = createChemTokenizer('v', 0);
    expect(tk.next('body').kind).toBe('precipitate');
  });

  it('첨자가 뒤따르면 ^ 는 기체 화살표가 아니다', () => {
    const tk = createChemTokenizer('^2', 0);
    expect(tk.next('body').kind).toBe('caret');
  });

  it('공백을 버리지 않는다 — 연속은 하나로 접는다', () => {
    const tk = createChemTokenizer('A  B', 0);
    tk.next('body');
    const space = tk.next('body');
    expect(space.kind).toBe('space');
    expect(space.value).toBe('  ');
  });
});

describe('화학식 파싱', () => {
  beforeEach(() => resetLatexIdCounter());

  it('원소 뒤 숫자를 아래첨자로 붙인다 (H2O)', () => {
    const children = chemChildren('\\ce{H2O}');
    const first = children[0] as ScriptsNode;
    expect(first.type).toBe('scripts');
    expect(first.subscript).toBeDefined();
    expect(children[1].type).toBe('text');
  });

  it('항 시작의 숫자는 계수로 남긴다 (2H2O)', () => {
    const children = chemChildren('\\ce{2H2O}');
    expect(children[0].type).toBe('number');
  });

  it('전하는 아래첨자와 같은 원자에 쌓지 않는다 (SO4^2-)', () => {
    // 한 원자에 담으면 조판이 둘을 같은 x 에 세로로 쌓고(TeX Rule 18e)
    // 아래첨자가 표준보다 더 내려간다. 표준 구현도 첨자마다 원자를 따로 만든다.
    const children = chemChildren('\\ce{SO4^2-}');
    const outer = children.find((c) => c.type === 'scripts') as ScriptsNode;

    // 바깥 겹은 위첨자(전하)만 갖는다
    expect(outer.superscript).toBeDefined();
    expect(outer.subscript).toBeUndefined();

    // 안쪽 겹이 원소와 원자 수를 갖는다
    const inner = outer.base[0] as ScriptsNode;
    expect(inner.type).toBe('scripts');
    expect(inner.subscript).toBeDefined();
    expect(inner.superscript).toBeUndefined();
  });

  it('전하만 있으면 한 원자에 붙인다 (Ca^2+)', () => {
    // 아래첨자가 없으면 쌓일 일이 없다 — 표준과 같은 위치가 나온다
    const children = chemChildren('\\ce{Ca^2+}');
    const scripts = children[0] as ScriptsNode;

    expect(scripts.superscript).toBeDefined();
    expect(scripts.base[0].type).toBe('text');
  });

  it('동위원소의 앞첨자를 읽는다 (^{227}_{90}Th)', () => {
    const children = chemChildren('\\ce{^{227}_{90}Th}');
    const scripts = children[0] as ScriptsNode;
    expect(scripts.leftSuperscript).toBeDefined();
    expect(scripts.leftSubscript).toBeDefined();
    expect(scripts.base.length).toBeGreaterThan(0);
  });

  it('공백이 의미를 갖는다 — H2O (l) 과 H2O(l) 은 다르다', () => {
    const spaced = chemChildren('\\ce{H2O (l)}');
    const tight = chemChildren('\\ce{H2O(l)}');
    expect(spaced.some((c) => c.type === 'space')).toBe(true);
    expect(tight.some((c) => c.type === 'space')).toBe(false);
  });

  it('상태 표기를 괄호 노드로 둔다 — 커서가 안으로 들어갈 수 있다', () => {
    const children = chemChildren('\\ce{(aq)}');
    expect(children[0].type).toBe('paren');
  });

  it('반응 화살표 네 종을 구분한다', () => {
    const dir = (s: string): string => {
      const arrow = chemChildren(s).find((c) => c.type === 'xarrow') as XArrowNode;
      return arrow.direction;
    };
    expect(dir('\\ce{A -> B}')).toBe('right');
    expect(dir('\\ce{A <=> B}')).toBe('equilibrium');
    expect(dir('\\ce{A <=>> B}')).toBe('equilibriumForward');
    expect(dir('\\ce{A <<=> B}')).toBe('equilibriumReverse');
  });

  it('화살표 조건 라벨을 위아래로 나눠 붙인다', () => {
    const arrow = chemChildren('\\ce{A ->[cat][\\Delta] B}').find(
      (c) => c.type === 'xarrow'
    ) as XArrowNode;
    expect(arrow.above.length).toBeGreaterThan(0);
    expect(arrow.below).toBeDefined();
  });

  it('반응식 전체에서 공백은 항 경계에만 남는다', () => {
    const children = chemChildren('\\ce{2H2 + O2 -> 2H2O}');
    // 연산자·화살표 주변 여백은 조판이 넣는다 — AST 에는 남기지 않는다
    expect(children.filter((c) => c.type === 'space')).toHaveLength(0);
    expect(children.filter((c) => c.type === 'operator')).toHaveLength(1);
    expect(children.filter((c) => c.type === 'xarrow')).toHaveLength(1);
  });

  it('닫히지 않은 화학식을 진단한다', () => {
    const { errors } = parseLatex('\\ce{H2O');
    expect(errors.some((e) => e.type === 'incomplete')).toBe(true);
  });

  it('인자 없는 \\ce 를 진단한다', () => {
    const { errors } = parseLatex('\\ce');
    expect(errors.some((e) => e.type === 'invalid_argument')).toBe(true);
  });

  it('결합 표기는 아직 지원하지 않지만 내용을 버리지 않는다', () => {
    const { warnings } = parseLatex('\\ce{A-B}');
    expect(warnings.some((w) => w.type === 'unsupported')).toBe(true);
    expect(chemChildren('\\ce{A-B}').length).toBeGreaterThan(2);
  });

  it('빈 화학식도 노드를 만든다', () => {
    expect(chemChildren('\\ce{}')).toHaveLength(0);
  });
});

describe('화학식 왕복', () => {
  beforeEach(() => resetLatexIdCounter());

  const identical = [
    '\\ce{H2O}',
    '\\ce{2H2O}',
    '\\ce{SO4^2-}',
    '\\ce{Ca^2+}',
    '\\ce{(aq)}',
    '\\ce{H2O (l)}',
    '\\ce{H2O(l)}',
    '\\ce{Ca(OH)2}',
    '\\ce{A -> B}',
    '\\ce{A <=> B}',
    '\\ce{A <=>> B}',
    '\\ce{A <<=> B}',
    '\\ce{A ->[cat] B}',
    '\\ce{^{227}_{90}Th}',
    '\\ce{CuSO4 * 5H2O}',
    '\\ce{BaSO4 v}',
    '\\ce{H2 ^}',
    '\\ce{2H2 + O2 -> 2H2O}',
  ];

  it.each(identical)('%s 는 그대로 돌아온다', (latex) => {
    expect(roundTrip(latex)).toBe(latex);
  });

  const normalized: [input: string, expected: string][] = [
    ['\\ce{H_2O}', '\\ce{H2O}'],
    ['\\ce{SO4^{2-}}', '\\ce{SO4^2-}'],
    ['\\ce{A  +  B}', '\\ce{A + B}'],
    ['\\ce{A->B}', '\\ce{A -> B}'],
    ['\\ce{CuSO4*5H2O}', '\\ce{CuSO4 * 5H2O}'],
  ];

  it.each(normalized)('%s 는 %s 로 수렴하고 그 뒤로 멱등이다', (input, expected) => {
    const once = roundTrip(input);
    expect(once).toBe(expected);
    expect(roundTrip(once)).toBe(once);
  });

  it('화학 표기로 적을 수 없는 내용은 수식 구간으로 보존한다', () => {
    for (const latex of ['\\ce{$x$}', '\\ce{$\\frac{a}{b}$}']) {
      const once = roundTrip(latex);
      expect(once).toBe(latex);
      expect(roundTrip(once)).toBe(once);
    }
  });

  it('명령어의 백슬래시를 잃지 않는다', () => {
    expect(roundTrip('\\ce{\\Delta}')).toBe('\\ce{\\Delta}');
  });
});

describe('화학식 경계 — 전처리·스트리밍', () => {
  it('전처리가 화학식 본문을 건드리지 않는다 (공백 보존)', () => {
    const input = '\\ce{2H2 + O2 -> 2H2O}';
    const { normalized } = preProcess(input, {});
    expect(normalized).toBe(input);
  });

  it('화학식 안의 $ 가 수식 구간을 끊지 않는다', () => {
    const tokenizer = new StreamTokenizer();
    // 기본 옵션은 explicit 구분자(\\[ \\]) 를 쓴다
    const tokens = [...tokenizer.feed('\\[\\ce{A $x$ B}\\]'), ...tokenizer.end()];
    // 안쪽 $ 가 구간을 끊으면 math_start/math_end 가 늘어난다
    expect(tokens.filter((t) => t.type === 'math_start')).toHaveLength(1);
    expect(tokens.filter((t) => t.type === 'math_end')).toHaveLength(1);
    const content = tokens.find((t) => t.type === 'math_content');
    expect(content?.content).toBe('\\ce{A $x$ B}');
  });

  it('청크 경계가 어디서 잘려도 결과가 같다', () => {
    const input = '\\[\\ce{H2O}\\]';
    const whole = (() => {
      const tk = new StreamTokenizer();
      return [...tk.feed(input), ...tk.end()];
    })();

    for (let cut = 1; cut < input.length; cut++) {
      const tk = new StreamTokenizer();
      const split = [
        ...tk.feed(input.slice(0, cut)),
        ...tk.feed(input.slice(cut)),
        ...tk.end(),
      ];
      expect(split.map((t) => t.type)).toEqual(whole.map((t) => t.type));
    }
  });
});

describe('화학식 밖으로 꺼낸 화살표', () => {
  it('가역 화살표는 표준 명령이 없어 harpoon 으로 모인다', () => {
    // chem 안에서는 화학 직렬화기가 <=> 를 지키지만, 밖으로 꺼내면 대응 명령이 없다.
    // 이 붕괴는 회피할 수 없으므로 동작을 고정해 둔다.
    const arrow = chemChildren('\\ce{A <=>> B}').find((c) => c.type === 'xarrow')!;
    expect(astToLatex(arrow)).toContain('xrightleftharpoons');
  });

  it('\\xrightleftharpoons 를 파싱할 수 있다', () => {
    const { ast } = parseLatex('\\xrightleftharpoons{a}');
    const arrow = ast.children[0] as XArrowNode;
    expect(arrow.type).toBe('xarrow');
    expect(arrow.direction).toBe('equilibrium');
  });
});

describe('화학식 전역성 — 표기할 수 없는 내용', () => {
  beforeEach(() => resetLatexIdCounter());

  // 화학 표기에 대응이 없는 노드를 chem 안에 직접 넣어도 버리지 않는다
  const escaped = [
    ['분수', '\\ce{$\\frac{a}{b}$}'],
    ['근호', '\\ce{$\\sqrt{2}$}'],
    ['행렬', '\\ce{$\\begin{pmatrix}1\\\\2\\end{pmatrix}$}'],
    ['첨자 붙은 변수', '\\ce{$x_i^2$}'],
  ] as const;

  it.each(escaped)('%s 는 수식 구간으로 보존되고 멱등이다', (_label, latex) => {
    const once = roundTrip(latex);
    expect(once).toContain('\\ce{');
    expect(once).toContain('$');
    expect(roundTrip(once)).toBe(once);
  });

  it('보존된 내용이 실제로 살아 있다 — 빈 껍데기가 아니다', () => {
    const children = chemChildren('\\ce{$\\frac{a}{b}$}');
    expect(children.some((c) => c.type === 'frac')).toBe(true);
  });
});
