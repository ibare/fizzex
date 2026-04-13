export interface ComparisonCategory {
  key: string;
  items: string[];
}

export const comparisonCategories: ComparisonCategory[] = [
  {
    key: 'fractions',
    items: [
      '\\frac{1}{2}',
      '\\frac{a+b}{c+d}',
      '\\frac{\\frac{1}{2}}{\\frac{3}{4}}',
      '\\frac{x^2+1}{x-1}',
      '\\dfrac{dy}{dx}',
      '\\tfrac{1}{2} + \\tfrac{3}{4}',
      '\\left(\\frac{x}{y}\\right)',
    ],
  },
  {
    key: 'powers',
    items: [
      'x^2',
      'x^{n+1}',
      '2^{2^n}',
      '\\sqrt{x}',
      '\\sqrt[3]{x^2+1}',
      'x^{\\frac{1}{2}}',
    ],
  },
  {
    key: 'trig',
    items: [
      '\\sin x',
      '\\cos^2\\theta',
      '\\tan^{-1}(x)',
      '\\sin(\\alpha + \\beta)',
      '\\cot x = \\frac{\\cos x}{\\sin x}',
      '\\sec^2 x = 1 + \\tan^2 x',
      '\\csc x = \\frac{1}{\\sin x}',
      '\\arcsin x + \\arccos x = \\frac{\\pi}{2}',
      '\\arctan 1 = \\frac{\\pi}{4}',
      '\\arccot x = \\frac{\\pi}{2} - \\arctan x',
      '\\arcsec x,\\; \\arccsc x',
    ],
  },
  {
    key: 'hyperbolic',
    items: [
      '\\sinh x = \\frac{e^x - e^{-x}}{2}',
      '\\cosh^2 x - \\sinh^2 x = 1',
      '\\tanh x = \\frac{\\sinh x}{\\cosh x}',
      '\\coth x = \\frac{1}{\\tanh x}',
      '\\sech x,\\; \\csch x',
    ],
  },
  {
    key: 'log',
    items: [
      '\\exp(x) = e^x',
      '\\ln e = 1',
      '\\log_{10} 100 = 2',
      '\\lg 1000 = 3',
      '\\log_a b = \\frac{\\ln b}{\\ln a}',
    ],
  },
  {
    key: 'integrals',
    items: [
      '\\int f(x)\\,dx',
      '\\int_0^1 x^2\\,dx',
      '\\iint_D f\\,dA',
      '\\oint_C F\\cdot dr',
      '\\iiint_V f\\,dV',
    ],
  },
  {
    key: 'sigma',
    items: [
      '\\sum_{i=1}^n i',
      '\\sum_{n=0}^{\\infty} \\frac{x^n}{n!}',
      '\\prod_{i=1}^n a_i',
      '\\lim_{x \\to 0} \\frac{\\sin x}{x}',
      '\\lim_{n \\to \\infty} (1+\\frac{1}{n})^n',
      '\\sup_{x \\in S} f(x)',
      '\\inf_{x \\in S} f(x)',
    ],
  },
  {
    key: 'algebra',
    items: [
      '\\min(a, b) + \\max(a, b) = a + b',
      '\\gcd(12, 18) = 6',
      '\\lcm(4, 6) = 12',
      '17 \\mod 5 = 2',
      '\\det A = ad - bc',
      '\\dim V = n',
      '\\ker T',
      '\\hom(A, B)',
      '\\arg(z) = \\theta',
      '\\deg p(x) = n',
    ],
  },
  {
    key: 'accents',
    items: [
      '\\hat{x}',
      '\\widehat{ABC}',
      '\\bar{x} = \\frac{1}{n}\\sum x_i',
      '\\overline{AB}',
      '\\vec{v} = \\overrightarrow{AB}',
      '\\dot{x}, \\ddot{x}',
      '\\tilde{f}, \\widetilde{ABC}',
      '\\breve{a}, \\check{x}',
    ],
  },
  {
    key: 'sets',
    items: [
      'A \\cup B',
      'A \\cap B \\subseteq C',
      '\\forall x \\in \\mathbb{R}',
      '\\exists x: P(x) \\Rightarrow Q(x)',
      'x \\notin S, \\; A \\subset B',
      'A \\supset B, \\; A \\supseteq B',
      'A \\setminus B',
      'P(A \\mid B)',
      '\\emptyset = \\varnothing',
      '\\nexists x: P(x)',
      '\\lnot P \\land Q, \\; P \\lor \\neg Q',
    ],
  },
  {
    key: 'operators',
    items: [
      'x \\pm y, \\; x \\mp y',
      'a \\div b',
      'a \\ast b, \\; a \\star b',
      'f \\circ g, \\; a \\bullet b',
      '\\angle ABC = 90^\\circ',
      'AB \\perp CD',
      'AB \\parallel CD',
      'f^\\prime(x)',
    ],
  },
  {
    key: 'complex',
    items: [
      'e^{i\\pi} + 1 = 0',
      'E = mc^2',
      '\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}',
      'i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi',
    ],
  },
];
