/**
 * Fizzex 기본 라벨 (영어)
 *
 * 호스트에서 제공하지 않은 키는 이 값으로 fallback
 */

import type { FizzexLabels } from './types.js';

export const defaultLabels: FizzexLabels = {
  placeholder: 'Enter formula...',
  debugToggle: 'Toggle debug mode',
  structureViewer: 'View formula structure',
  showMore: 'More...',
  showLess: 'Less',
  showAll: 'All formulas',

  keyboard: {
    move: '↑↓ Navigate',
    select: 'Enter Select',
    close: 'Esc Close',
  },

  categories: {
    operator: 'Operator',
    structure: 'Structure',
    function: 'Function',
    symbol: 'Symbol',
    calculus: 'Calculus',
  },

  suggestions: {
    // 미적분 (Calculus)
    integral: {
      label: 'Integral',
      description: 'Definite/Indefinite integral',
    },
    sum: {
      label: 'Sigma',
      description: 'Summation',
    },
    product: {
      label: 'Product',
      description: 'Product notation',
    },
    limit: {
      label: 'Limit',
      description: 'Limit value',
    },

    // 구조 - 키보드 입력 불가 (Structure - No keyboard input)
    sqrt: {
      label: 'Square root',
      description: 'Root',
    },

    // 기호 (Symbols)
    pi: {
      label: 'Pi',
    },
    infinity: {
      label: 'Infinity',
    },
    alpha: {
      label: 'Alpha',
    },
    beta: {
      label: 'Beta',
    },
    theta: {
      label: 'Theta',
    },
    delta: {
      label: 'Delta',
    },
    lambda: {
      label: 'Lambda',
    },
    mu: {
      label: 'Mu',
    },
    epsilon: {
      label: 'Epsilon',
    },
    gamma: {
      label: 'Gamma',
    },
    omega: {
      label: 'Omega',
    },
    phi: {
      label: 'Phi',
    },
    psi: {
      label: 'Psi',
    },
    xi: {
      label: 'Xi',
    },
    nabla: {
      label: 'Nabla',
      description: 'Gradient',
    },
    partial: {
      label: 'Partial',
      description: 'Partial derivative',
    },
    transpose: {
      label: 'Transpose',
    },
    cdot: {
      label: 'Dot',
      description: 'Dot product',
    },
    parallel: {
      label: 'Parallel',
      description: 'Parallel / Norm',
    },
    factorial: {
      label: 'Factorial',
      description: 'n!',
    },

    // mathbb 집합 기호 (Number Sets)
    natural: {
      label: 'Natural',
      description: 'Natural numbers',
    },
    integer: {
      label: 'Integer',
      description: 'Integers',
    },
    rational: {
      label: 'Rational',
      description: 'Rational numbers',
    },
    real: {
      label: 'Real',
      description: 'Real numbers',
    },
    complex: {
      label: 'Complex',
      description: 'Complex numbers',
    },

    // mathcal 스크립트 (Script Letters)
    fourier: {
      label: 'Fourier',
      description: 'Fourier transform',
    },
    laplace: {
      label: 'Laplace',
      description: 'Laplace transform',
    },
    hilbert: {
      label: 'Hilbert',
      description: 'Hilbert space',
    },

    // 함수 (Functions)
    sin: {
      label: 'sin',
    },
    cos: {
      label: 'cos',
    },
    tan: {
      label: 'tan',
    },
    log: {
      label: 'log',
    },
    ln: {
      label: 'ln',
    },
    det: {
      label: 'det',
      description: 'Determinant',
    },
    tr: {
      label: 'tr',
      description: 'Trace',
    },

    // 구조 - 단축키 비직관적 (Structure - Non-intuitive shortcuts)
    frac: {
      label: 'Fraction',
      description: 'Fraction form',
    },
    power: {
      label: 'Power',
      description: 'Superscript (exponent)',
    },
    subscript: {
      label: 'Subscript',
      description: 'Subscript (index)',
    },

    // 구조 - 단축키 직관적 (Structure - Intuitive shortcuts)
    paren_round: {
      label: 'Parentheses',
    },
    paren_square: {
      label: 'Brackets',
    },
    abs: {
      label: 'Absolute',
    },

    // 연산자 - 키보드 입력 어려움 (Operators - Hard to type)
    leq: {
      label: 'Less or equal',
    },
    geq: {
      label: 'Greater or equal',
    },

    // 연산자 - 직접 타이핑 가능 (Operators - Direct typing)
    add: {
      label: 'Add',
    },
    subtract: {
      label: 'Subtract',
    },
    multiply: {
      label: 'Multiply',
    },
    divide_op: {
      label: 'Divide',
    },
    equals: {
      label: 'Equals',
    },
    less_than: {
      label: 'Less than',
    },
    greater_than: {
      label: 'Greater than',
    },
  },
};
