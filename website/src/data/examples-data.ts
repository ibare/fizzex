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
    key: 'algebra',
    items: [
      { label: 'Euler\'s identity', latex: 'e^{i\\pi} + 1 = 0' },
      { label: 'Quadratic formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
      { label: 'Binomial theorem', latex: '(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k' },
      { label: 'Geometric series', latex: 'S_n = \\frac{a(1 - r^n)}{1 - r}' },
      { label: 'Difference of squares', latex: 'a^2 - b^2 = (a + b)(a - b)' },
    ],
  },
  {
    key: 'geometry',
    items: [
      { label: 'Pythagorean theorem', latex: 'a^2 + b^2 = c^2' },
      { label: 'Heron\'s formula', latex: 'A = \\sqrt{s(s-a)(s-b)(s-c)}' },
      { label: 'Circle area', latex: 'A = \\pi r^2' },
      { label: 'Law of cosines', latex: 'a^2 = b^2 + c^2 - 2bc\\cos C' },
      { label: 'Sphere volume', latex: 'V = \\frac{4}{3}\\pi r^3' },
    ],
  },
  {
    key: 'physics',
    items: [
      { label: 'Mass-energy equivalence', latex: 'E = mc^2' },
      { label: 'Newton\'s second law', latex: 'F = ma' },
      { label: 'Universal gravitation', latex: 'F = G\\frac{m_1 m_2}{r^2}' },
      { label: 'Coulomb\'s law', latex: 'F = k_e \\frac{q_1 q_2}{r^2}' },
      { label: 'Kinetic energy', latex: 'K = \\frac{1}{2}mv^2' },
    ],
  },
  {
    key: 'analysis',
    items: [
      { label: 'Fundamental theorem of calculus', latex: '\\int_a^b f(x) \\, dx = F(b) - F(a)' },
      { label: 'Taylor series', latex: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n' },
      { label: 'Gaussian integral', latex: '\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}' },
      { label: 'Derivative definition', latex: 'f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}' },
      { label: 'Chain rule', latex: '\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}' },
    ],
  },
  {
    key: 'statistics',
    items: [
      { label: 'Bayes\' theorem', latex: 'P(A|B) = \\frac{P(B|A)P(A)}{P(B)}' },
      { label: 'Normal distribution', latex: 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}' },
      { label: 'Standard deviation', latex: '\\sigma = \\sqrt{\\frac{1}{N}\\sum_{i=1}^{N}(x_i - \\mu)^2}' },
      { label: 'Correlation coefficient', latex: 'r = \\frac{\\sum(x_i - \\bar{x})(y_i - \\bar{y})}{\\sqrt{\\sum(x_i - \\bar{x})^2 \\sum(y_i - \\bar{y})^2}}' },
      { label: 'Law of large numbers', latex: '\\lim_{n \\to \\infty} P\\left(|\\bar{X}_n - \\mu| < \\epsilon\\right) = 1' },
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
