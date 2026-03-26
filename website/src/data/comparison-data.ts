export interface ComparisonCategory {
  key: string;
  items: string[];
}

export const comparisonCategories: ComparisonCategory[] = [
  { key: 'fractions', items: ['\\frac{1}{2}', '\\frac{a+b}{c+d}', '\\frac{\\frac{1}{2}}{\\frac{3}{4}}', '\\frac{x^2+1}{x-1}'] },
  { key: 'powers', items: ['x^2', 'x^{n+1}', '2^{2^n}', '\\sqrt{x}', '\\sqrt[3]{x^2+1}', 'x^{\\frac{1}{2}}'] },
  { key: 'trig', items: ['\\sin x', '\\cos^2\\theta', '\\tan^{-1}(x)', '\\sin(\\alpha + \\beta)'] },
  { key: 'integrals', items: ['\\int f(x)\\,dx', '\\int_0^1 x^2\\,dx', '\\iint_D f\\,dA', '\\oint_C F\\cdot dr'] },
  { key: 'sigma', items: ['\\sum_{i=1}^n i', '\\sum_{n=0}^{\\infty} \\frac{x^n}{n!}', '\\prod_{i=1}^n a_i'] },
  { key: 'limits', items: ['\\lim_{x \\to 0} \\frac{\\sin x}{x}', '\\lim_{n \\to \\infty} (1+\\frac{1}{n})^n'] },
  { key: 'greek', items: ['\\alpha, \\beta, \\gamma, \\delta', '\\Gamma, \\Delta, \\Theta, \\Lambda', '\\nabla \\cdot \\vec{F}', '\\partial f / \\partial x'] },
  { key: 'matrices', items: ['\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}', '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}'] },
  { key: 'complex', items: ['e^{i\\pi} + 1 = 0', 'E = mc^2', '\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}', 'i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi'] },
  { key: 'sets', items: ['A \\cup B', 'A \\cap B \\subseteq C', '\\forall x \\in \\mathbb{R}', '\\exists x: P(x) \\Rightarrow Q(x)'] },
];
