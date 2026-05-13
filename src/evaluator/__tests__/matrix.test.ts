/**
 * E9 행렬·벡터 평가자 — 별도 표면 (Matrix | number | undefined)
 *
 * 메인 evaluator 의 number 계약은 변경 없이, 새 진입점 evaluateMatrixSync / evaluateMatrix 가
 * MatrixNode 가 포함된 식을 인식하고 행렬 산술을 수행한다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../latex/latex-parser';
import { resetLatexIdCounter } from '../../utils/id-generator';
import { evaluateMatrixSync, evaluateMatrix, type Matrix, type MatrixValue } from '..';

beforeEach(() => {
  resetLatexIdCounter();
});

function evM(src: string, bindings: Record<string, number> = {}): MatrixValue | undefined {
  const { ast } = parseLatex(src);
  return evaluateMatrixSync(ast, bindings);
}

function evMCold(src: string, bindings: Record<string, number> = {}): ReturnType<typeof evaluateMatrix> {
  const { ast } = parseLatex(src);
  return evaluateMatrix(ast, bindings);
}

function asMatrix(x: MatrixValue | undefined): Matrix {
  if (x === undefined || typeof x === 'number') {
    throw new Error('expected matrix');
  }
  return x;
}

function eqMatrix(a: Matrix, b: number[][]): void {
  expect(a.rows).toBe(b.length);
  expect(a.cols).toBe(b[0]?.length ?? 0);
  for (let i = 0; i < b.length; i++) {
    for (let j = 0; j < b[0].length; j++) {
      expect(a.data[i][j]).toBeCloseTo(b[i][j], 9);
    }
  }
}

describe('E9 — 단일 행렬 평가', () => {
  it('2x2 행렬 리터럴', () => {
    const m = asMatrix(evM('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}'));
    eqMatrix(m, [[1, 2], [3, 4]]);
  });

  it('열벡터', () => {
    const m = asMatrix(evM('\\begin{pmatrix} 1 \\\\ 2 \\\\ 3 \\end{pmatrix}'));
    eqMatrix(m, [[1], [2], [3]]);
  });

  it('행벡터', () => {
    const m = asMatrix(evM('\\begin{pmatrix} 1 & 2 & 3 \\end{pmatrix}'));
    eqMatrix(m, [[1, 2, 3]]);
  });

  it('식이 든 셀: \\begin{pmatrix} a + 1 & 2 \\\\ 0 & a \\end{pmatrix} with a=5', () => {
    const m = asMatrix(
      evM('\\begin{pmatrix} a + 1 & 2 \\\\ 0 & a \\end{pmatrix}', { a: 5 }),
    );
    eqMatrix(m, [[6, 2], [0, 5]]);
  });
});

describe('E9 — 산술: 덧/뺄/스칼라/곱', () => {
  it('A + B', () => {
    const m = asMatrix(
      evM('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} + \\begin{pmatrix} 5 & 6 \\\\ 7 & 8 \\end{pmatrix}'),
    );
    eqMatrix(m, [[6, 8], [10, 12]]);
  });

  it('A - B', () => {
    const m = asMatrix(
      evM('\\begin{pmatrix} 5 & 6 \\\\ 7 & 8 \\end{pmatrix} - \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}'),
    );
    eqMatrix(m, [[4, 4], [4, 4]]);
  });

  it('스칼라 × 행렬: 2 \\cdot A', () => {
    const m = asMatrix(
      evM('2 \\cdot \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}'),
    );
    eqMatrix(m, [[2, 4], [6, 8]]);
  });

  it('행렬 × 행렬 (정사각)', () => {
    // [[1,2],[3,4]] · [[5,6],[7,8]] = [[19,22],[43,50]]
    const m = asMatrix(
      evM('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\cdot \\begin{pmatrix} 5 & 6 \\\\ 7 & 8 \\end{pmatrix}'),
    );
    eqMatrix(m, [[19, 22], [43, 50]]);
  });

  it('행렬 × 열벡터', () => {
    const m = asMatrix(
      evM('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\cdot \\begin{pmatrix} 5 \\\\ 6 \\end{pmatrix}'),
    );
    eqMatrix(m, [[17], [39]]);
  });

  it('단항 마이너스: -A', () => {
    const m = asMatrix(
      evM('-\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}'),
    );
    eqMatrix(m, [[-1, -2], [-3, -4]]);
  });
});

describe('E9 — 전치·역·행렬식·거듭제곱', () => {
  it('전치: A^T', () => {
    const m = asMatrix(
      evM('\\begin{pmatrix} 1 & 2 & 3 \\\\ 4 & 5 & 6 \\end{pmatrix}^T'),
    );
    eqMatrix(m, [[1, 4], [2, 5], [3, 6]]);
  });

  it('역행렬: A^{-1}', () => {
    // [[4,7],[2,6]] inv = (1/10) [[6,-7],[-2,4]]
    const m = asMatrix(
      evM('\\begin{pmatrix} 4 & 7 \\\\ 2 & 6 \\end{pmatrix}^{-1}'),
    );
    eqMatrix(m, [[0.6, -0.7], [-0.2, 0.4]]);
  });

  it('행렬식: |A| = 1·4 - 2·3 = -2', () => {
    const r = evM('|\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}|');
    expect(typeof r).toBe('number');
    expect(r as number).toBeCloseTo(-2, 9);
  });

  it('단위행렬 거듭제곱: I^3 = I', () => {
    const m = asMatrix(
      evM('\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}^3'),
    );
    eqMatrix(m, [[1, 0], [0, 1]]);
  });

  it('A^0 = I', () => {
    const m = asMatrix(
      evM('\\begin{pmatrix} 2 & 3 \\\\ 1 & 4 \\end{pmatrix}^0'),
    );
    eqMatrix(m, [[1, 0], [0, 1]]);
  });
});

describe('E9 — 도메인 가드', () => {
  it('차원 불일치 덧셈 → domain', () => {
    const r = evMCold('\\begin{pmatrix} 1 & 2 \\end{pmatrix} + \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.reason).toBe('dim-mismatch-add');
    }
  });

  it('곱셈 차원 불일치 → domain', () => {
    // 2x3 · 2x2 → mismatch (a.cols=3 ≠ b.rows=2)
    const r = evMCold('\\begin{pmatrix} 1 & 2 & 3 \\\\ 4 & 5 & 6 \\end{pmatrix} \\cdot \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.reason).toBe('dim-mismatch-mul');
    }
  });

  it('특이행렬 역 → domain (singular)', () => {
    // [[1,2],[2,4]] 특이
    const r = evMCold('\\begin{pmatrix} 1 & 2 \\\\ 2 & 4 \\end{pmatrix}^{-1}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.reason).toBe('singular');
    }
  });

  it('비정사각 행렬식 → domain', () => {
    const r = evMCold('|\\begin{pmatrix} 1 & 2 & 3 \\end{pmatrix}|');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('domain');
      expect(r.detail?.reason).toBe('det-non-square');
    }
  });

  it('스칼라 + 행렬 → unsupported', () => {
    const r = evMCold('1 + \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unsupported');
    }
  });
});

describe('E9 — 미연결 변수 전파', () => {
  it('셀의 미연결 변수: \\begin{pmatrix} a & 0 \\\\ 0 & 1 \\end{pmatrix} → unbound', () => {
    const r = evMCold('\\begin{pmatrix} a & 0 \\\\ 0 & 1 \\end{pmatrix}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe('unbound');
      expect(r.detail?.variable).toBe('a');
    }
  });

  it('핫패스: 미연결 변수 → undefined', () => {
    expect(evM('\\begin{pmatrix} a & 0 \\\\ 0 & 1 \\end{pmatrix}')).toBeUndefined();
  });
});

describe('E9 — 스칼라 식 (호환)', () => {
  it('숫자만 있는 식은 number 로 그대로: 2 + 3 = 5', () => {
    const r = evM('2 + 3');
    expect(r).toBe(5);
  });

  it('스칼라 콜드 패스도 정상 동작: \\frac{1}{2} = 0.5', () => {
    const r = evMCold('\\frac{1}{2}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(0.5);
  });
});

describe('E9 — throw 금지', () => {
  it('모든 비정상 행렬 평가에서 throw 없음', () => {
    const cases = [
      '\\begin{pmatrix} 1 & 2 \\end{pmatrix} + \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix}',
      '\\begin{pmatrix} 1 & 2 \\\\ 2 & 4 \\end{pmatrix}^{-1}',
      '|\\begin{pmatrix} 1 & 2 & 3 \\end{pmatrix}|',
      '\\begin{pmatrix} a & 0 \\\\ 0 & 1 \\end{pmatrix}',
    ];
    for (const src of cases) {
      expect(() => evM(src)).not.toThrow();
      expect(() => evMCold(src)).not.toThrow();
    }
  });
});
