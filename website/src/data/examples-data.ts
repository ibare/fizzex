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
  {
    key: 'complex',
    items: [
      {
        label: 'Nested integrals + series',
        latex: '\\int_{0}^{\\infty}\\left(\\sum_{n=1}^{\\infty}\\frac{(-1)^n}{n!}\\left(\\int_{0}^{1}x^{n}t\\ e^{-t^2} \\, dt\\right)\\right)\\ln\\!\\left(1 + e^{-x^2}\\right)\\, dx',
      },
      {
        label: 'Matrix + exponent + eigenvalue',
        latex: '\\Phi(A)=\\frac{\\det\\!\\left(A^\\top A + \\lambda I\\right)}{\\operatorname{tr}\\!\\left(e^{A} + \\sum_{k=1}^{m} \\frac{A^k}{k!}\\right)}\\cdot\\prod_{i=1}^{n}\\sqrt{|\\mu_i(A)|}',
      },
      {
        label: 'Variational problem',
        latex: '\\mathcal{L}[u]=\\int_{\\Omega}\\left(\\frac{1}{2}\\sum_{i,j=1}^{n}a_{ij}(x)\\frac{\\partial u}{\\partial x_i}\\frac{\\partial u}{\\partial x_j}+V(x)\\ u^2-f(x)\\ u\\right)\\, dx+\\epsilon\\int_{\\partial \\Omega}|\\nabla u|^3 \\, dS',
      },
      {
        label: 'Probability + information theory',
        latex: '\\Psi(X,Y)=\\mathbb{E}\\left[\\sum_{i=1}^{N}\\frac{P(X_i \\mid Y)^2}{\\int_{\\mathcal{Y}} P(X_i \\mid y)\\, dy}\\right]+\\beta H(X \\mid Y)-\\gamma D_{\\mathrm{KL}}(P \\Vert Q)',
      },
      {
        label: 'Renderer stress test',
        latex: '\\Xi=\\left(\\sum_{k=0}^{\\infty}\\frac{(-1)^k}{(2k+1)!}\\left[\\prod_{j=1}^{k}\\left(\\int_{0}^{1}\\frac{\\sqrt{1 + x^{2j}}}{1 + \\ln(1+x)} \\, dx\\right)\\right]\\right)^{1/\\pi}\\Bigg/\\left|\\lim_{n\\to\\infty}\\frac{1}{n}\\sum_{m=1}^{n}e^{i\\ m\\ \\theta}\\right|',
      },
    ],
  },
];
