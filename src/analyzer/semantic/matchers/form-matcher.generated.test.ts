/**
 * 형식 매칭 회귀 — **케이스를 손으로 적지 않는다.**
 *
 * `form/index.json` 의 `examples`/`counterExamples` 가 유일한 저작물이고, 이
 * 파일은 거기서 케이스를 유도한다. 형식을 하나 추가하면 positive 와 negative 가
 * 양방향으로 자동 증가한다 — 안전망이 저작 비용 없이 촘촘해진다.
 *
 * `x^2+2x-3=0` 은 `quadratic-expression` 의 example 이자 나머지 7개 형식의
 * negative 가 자동으로 된다. 이 버그의 회귀 방지가 구조에서 나온다.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { parseLatex } from '../../../latex/latex-parser.js';
import { normalizeAst } from '../../canonical/from-ast.js';
import { canonicalKey } from '../../canonical/expr.js';
import { getFormIndex } from '../loader.js';
import { compileForms, matchForm, type CompiledForm } from './form-matcher.js';

const norm = (latex: string) => normalizeAst(parseLatex(latex).ast);
const keyOf = (latex: string) => canonicalKey(norm(latex).root);

let forms: CompiledForm[];
const raw = getFormIndex();

beforeAll(() => {
  forms = compileForms(raw, norm);
});

/** 이 형식 하나만 놓고 매칭되는가 — "최선" 이 아니라 "가능" 을 본다. */
function matchesForm(latex: string, formId: string) {
  const only = forms.filter((f) => f.id === formId);
    return matchForm(norm(latex), only);
}

describe('형식 매칭 — 데이터 무결성', () => {
  it('subsumes 는 실제 포함관계여야 한다', () => {
    // 선언해 놓고 실제로는 포함하지 않으면 N×N 면제가 거짓 면제가 된다.
    const broken: string[] = [];
    for (const f of raw) {
      for (const subId of f.subsumes ?? []) {
        const sub = raw.find((x) => x.id === subId)!;
        for (const ex of sub.examples) {
          if (!matchesForm(ex.latex, f.id)) broken.push(`${f.id} ⊅ ${subId}:"${ex.latex}"`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('모든 형식이 컴파일된다', () => {
    expect(forms.length).toBe(raw.length);
    for (const f of forms) expect(f.shapes.length).toBeGreaterThan(0);
  });

  it('모든 형식이 example 과 counterExample 을 갖는다', () => {
    for (const f of raw) {
      expect(f.examples.length, `${f.id} examples`).toBeGreaterThan(0);
      expect(f.counterExamples.length, `${f.id} counterExamples`).toBeGreaterThan(0);
    }
  });
});

describe('형식 매칭 — positive (example → 자기 형식)', () => {
  const cases = raw.flatMap((f) =>
    f.examples.map((ex) => ({ formId: f.id, latex: ex.latex, slots: ex.slots })),
  );

  it.each(cases)('$formId ← $latex', ({ formId, latex, slots }) => {
    const m = matchesForm(latex, formId);
    expect(m, `${latex} 가 ${formId} 에 매칭되지 않는다`).not.toBeNull();
    // 선언한 바인딩이 실제 바인딩과 일치하는가.
    // formId 만 맞는 것으로는 부족하다 — 계수가 시각화의 입력이다.
    for (const [slot, expected] of Object.entries(slots)) {
      const bound = m!.bindings.get(slot);
      expect(bound, `${formId} 슬롯 ${slot} 미바인딩`).toBeTruthy();
      expect(canonicalKey(bound!), `${formId} 슬롯 ${slot}`).toBe(keyOf(expected));
    }
  });
});

describe('형식 매칭 — negative N×N (example → 다른 형식 아님)', () => {
  it('어떤 example 도 다른 형식에 매칭되지 않는다', () => {
    // 개별 테스트명을 수백 개 만들면 리포터가 마비된다. 실패 목록을 모아
    // 한 번에 단언하면 진단 정보는 그대로 남는다.
    const failures: string[] = [];
    let checked = 0;
    for (const owner of raw) {
      for (const ex of owner.examples) {
        for (const other of raw) {
          if (other.id === owner.id) continue;
          // 진짜 포함관계는 면제한다 — 등가속도 변위는 t 에 대한 이차식이
          // 맞다. 면제는 데이터(`subsumes`)에 선언되어야지 테스트 코드에
          // 예외 분기로 박히면 안 된다.
          if (other.subsumes?.includes(owner.id)) continue;
          checked++;
          if (matchesForm(ex.latex, other.id)) {
            failures.push(`${other.id} ← ${owner.id}:"${ex.latex}"`);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(failures).toEqual([]);
  });
});

describe('형식 매칭 — counterExample', () => {
  it('반례는 자기 형식에 매칭되지 않는다', () => {
    const failures: string[] = [];
    for (const f of raw) {
      for (const ce of f.counterExamples) {
        if (matchesForm(ce, f.id)) failures.push(`${f.id} ← "${ce}"`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('형식 매칭 — 결정성과 모호성', () => {
  it('같은 입력은 항상 같은 결과를 낸다', () => {
    const inputs = raw.flatMap((f) => f.examples.map((e) => e.latex));
    for (const latex of inputs) {
      const first = matchForm(norm(latex), forms);
      for (let i = 0; i < 20; i++) {
        const again = matchForm(norm(latex), forms);
        expect(again?.formId).toBe(first?.formId);
        expect(again?.defaulted).toEqual(first?.defaulted);
      }
    }
  });

  it('example 에 모호성이 남지 않는다', () => {
    // alternates 가 비지 않으면 두 형식이 같은 구체성으로 경쟁한다는 뜻이고,
    // 그것은 데이터 버그다.
    const ambiguous: string[] = [];
    for (const f of raw) {
      for (const ex of f.examples) {
        const m = matchForm(norm(ex.latex), forms);
        if (m && m.alternates.length > 0) {
          ambiguous.push(`"${ex.latex}" → ${m.formId} vs ${m.alternates.join(',')}`);
        }
      }
    }
    expect(ambiguous).toEqual([]);
  });
});

describe('형식 매칭 — 거짓 매칭 방지', () => {
  const NEVER = [
    'y = 5',
    'y = 3x + 1',
    'x = 1',
    '2 + 3',
    '\\digamma^{\\eta} = W^{\\dagger}_{\\iota}',
    'y = ax^2 + bx + c + dx^3',
    'x = 1 = 2',
    '\\int_0^1 x dx',
  ];

  it.each(NEVER)('%s 는 어떤 형식에도 매칭되지 않는다', (latex) => {
    expect(matchForm(norm(latex), forms)).toBeNull();
  });

  it('자유 기호는 심볼에만 묶인다', () => {
    // 임의 서브트리를 받으면 y = (t+1)^2 가 x=(t+1) 로 이차식에 걸린다.
    expect(matchesForm('y = (t+1)^2', 'quadratic-expression')).toBeNull();
  });

  it('관계 연산자가 둘 이상이면 매칭하지 않는다', () => {
    expect(matchForm(norm('x^2 = 1 = 1'), forms)).toBeNull();
  });
});

describe('형식 매칭 — 계수 파생', () => {
  it('곱셈 자리의 누락은 1이다', () => {
    // x^2 는 a·x^2 에서 a=1 이다. optional 과 무관하다.
    const m = matchesForm('x^2 + 2x - 3 = 0', 'quadratic-expression');
    expect(m!.bindings.get('a')).toMatchObject({ kind: 'num', value: 1 });
    expect(m!.defaulted).toContain('a');
  });

  it('덧셈 자리의 누락은 0이다', () => {
    const m = matchesForm('y = -2x^2 + 5', 'quadratic-expression');
    expect(m!.bindings.get('b')).toMatchObject({ kind: 'num', value: 0 });
    expect(m!.bindings.get('a')).toMatchObject({ kind: 'num', value: -2 });
    expect(m!.bindings.get('c')).toMatchObject({ kind: 'num', value: 5 });
  });

  it('음수 계수를 정확히 뽑는다', () => {
    const m = matchesForm('x^2 - 2x - 3 = 0', 'quadratic-expression');
    expect(m!.bindings.get('b')).toMatchObject({ kind: 'num', value: -2 });
  });

  it('잉여 곱셈 인자를 슬롯이 흡수한다', () => {
    // e^{-\lambda t} 의 지수는 mul(λ, t, -1) 인데 패턴은 mul(r, t) 다.
    const m = matchesForm('N = N_0 e^{-\\lambda t}', 'exponential-change');
    expect(canonicalKey(m!.bindings.get('r')!)).toBe(keyOf('-\\lambda'));
  });
});
