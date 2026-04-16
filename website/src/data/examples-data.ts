export interface ExampleItem {
  /** i18n 사전의 examples.items 참조 키 (snake_case, 카테고리 전체에서 고유) */
  labelKey: string;
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
      { labelKey: 'quadratic_eq', latex: 'x^2 + 2x - 3 = 0' },
      { labelKey: 'quadratic_function', latex: 'y = ax^2 + bx + c' },
      { labelKey: 'cubic_poly', latex: 'x^3 - 6x^2 + 11x - 6' },
      { labelKey: 'binomial_expansion', latex: '(a + b)^3 = a^3 + 3a^2b + 3ab^2 + b^3' },
      { labelKey: 'vieta', latex: 'x_1 + x_2 = -\\frac{b}{a}, \\quad x_1 x_2 = \\frac{c}{a}' },
    ],
  },
  {
    key: 'trigonometric',
    items: [
      { labelKey: 'pythagorean_identity', latex: '\\sin^2\\theta + \\cos^2\\theta = 1' },
      { labelKey: 'double_angle', latex: '\\sin(2\\theta) = 2\\sin\\theta\\cos\\theta' },
      { labelKey: 'euler_formula', latex: 'e^{i\\theta} = \\cos\\theta + i\\sin\\theta' },
      { labelKey: 'tangent', latex: '\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}' },
    ],
  },
  {
    key: 'calculus',
    items: [
      { labelKey: 'definite_integral', latex: '\\int_0^1 x^2 \\, dx = \\frac{1}{3}' },
      { labelKey: 'derivative', latex: '\\frac{d}{dx} x^n = nx^{n-1}' },
      { labelKey: 'taylor_series_basic', latex: 'e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!}' },
      { labelKey: 'fundamental_theorem_basic', latex: '\\int_a^b f\'(x) \\, dx = f(b) - f(a)' },
    ],
  },
  {
    key: 'inequality',
    items: [
      { labelKey: 'abs_value_ineq', latex: '|x - 1| < 3' },
      { labelKey: 'quadratic_ineq', latex: 'x^2 - 4 > 0' },
      { labelKey: 'triangle_ineq', latex: '|a + b| \\leq |a| + |b|' },
    ],
  },
  {
    key: 'polar',
    items: [
      { labelKey: 'cardioid', latex: 'r = 1 + \\cos\\theta' },
      { labelKey: 'rose_curve', latex: 'r = \\sin(3\\theta)' },
      { labelKey: 'lemniscate', latex: 'r^2 = 2\\cos(2\\theta)' },
    ],
  },
  {
    key: 'structures',
    items: [
      { labelKey: 'matrix_2x2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { labelKey: 'determinant', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc' },
      { labelKey: 'piecewise', latex: '|x| = \\begin{cases} x & x \\geq 0 \\\\ -x & x < 0 \\end{cases}' },
      { labelKey: 'system_of_equations', latex: '\\begin{cases} 2x + y = 5 \\\\ x - y = 1 \\end{cases}' },
    ],
  },
  {
    key: 'algebra',
    items: [
      { labelKey: 'euler_identity', latex: 'e^{i\\pi} + 1 = 0' },
      { labelKey: 'quadratic_formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
      { labelKey: 'binomial_theorem', latex: '(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k' },
      { labelKey: 'geometric_series', latex: 'S_n = \\frac{a(1 - r^n)}{1 - r}' },
      { labelKey: 'diff_of_squares', latex: 'a^2 - b^2 = (a + b)(a - b)' },
    ],
  },
  {
    key: 'geometry',
    items: [
      { labelKey: 'pythagorean_theorem', latex: 'a^2 + b^2 = c^2' },
      { labelKey: 'heron_formula', latex: 'A = \\sqrt{s(s-a)(s-b)(s-c)}' },
      { labelKey: 'circle_area', latex: 'A = \\pi r^2' },
      { labelKey: 'law_of_cosines', latex: 'a^2 = b^2 + c^2 - 2bc\\cos C' },
      { labelKey: 'sphere_volume', latex: 'V = \\frac{4}{3}\\pi r^3' },
    ],
  },
  {
    key: 'physics',
    items: [
      { labelKey: 'mass_energy', latex: 'E = mc^2' },
      { labelKey: 'newton_second', latex: 'F = ma' },
      { labelKey: 'universal_gravitation', latex: 'F = G\\frac{m_1 m_2}{r^2}' },
      { labelKey: 'coulomb', latex: 'F = k_e \\frac{q_1 q_2}{r^2}' },
      { labelKey: 'kinetic_energy', latex: 'K = \\frac{1}{2}mv^2' },
      { labelKey: 'projectile_motion', latex: 's = v_0 t + \\frac{1}{2}gt^2' },
      { labelKey: 'simple_harmonic', latex: 'y = A\\sin(\\omega t + \\varphi)' },
    ],
  },
  {
    key: 'astronomy',
    items: [
      { labelKey: 'kepler_third', latex: 'T^2 = \\frac{4\\pi^2}{GM}a^3' },
    ],
  },
  {
    key: 'biology',
    items: [
      { labelKey: 'exponential_decay', latex: 'N = N_0 e^{-\\lambda t}' },
    ],
  },
  {
    key: 'finance',
    items: [
      { labelKey: 'compound_interest', latex: 'A = P\\left(1 + \\frac{r}{n}\\right)^{nt}' },
    ],
  },
  {
    key: 'analysis',
    items: [
      { labelKey: 'fundamental_theorem_full', latex: '\\int_a^b f(x) \\, dx = F(b) - F(a)' },
      { labelKey: 'taylor_series_full', latex: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n' },
      { labelKey: 'gaussian_integral', latex: '\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}' },
      { labelKey: 'derivative_def', latex: 'f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}' },
      { labelKey: 'chain_rule', latex: '\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}' },
    ],
  },
  {
    key: 'statistics',
    items: [
      { labelKey: 'bayes_theorem', latex: 'P(A|B) = \\frac{P(B|A)P(A)}{P(B)}' },
      { labelKey: 'normal_distribution', latex: 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}' },
      { labelKey: 'standard_deviation', latex: '\\sigma = \\sqrt{\\frac{1}{N}\\sum_{i=1}^{N}(x_i - \\mu)^2}' },
      { labelKey: 'correlation_coefficient', latex: 'r = \\frac{\\sum(x_i - \\bar{x})(y_i - \\bar{y})}{\\sqrt{\\sum(x_i - \\bar{x})^2 \\sum(y_i - \\bar{y})^2}}' },
      { labelKey: 'law_of_large_numbers', latex: '\\lim_{n \\to \\infty} P\\left(|\\bar{X}_n - \\mu| < \\epsilon\\right) = 1' },
    ],
  },
  {
    key: 'complex',
    items: [
      {
        labelKey: 'nested_integrals_series',
        latex: '\\int_{0}^{\\infty}\\left(\\sum_{n=1}^{\\infty}\\frac{(-1)^n}{n!}\\left(\\int_{0}^{1}x^{n}t\\ e^{-t^2} \\, dt\\right)\\right)\\ln\\!\\left(1 + e^{-x^2}\\right)\\, dx',
      },
      {
        labelKey: 'matrix_eigenvalue',
        latex: '\\Phi(A)=\\frac{\\det\\!\\left(A^\\top A + \\lambda I\\right)}{\\operatorname{tr}\\!\\left(e^{A} + \\sum_{k=1}^{m} \\frac{A^k}{k!}\\right)}\\cdot\\prod_{i=1}^{n}\\sqrt{|\\mu_i(A)|}',
      },
      {
        labelKey: 'variational_problem',
        latex: '\\mathcal{L}[u]=\\int_{\\Omega}\\left(\\frac{1}{2}\\sum_{i,j=1}^{n}a_{ij}(x)\\frac{\\partial u}{\\partial x_i}\\frac{\\partial u}{\\partial x_j}+V(x)\\ u^2-f(x)\\ u\\right)\\, dx+\\epsilon\\int_{\\partial \\Omega}|\\nabla u|^3 \\, dS',
      },
      {
        labelKey: 'probability_info_theory',
        latex: '\\Psi(X,Y)=\\mathbb{E}\\left[\\sum_{i=1}^{N}\\frac{P(X_i \\mid Y)^2}{\\int_{\\mathcal{Y}} P(X_i \\mid y)\\, dy}\\right]+\\beta H(X \\mid Y)-\\gamma D_{\\mathrm{KL}}(P \\Vert Q)',
      },
      {
        labelKey: 'renderer_stress',
        latex: '\\Xi=\\left(\\sum_{k=0}^{\\infty}\\frac{(-1)^k}{(2k+1)!}\\left[\\prod_{j=1}^{k}\\left(\\int_{0}^{1}\\frac{\\sqrt{1 + x^{2j}}}{1 + \\ln(1+x)} \\, dx\\right)\\right]\\right)^{1/\\pi}\\Bigg/\\left|\\lim_{n\\to\\infty}\\frac{1}{n}\\sum_{m=1}^{n}e^{i\\ m\\ \\theta}\\right|',
      },
    ],
  },
];
