export interface ExampleItem {
  label: string;
  latex: string;
}

export interface ExampleCategory {
  key: string;
  items: ExampleItem[];
}

export const categories: ExampleCategory[] = [
  {
    key: 'polynomial',
    items: [
      { label: 'Quadratic equation', latex: 'x^2 + 2x - 3 = 0' },
      { label: 'Cubic polynomial', latex: 'x^3 - 6x^2 + 11x - 6' },
      { label: 'Binomial expansion', latex: '(a + b)^3 = a^3 + 3a^2b + 3ab^2 + b^3' },
      { label: 'Vieta\'s formulas', latex: 'x_1 + x_2 = -\\frac{b}{a}, \\quad x_1 x_2 = \\frac{c}{a}' },
    ],
  },
  {
    key: 'trigonometric',
    items: [
      { label: 'Pythagorean identity', latex: '\\sin^2\\theta + \\cos^2\\theta = 1' },
      { label: 'Double angle', latex: '\\sin(2\\theta) = 2\\sin\\theta\\cos\\theta' },
      { label: 'Euler\'s formula', latex: 'e^{i\\theta} = \\cos\\theta + i\\sin\\theta' },
      { label: 'Tangent', latex: '\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}' },
    ],
  },
  {
    key: 'calculus',
    items: [
      { label: 'Definite integral', latex: '\\int_0^1 x^2 \\, dx = \\frac{1}{3}' },
      { label: 'Derivative', latex: '\\frac{d}{dx} x^n = nx^{n-1}' },
      { label: 'Taylor series', latex: 'e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!}' },
      { label: 'Fundamental theorem', latex: '\\int_a^b f\'(x) \\, dx = f(b) - f(a)' },
    ],
  },
  {
    key: 'inequality',
    items: [
      { label: 'Absolute value', latex: '|x - 1| < 3' },
      { label: 'Quadratic inequality', latex: 'x^2 - 4 > 0' },
      { label: 'Triangle inequality', latex: '|a + b| \\leq |a| + |b|' },
    ],
  },
  {
    key: 'polar',
    items: [
      { label: 'Cardioid', latex: 'r = 1 + \\cos\\theta' },
      { label: 'Rose curve', latex: 'r = \\sin(3\\theta)' },
      { label: 'Lemniscate', latex: 'r^2 = 2\\cos(2\\theta)' },
    ],
  },
  {
    key: 'structures',
    items: [
      { label: '2x2 Matrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { label: 'Determinant', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc' },
      { label: 'Piecewise function', latex: '|x| = \\begin{cases} x & x \\geq 0 \\\\ -x & x < 0 \\end{cases}' },
      { label: 'System of equations', latex: '\\begin{cases} 2x + y = 5 \\\\ x - y = 1 \\end{cases}' },
    ],
  },
];
