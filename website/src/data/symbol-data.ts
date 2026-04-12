/**
 * LaTeX 심볼/명령어 데이터 — 개별 심볼 비교 페이지용
 *
 * 각 카테고리의 items 배열: [표시용 명령어, 렌더링할 LaTeX]
 * 두 번째 값이 없으면 첫 번째 값으로 렌더링.
 */

export interface SymbolCategory {
  key: string;
  items: [cmd: string, latex?: string][];
}

export const symbolCategories: SymbolCategory[] = [
  // ───────────────────────────────────────────
  // 1. Greek Letters
  // ───────────────────────────────────────────
  {
    key: 'greek',
    items: [
      // Lowercase
      ['\\alpha'], ['\\beta'], ['\\gamma'], ['\\delta'], ['\\epsilon'], ['\\varepsilon'],
      ['\\zeta'], ['\\eta'], ['\\theta'], ['\\vartheta'], ['\\iota'], ['\\kappa'],
      ['\\lambda'], ['\\mu'], ['\\nu'], ['\\xi'], ['\\pi'], ['\\varpi'],
      ['\\rho'], ['\\varrho'], ['\\sigma'], ['\\varsigma'], ['\\tau'], ['\\upsilon'],
      ['\\phi'], ['\\varphi'], ['\\chi'], ['\\psi'], ['\\omega'],
      // Uppercase
      ['\\Gamma'], ['\\Delta'], ['\\Theta'], ['\\Lambda'], ['\\Xi'], ['\\Pi'],
      ['\\Sigma'], ['\\Upsilon'], ['\\Phi'], ['\\Psi'], ['\\Omega'],
      // Variants
      ['\\digamma'], ['\\varkappa'], ['\\beth'], ['\\gimel'], ['\\daleth'],
    ],
  },

  // ───────────────────────────────────────────
  // 2. Binary Operators
  // ───────────────────────────────────────────
  {
    key: 'binary',
    items: [
      ['+', 'a + b'], ['-', 'a - b'], ['\\pm', 'a \\pm b'], ['\\mp', 'a \\mp b'],
      ['\\times', 'a \\times b'], ['\\div', 'a \\div b'], ['\\cdot', 'a \\cdot b'],
      ['\\ast', 'a \\ast b'], ['\\star', 'a \\star b'], ['\\circ', 'a \\circ b'],
      ['\\bullet', 'a \\bullet b'], ['\\diamond', 'a \\diamond b'],
      ['\\oplus', 'a \\oplus b'], ['\\ominus', 'a \\ominus b'],
      ['\\otimes', 'a \\otimes b'], ['\\oslash', 'a \\oslash b'],
      ['\\odot', 'a \\odot b'], ['\\bigcirc', 'a \\bigcirc b'],
      ['\\dagger', 'a \\dagger b'], ['\\ddagger', 'a \\ddagger b'],
      ['\\vee', 'a \\vee b'], ['\\wedge', 'a \\wedge b'],
      ['\\cap', 'A \\cap B'], ['\\cup', 'A \\cup B'],
      ['\\sqcap', 'A \\sqcap B'], ['\\sqcup', 'A \\sqcup B'],
      ['\\uplus', 'A \\uplus B'], ['\\setminus', 'A \\setminus B'],
      ['\\triangleleft', 'a \\triangleleft b'], ['\\triangleright', 'a \\triangleright b'],
      ['\\bigtriangleup', 'a \\bigtriangleup b'], ['\\bigtriangledown', 'a \\bigtriangledown b'],
      ['\\amalg', 'a \\amalg b'], ['\\wr', 'a \\wr b'],
      ['\\lhd'], ['\\rhd'], ['\\unlhd'], ['\\unrhd'],
    ],
  },

  // ───────────────────────────────────────────
  // 3. Relation Operators
  // ───────────────────────────────────────────
  {
    key: 'relations',
    items: [
      ['=', 'a = b'], ['\\neq', 'a \\neq b'], ['<', 'a < b'], ['>', 'a > b'],
      ['\\leq', 'a \\leq b'], ['\\geq', 'a \\geq b'],
      ['\\leqslant', 'a \\leqslant b'], ['\\geqslant', 'a \\geqslant b'],
      ['\\ll', 'a \\ll b'], ['\\gg', 'a \\gg b'],
      ['\\equiv', 'a \\equiv b'], ['\\sim', 'a \\sim b'],
      ['\\simeq', 'a \\simeq b'], ['\\approx', 'a \\approx b'],
      ['\\cong', 'a \\cong b'], ['\\doteq', 'a \\doteq b'],
      ['\\propto', 'a \\propto b'], ['\\asymp', 'a \\asymp b'],
      ['\\subset', 'A \\subset B'], ['\\supset', 'A \\supset B'],
      ['\\subseteq', 'A \\subseteq B'], ['\\supseteq', 'A \\supseteq B'],
      ['\\sqsubseteq', 'A \\sqsubseteq B'], ['\\sqsupseteq', 'A \\sqsupseteq B'],
      ['\\in', 'x \\in A'], ['\\ni', 'A \\ni x'],
      ['\\vdash', 'a \\vdash b'], ['\\dashv', 'a \\dashv b'],
      ['\\models', 'a \\models b'],
      ['\\perp', 'a \\perp b'], ['\\parallel', 'a \\parallel b'],
      ['\\mid', 'a \\mid b'],
      ['\\prec', 'a \\prec b'], ['\\succ', 'a \\succ b'],
      ['\\preceq', 'a \\preceq b'], ['\\succeq', 'a \\succeq b'],
      ['\\bowtie', 'a \\bowtie b'],
      ['\\smile'], ['\\frown'],
    ],
  },

  // ───────────────────────────────────────────
  // 4. Negated Relations
  // ───────────────────────────────────────────
  {
    key: 'negated',
    items: [
      ['\\neq', 'a \\neq b'], ['\\notin', 'x \\notin A'],
      ['\\nless', 'a \\nless b'], ['\\ngtr', 'a \\ngtr b'],
      ['\\nleq', 'a \\nleq b'], ['\\ngeq', 'a \\ngeq b'],
      ['\\nleqslant', 'a \\nleqslant b'], ['\\ngeqslant', 'a \\ngeqslant b'],
      ['\\nprec', 'a \\nprec b'], ['\\nsucc', 'a \\nsucc b'],
      ['\\npreceq', 'a \\npreceq b'], ['\\nsucceq', 'a \\nsucceq b'],
      ['\\nsubseteq', 'A \\nsubseteq B'], ['\\nsupseteq', 'A \\nsupseteq B'],
      ['\\subsetneq', 'A \\subsetneq B'], ['\\supsetneq', 'A \\supsetneq B'],
      ['\\nmid', 'a \\nmid b'], ['\\nparallel', 'a \\nparallel b'],
      ['\\nvdash', 'a \\nvdash b'], ['\\nVdash', 'a \\nVdash b'],
      ['\\nvDash', 'a \\nvDash b'], ['\\nVDash', 'a \\nVDash b'],
      ['\\ntriangleleft', 'a \\ntriangleleft b'], ['\\ntriangleright', 'a \\ntriangleright b'],
      ['\\ntrianglelefteq', 'a \\ntrianglelefteq b'], ['\\ntrianglerighteq', 'a \\ntrianglerighteq b'],
      ['\\ncong', 'a \\ncong b'], ['\\nsim', 'a \\nsim b'],
    ],
  },

  // ───────────────────────────────────────────
  // 5. Arrows
  // ───────────────────────────────────────────
  {
    key: 'arrows',
    items: [
      ['\\leftarrow'], ['\\rightarrow'], ['\\leftrightarrow'],
      ['\\Leftarrow'], ['\\Rightarrow'], ['\\Leftrightarrow'],
      ['\\longleftarrow'], ['\\longrightarrow'], ['\\longleftrightarrow'],
      ['\\Longleftarrow'], ['\\Longrightarrow'], ['\\Longleftrightarrow'],
      ['\\uparrow'], ['\\downarrow'], ['\\updownarrow'],
      ['\\Uparrow'], ['\\Downarrow'], ['\\Updownarrow'],
      ['\\nearrow'], ['\\searrow'], ['\\swarrow'], ['\\nwarrow'],
      ['\\mapsto'], ['\\longmapsto'],
      ['\\hookrightarrow'], ['\\hookleftarrow'],
      ['\\rightharpoonup'], ['\\rightharpoondown'],
      ['\\leftharpoonup'], ['\\leftharpoondown'],
      ['\\rightleftharpoons'], ['\\leftrightharpoons'],
      ['\\dashrightarrow'], ['\\dashleftarrow'],
      ['\\twoheadrightarrow'], ['\\twoheadleftarrow'],
      ['\\rightarrowtail'], ['\\leftarrowtail'],
      ['\\rightsquigarrow'], ['\\leftrightsquigarrow'],
      ['\\curvearrowleft'], ['\\curvearrowright'],
      ['\\circlearrowleft'], ['\\circlearrowright'],
      ['\\Lsh'], ['\\Rsh'],
      ['\\leadsto'],
      ['\\xleftarrow{n}', '\\xleftarrow{n+1}'], ['\\xrightarrow{n}', '\\xrightarrow{n+1}'],
    ],
  },

  // ───────────────────────────────────────────
  // 6. Delimiters
  // ───────────────────────────────────────────
  {
    key: 'delimiters',
    items: [
      ['(', '(x)'], [')', '(x)'],
      ['[', '[x]'], [']', '[x]'],
      ['\\{', '\\{x\\}'], ['\\}', '\\{x\\}'],
      ['\\lfloor', '\\lfloor x \\rfloor'], ['\\rfloor', '\\lfloor x \\rfloor'],
      ['\\lceil', '\\lceil x \\rceil'], ['\\rceil', '\\lceil x \\rceil'],
      ['\\langle', '\\langle x \\rangle'], ['\\rangle', '\\langle x \\rangle'],
      ['|', '|x|'], ['\\|', '\\|x\\|'],
      ['/', 'a / b'], ['\\backslash'],
      ['\\lvert', '\\lvert x \\rvert'], ['\\rvert', '\\lvert x \\rvert'],
      ['\\lVert', '\\lVert x \\rVert'], ['\\rVert', '\\lVert x \\rVert'],
      // Sized delimiters
      ['\\left( \\right)', '\\left( \\frac{a}{b} \\right)'],
      ['\\left[ \\right]', '\\left[ \\frac{a}{b} \\right]'],
      ['\\left\\{ \\right\\}', '\\left\\{ \\frac{a}{b} \\right\\}'],
      ['\\left\\langle \\right\\rangle', '\\left\\langle \\frac{a}{b} \\right\\rangle'],
      ['\\left| \\right|', '\\left| \\frac{a}{b} \\right|'],
      ['\\left\\| \\right\\|', '\\left\\| \\frac{a}{b} \\right\\|'],
      // Manual sizing
      ['\\big(', '\\big( x \\big)'], ['\\Big(', '\\Big( x \\Big)'],
      ['\\bigg(', '\\bigg( x \\bigg)'], ['\\Bigg(', '\\Bigg( x \\Bigg)'],
    ],
  },

  // ───────────────────────────────────────────
  // 7. Big Operators
  // ───────────────────────────────────────────
  {
    key: 'bigops',
    items: [
      ['\\sum', '\\sum_{i=1}^{n} x_i'],
      ['\\prod', '\\prod_{i=1}^{n} x_i'],
      ['\\coprod', '\\coprod_{i=1}^{n} x_i'],
      ['\\int', '\\int_{a}^{b} f(x)\\,dx'],
      ['\\iint', '\\iint_{D} f\\,dA'],
      ['\\iiint', '\\iiint_{V} f\\,dV'],
      ['\\oint', '\\oint_{C} f\\,ds'],
      ['\\bigcap', '\\bigcap_{i=1}^{n} A_i'],
      ['\\bigcup', '\\bigcup_{i=1}^{n} A_i'],
      ['\\bigvee', '\\bigvee_{i=1}^{n} p_i'],
      ['\\bigwedge', '\\bigwedge_{i=1}^{n} p_i'],
      ['\\bigoplus', '\\bigoplus_{i=1}^{n} V_i'],
      ['\\bigotimes', '\\bigotimes_{i=1}^{n} V_i'],
      ['\\bigodot', '\\bigodot_{i=1}^{n} a_i'],
      ['\\biguplus', '\\biguplus_{i=1}^{n} A_i'],
      ['\\bigsqcup', '\\bigsqcup_{i=1}^{n} A_i'],
      ['\\lim', '\\lim_{x \\to \\infty} f(x)'],
      ['\\sup', '\\sup_{x \\in S} f(x)'],
      ['\\inf', '\\inf_{x \\in S} f(x)'],
      ['\\max', '\\max_{x \\in S} f(x)'],
      ['\\min', '\\min_{x \\in S} f(x)'],
      ['\\limsup', '\\limsup_{n \\to \\infty} a_n'],
      ['\\liminf', '\\liminf_{n \\to \\infty} a_n'],
    ],
  },

  // ───────────────────────────────────────────
  // 8. Math Accents
  // ───────────────────────────────────────────
  {
    key: 'accents',
    items: [
      ['\\hat{a}'], ['\\bar{a}'], ['\\vec{a}'], ['\\dot{a}'], ['\\ddot{a}'],
      ['\\tilde{a}'], ['\\breve{a}'], ['\\check{a}'], ['\\acute{a}'], ['\\grave{a}'],
      ['\\widehat{abc}'], ['\\widetilde{abc}'],
      ['\\overline{abc}'], ['\\underline{abc}'],
      ['\\overbrace{abc}^{n}'], ['\\underbrace{abc}_{n}'],
      ['\\overleftarrow{abc}'], ['\\overrightarrow{abc}'],
      ['\\overleftrightarrow{abc}'],
      ['\\mathring{a}'],
    ],
  },

  // ───────────────────────────────────────────
  // 9. Math Functions
  // ───────────────────────────────────────────
  {
    key: 'functions',
    items: [
      ['\\sin', '\\sin x'], ['\\cos', '\\cos x'], ['\\tan', '\\tan x'],
      ['\\cot', '\\cot x'], ['\\sec', '\\sec x'], ['\\csc', '\\csc x'],
      ['\\arcsin', '\\arcsin x'], ['\\arccos', '\\arccos x'], ['\\arctan', '\\arctan x'],
      ['\\sinh', '\\sinh x'], ['\\cosh', '\\cosh x'], ['\\tanh', '\\tanh x'],
      ['\\coth', '\\coth x'],
      ['\\log', '\\log x'], ['\\log_a', '\\log_a x'],
      ['\\ln', '\\ln x'], ['\\exp', '\\exp(x)'],
      ['\\det', '\\det A'], ['\\dim', '\\dim V'],
      ['\\gcd', '\\gcd(a, b)'], ['\\hom', '\\hom(A, B)'],
      ['\\ker', '\\ker \\phi'], ['\\arg', '\\arg z'],
      ['\\deg', '\\deg p'], ['\\Pr', '\\Pr(X = x)'],
      ['\\operatorname{sgn}', '\\operatorname{sgn}(x)'],
    ],
  },

  // ───────────────────────────────────────────
  // 10. Structure Commands
  // ───────────────────────────────────────────
  {
    key: 'structures',
    items: [
      ['\\frac{a}{b}'], ['\\dfrac{a}{b}'], ['\\tfrac{a}{b}'],
      ['\\cfrac{1}{1+\\cfrac{1}{2}}'],
      ['\\sqrt{x}'], ['\\sqrt[3]{x}'], ['\\sqrt[n]{x}'],
      ['\\binom{n}{k}'], ['\\dbinom{n}{k}'], ['\\tbinom{n}{k}'],
      ['x^{n}', 'x^{n+1}'], ['x_{i}', 'x_{i,j}'],
      ['x^{a}_{b}', 'x^{a}_{b}'],
      ['\\stackrel{?}{=}', 'a \\stackrel{?}{=} b'],
      ['\\overset{\\sim}{X}'], ['\\underset{n}{\\sum}'],
      ['\\overline{X+Y}'], ['\\underline{X+Y}'],
      ['\\overbrace{a+b+c}^{n}'], ['\\underbrace{a+b+c}_{n}'],
      ['\\boxed{E=mc^2}'],
      ['\\cancel{x}', '\\cancel{x+1}'],
      ['\\bcancel{x}', '\\bcancel{x+1}'],
      ['\\xcancel{x}', '\\xcancel{x+1}'],
      ['\\not=', 'a \\not= b'],
      ['\\frac{\\partial f}{\\partial x}'],
    ],
  },

  // ───────────────────────────────────────────
  // 11. Environments
  // ───────────────────────────────────────────
  {
    key: 'environments',
    items: [
      ['matrix', '\\begin{matrix} a & b \\\\ c & d \\end{matrix}'],
      ['pmatrix', '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'],
      ['bmatrix', '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}'],
      ['vmatrix', '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}'],
      ['Vmatrix', '\\begin{Vmatrix} a & b \\\\ c & d \\end{Vmatrix}'],
      ['cases', '\\begin{cases} x & \\text{if } x \\geq 0 \\\\ -x & \\text{if } x < 0 \\end{cases}'],
      ['aligned', '\\begin{aligned} x &= 1 \\\\ y &= 2 \\end{aligned}'],
      ['gathered', '\\begin{gathered} x = 1 \\\\ y = 2 \\end{gathered}'],
      ['array', '\\begin{array}{cc|c} 1 & 2 & 3 \\\\ 4 & 5 & 6 \\end{array}'],
      ['smallmatrix', '\\left(\\begin{smallmatrix} a & b \\\\ c & d \\end{smallmatrix}\\right)'],
      ['substack', '\\sum_{\\substack{i=1 \\\\ i \\neq j}}^{n} a_i'],
    ],
  },

  // ───────────────────────────────────────────
  // 12. Font & Style Commands
  // ───────────────────────────────────────────
  {
    key: 'fonts',
    items: [
      ['\\mathbb{R}'], ['\\mathbb{Z}'], ['\\mathbb{N}'], ['\\mathbb{Q}'], ['\\mathbb{C}'],
      ['\\mathcal{L}'], ['\\mathcal{F}'], ['\\mathcal{O}'],
      ['\\mathfrak{g}'], ['\\mathfrak{S}'], ['\\mathfrak{p}'],
      ['\\mathscr{F}'], ['\\mathscr{L}'],
      ['\\mathrm{d}x', '\\mathrm{d}x'], ['\\mathbf{v}'], ['\\mathit{x}'],
      ['\\mathsf{T}'], ['\\mathtt{code}'],
      ['\\boldsymbol{\\alpha}'], ['\\boldsymbol{\\Sigma}'],
      ['\\text{word}'], ['\\textrm{roman}'], ['\\textbf{bold}'], ['\\textit{italic}'],
      ['\\textsf{sans}'], ['\\texttt{mono}'],
      ['\\rm ABC', '{\\rm ABC}'], ['\\bf ABC', '{\\bf ABC}'],
      ['\\it ABC', '{\\it ABC}'], ['\\sf ABC', '{\\sf ABC}'],
    ],
  },

  // ───────────────────────────────────────────
  // 13. Spacing & Layout
  // ───────────────────────────────────────────
  {
    key: 'spacing',
    items: [
      ['\\quad', 'a \\quad b'], ['\\qquad', 'a \\qquad b'],
      ['\\,', 'a \\, b'], ['\\:', 'a \\: b'], ['\\;', 'a \\; b'],
      ['\\!', 'a \\! b'],
      ['\\phantom{x}', 'a \\phantom{x} b'],
      ['\\hphantom{x}', 'a \\hphantom{x} b'], ['\\vphantom{x}', 'a \\vphantom{x} b'],
      ['\\cdots', '1, 2, \\cdots, n'], ['\\ldots', '1, 2, \\ldots, n'],
      ['\\vdots', '\\begin{matrix} 1 \\\\ \\vdots \\\\ n \\end{matrix}'],
      ['\\ddots', '\\begin{matrix} 1 & & \\\\ & \\ddots & \\\\ & & n \\end{matrix}'],
      ['\\infty'], ['\\partial'],
      ['\\nabla'], ['\\forall'], ['\\exists'], ['\\nexists'],
      ['\\emptyset'], ['\\varnothing'],
      ['\\aleph'], ['\\wp'], ['\\Re'], ['\\Im'],
      ['\\ell'], ['\\hbar'], ['\\imath'], ['\\jmath'],
      ['\\clubsuit'], ['\\diamondsuit'], ['\\heartsuit'], ['\\spadesuit'],
      ['\\angle'], ['\\measuredangle'],
      ['\\triangle'], ['\\square'],
    ],
  },
];
