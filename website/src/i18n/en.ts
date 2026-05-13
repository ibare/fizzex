import type { Dictionary } from './types';

export const en: Dictionary = {
  nav: {
    home: 'Home',
    docs: 'Docs',
    demo: 'Demo',
    github: 'GitHub',
  },
  hero: {
    headline: 'Math on the web\nshould feel effortless.',
    sub: 'A Canvas-based math expression platform. Edit, parse, analyze, compute, and visualize — all in one lightweight package built to lower the barriers to learning mathematics.',
    install: 'npm install fizzex',
    cta_start: 'Quick Start',
    cta_github: 'GitHub',
  },
  problem: {
    title: 'Why Fizzex?',
    sub: 'Existing tools solve parts of the problem. Fizzex solves the whole thing.',
    current_title: 'The current landscape',
    current_items: [
      'KaTeX and MathJax only render — they don\'t understand the math',
      'MathLive adds editing, but no analysis or algebra',
      'Visualization requires yet another library',
      'Gluing 4-5 libraries together for one math experience',
      'DOM-based rendering limits interactive possibilities',
    ],
    fizzex_title: 'With Fizzex',
    fizzex_items: [
      'One import for the full pipeline: edit to visualize',
      'Canvas rendering with TeX-quality box model layout',
      'Built-in expression analysis that understands your math',
      'Numeric evaluator: scalar / matrix / complex / autodiff / distribution',
      'Auto-visualization recommends the right chart for any expression',
    ],
  },
  pipeline: {
    title: 'One library, full pipeline',
    sub: 'From LaTeX input to interactive visualization — a clean, testable pipeline.',
    steps: {
      input: { label: 'Input', desc: 'LaTeX string or keyboard-driven editor' },
      parse: { label: 'Parse', desc: 'Bidirectional LaTeX-AST conversion, 400+ commands' },
      analyze: { label: 'Analyze', desc: 'Domain detection, variable classification, feature extraction' },
      compute: { label: 'Compute', desc: 'Numeric evaluation: scalar, matrix, complex, autodiff, distributions' },
      visualize: { label: 'Visualize', desc: 'Function graphs, unit circles, number lines, polar plots' },
    },
  },
  features: {
    title: 'Everything you need for math on the web',
    sub: 'From input to visualization, one package covers the full pipeline.',
    editor: {
      title: 'Canvas Editor',
      desc: 'Box model layout with TeX\'s 8-stage MathStyle and baseline coordinate system. Auto HiDPI support, IME compatible.',
    },
    latex: {
      title: 'LaTeX Parser',
      desc: 'Tolerant parser that renders even incomplete input gracefully. 400+ commands, bidirectional LaTeX-AST conversion, optimized for real-time parsing.',
    },
    analysis: {
      title: 'Expression Analyzer',
      desc: 'Detect mathematical domains, classify variables, extract features, and auto-recommend visualizations.',
    },
    evaluator: {
      title: 'Numeric Evaluator',
      desc: 'Scalar, matrix, complex, and automatic differentiation — plus statistical distributions. Sync, AST-driven, framework-free.',
    },
    visualization: {
      title: 'Auto Visualization',
      desc: 'Function graphs, unit circles, number lines, polar plots. Analysis-based auto-selection of the right chart.',
    },
    autocomplete: {
      title: 'Smart Autocomplete',
      desc: 'Context-aware suggestions based on cursor position. Knows when to suggest calculus, symbols, or structure.',
    },
  },
  underTheHood: {
    title: 'Built on TeX foundations',
    sub: 'Not just the look — the structure follows TeX from the ground up.',
    tolerantParser: {
      title: 'Tolerant Parser',
      desc: 'Invalid LaTeX won\'t break anything. Errors are collected while the AST is built as completely as possible, rendering partial results. Optimized for real-time input.',
    },
    texLayout: {
      title: 'TeX Layout Engine',
      desc: 'Display/Text/Script/ScriptScript 8-stage style switching, baseline coordinate system, and TeX standard parameters with no magic numbers.',
    },
    modular: {
      title: 'Modular Architecture',
      desc: 'fizzex/headless for framework-free use, fizzex/react for React, fizzex/tiptap for rich editors. Import only what you need.',
    },
    hiFidelity: {
      title: 'High-Fidelity Output',
      desc: 'Bezier curve glyph rendering extracted from a dedicated math font. PNG export (300 DPI), automatic HiDPI display support.',
    },
  },
  quickStart: {
    title: 'Get started in seconds',
    sub: 'Install, import, render. That simple.',
    tabs: {
      install: 'Install',
      editor: 'React Editor',
      latex: 'LaTeX',
      analysis: 'Analysis',
      evaluator: 'Evaluator',
      visualization: 'Visualization',
    },
  },
  footerCta: {
    title: 'Start building with Fizzex',
    cta_start: 'Quick Start',
    cta_github: 'GitHub',
    cta_npm: 'npm',
  },
  footer: {
    tagline: 'Light and easy formula input.',
  },
  playground: {
    title: 'Playground',
    sub: 'Type LaTeX and see it rendered, analyzed, and understood in real time.',
    input_label: 'LaTeX Input',
    input_placeholder: 'Type LaTeX here... e.g. x^2 + 2x - 3 = 0',
    presets_label: 'Presets',
    analyze_btn: 'Analyze',
    analysis_empty: 'Enter an expression to see analysis.',
    analysis_error: 'Unable to analyze this expression.',
    ast_btn: 'View AST',
    analysis: {
      domain: 'Domain',
      variables: 'Variables',
      features: 'Features',
      visualization: 'Visualizable',
      complexity: 'Complexity',
      form: 'Form',
    },
  },
  pipelineExplorer: {
    title: 'Pipeline Explorer',
    sub: 'Watch a single expression flow through all five stages of the Fizzex pipeline.',
    select_label: 'Choose an expression',
    steps: {
      input: { title: 'Input', desc: 'The raw LaTeX string and its Canvas rendering' },
      parse: { title: 'Parse', desc: 'AST structure produced by the parser' },
      analyze: { title: 'Analyze', desc: 'Mathematical properties extracted from the AST' },
      compute: { title: 'Compute', desc: 'Numeric evaluation of the AST (scalar/matrix/complex/autodiff)' },
      visualize: { title: 'Visualize', desc: 'Auto-selected visualization for the expression' },
    },
    click_to_expand: 'Click to expand',
    no_compute: 'Unable to evaluate this expression.',
    no_viz: 'No visualization available for this expression.',
    loading: 'Computing...',
    compute_form: 'Form',
    compute_free_vars: 'Free variables',
    compute_value: 'Value',
  },
  examples: {
    title: 'Examples Gallery',
    sub: 'Explore expressions by mathematical domain. Click Render to see Fizzex in action.',
    render_btn: 'Render',
    collapse_btn: 'Collapse',
    analysis_label: 'Analysis',
    visualization_label: 'Visualization',
    no_variables: 'none',
    categories: {
      polynomial: 'Polynomial',
      trigonometric: 'Trigonometric',
      calculus: 'Calculus',
      inequality: 'Inequality',
      polar: 'Polar',
      structures: 'Matrix & Structures',
      algebra: 'Algebra',
      geometry: 'Geometry',
      physics: 'Physics',
      analysis: 'Analysis',
      statistics: 'Statistics',
      astronomy: 'Astronomy',
      biology: 'Biology',
      finance: 'Finance',
      complex: 'Complex Formulas',
    },
    items: {
      // polynomial
      quadratic_eq: 'Quadratic equation',
      quadratic_function: 'Quadratic function',
      cubic_poly: 'Cubic polynomial',
      binomial_expansion: 'Binomial expansion',
      vieta: "Vieta's formulas",
      // trigonometric
      pythagorean_identity: 'Pythagorean identity',
      double_angle: 'Double angle',
      euler_formula: "Euler's formula",
      tangent: 'Tangent',
      // calculus
      definite_integral: 'Definite integral',
      derivative: 'Derivative',
      taylor_series_basic: 'Taylor series',
      fundamental_theorem_basic: 'Fundamental theorem',
      // inequality
      abs_value_ineq: 'Absolute value',
      quadratic_ineq: 'Quadratic inequality',
      triangle_ineq: 'Triangle inequality',
      // polar
      cardioid: 'Cardioid',
      rose_curve: 'Rose curve',
      lemniscate: 'Lemniscate',
      // structures
      matrix_2x2: '2x2 Matrix',
      determinant: 'Determinant',
      piecewise: 'Piecewise function',
      system_of_equations: 'System of equations',
      // algebra
      euler_identity: "Euler's identity",
      quadratic_formula: 'Quadratic formula',
      binomial_theorem: 'Binomial theorem',
      geometric_series: 'Geometric series',
      diff_of_squares: 'Difference of squares',
      // geometry
      pythagorean_theorem: 'Pythagorean theorem',
      heron_formula: "Heron's formula",
      circle_area: 'Circle area',
      law_of_cosines: 'Law of cosines',
      sphere_volume: 'Sphere volume',
      // physics
      mass_energy: 'Mass-energy equivalence',
      newton_second: "Newton's second law",
      universal_gravitation: 'Universal gravitation',
      coulomb: "Coulomb's law",
      kinetic_energy: 'Kinetic energy',
      projectile_motion: 'Projectile motion',
      simple_harmonic: 'Simple harmonic motion',
      // astronomy
      kepler_third: "Kepler's third law",
      // biology
      exponential_decay: 'Exponential decay (half-life)',
      // finance
      compound_interest: 'Compound interest',
      // analysis
      fundamental_theorem_full: 'Fundamental theorem of calculus',
      taylor_series_full: 'Taylor series',
      gaussian_integral: 'Gaussian integral',
      derivative_def: 'Derivative definition',
      chain_rule: 'Chain rule',
      // statistics
      bayes_theorem: "Bayes' theorem",
      normal_distribution: 'Normal distribution',
      standard_deviation: 'Standard deviation',
      correlation_coefficient: 'Correlation coefficient',
      law_of_large_numbers: 'Law of large numbers',
      // complex
      nested_integrals_series: 'Nested integrals + series',
      matrix_eigenvalue: 'Matrix + exponent + eigenvalue',
      variational_problem: 'Variational problem',
      probability_info_theory: 'Probability + information theory',
      renderer_stress: 'Renderer stress test',
    },
  },
  comparisonPage: {
    title: 'Rendering Comparison',
    sub: 'The same LaTeX rendered side-by-side: Fizzex (Canvas) vs KaTeX (DOM) vs MathJax (SVG).',
    render_btn: 'Render All',
    fizzex_label: 'Fizzex',
    katex_label: 'KaTeX',
    mathjax_label: 'MathJax',
    latex_source: 'LaTeX',
    display_mode_display: 'Display',
    display_mode_inline: 'Inline',
    sections: {
      rendering: 'Rendering',
      symbols: 'Symbols',
    },
    categories: {
      fractions: 'Fractions',
      powers: 'Powers & Roots',
      trig: 'Trigonometric',
      hyperbolic: 'Hyperbolic',
      log: 'Log & Exponential',
      integrals: 'Integrals',
      sigma: 'Sums & Limits',
      algebra: 'Algebra Functions',
      sets: 'Sets & Logic',
      operators: 'Operators',
      complex: 'Complex Formulas',
      'sym-greek': 'Greek Letters',
      'sym-binary': 'Binary Operators',
      'sym-relations': 'Relation Operators',
      'sym-negated': 'Negated Relations',
      'sym-arrows': 'Arrows',
      'sym-delimiters': 'Delimiters',
      'sym-bigops': 'Big Operators',
      'sym-accents': 'Math Accents',
      'sym-functions': 'Math Functions',
      'sym-structures': 'Structure Commands',
      'sym-environments': 'Environments',
      'sym-fonts': 'Font & Style',
      'sym-spacing': 'Spacing & Misc',
    },
  },
  symbolPage: {
    title: 'Symbol Comparison',
    sub: 'Individual LaTeX symbols and commands rendered side-by-side: Fizzex vs KaTeX vs MathJax.',
    command_label: 'Command',
    fizzex_label: 'Fizzex',
    katex_label: 'KaTeX',
    mathjax_label: 'MathJax',
    items_label: 'items',
    display_mode_display: 'Display',
    display_mode_inline: 'Inline',
    categories: {
      greek: 'Greek Letters',
      binary: 'Binary Operators',
      relations: 'Relation Operators',
      negated: 'Negated Relations',
      arrows: 'Arrows',
      delimiters: 'Delimiters',
      bigops: 'Big Operators',
      accents: 'Math Accents',
      functions: 'Math Functions',
      structures: 'Structure Commands',
      environments: 'Environments',
      fonts: 'Font & Style',
      spacing: 'Spacing & Misc',
    },
  },
  pluginSection: {
    title: 'Plug into any editor',
    sub: 'A headless adapter layer lets you integrate Fizzex into any host editor with minimal code.',
    layer_core: {
      title: 'Core',
      desc: 'Parser, renderer, analysis, evaluator — the full math engine',
    },
    layer_headless: {
      title: 'Headless Adapter',
      desc: 'DOMRendererView & DOMEditorView — mount to any DOM element',
    },
    layer_plugins: {
      title: 'Host Plugins',
      desc: 'Tiptap, Slate, ProseMirror — thin wrappers over headless',
    },
    cta: 'Learn more about plugins',
  },
  pluginsPage: {
    title: 'Plugins',
    sub: 'Integrate Fizzex into any editor with the headless adapter layer.',
    arch: {
      title: 'Architecture',
      sub: 'Three layers, clear separation of concerns.',
      core_title: 'fizzex (Core)',
      core_desc: 'LaTeX parser, TeX box model renderer, expression analyzer, numeric evaluator (scalar/matrix/complex/autodiff), visualization components. Framework-agnostic, no DOM dependency.',
      headless_title: 'fizzex/headless',
      headless_desc: 'DOMRendererView for read-only rendering and DOMEditorView for interactive editing. Give it a DOM element — it handles Canvas setup, HiDPI scaling, font loading, and the full rendering pipeline.',
      plugins_title: 'fizzex/tiptap, fizzex/slate, ...',
      plugins_desc: 'Thin wrappers that connect the headless adapter to a specific host editor. Each plugin is typically 20-30 lines of code.',
      philosophy: 'The headless layer does the heavy lifting so that plugin authors only write host-specific glue code.',
    },
    api: {
      title: 'Headless API',
      sub: 'Two classes cover all integration needs.',
      renderer_title: 'DOMRendererView',
      renderer_desc: 'Read-only math rendering. Pass a container element and a LaTeX string.',
      editor_title: 'DOMEditorView',
      editor_desc: 'Interactive math editor with keyboard input, cursor, IME support, and auto-complete.',
      config_title: 'FizzexConfig',
    },
    guide: {
      title: 'Build Your Own Plugin',
      sub: 'Three steps to integrate Fizzex into any editor.',
      step1_title: '1. Get a container',
      step1_desc: 'Your host editor provides a DOM element for custom node rendering (NodeView, Element, etc.).',
      step2_title: '2. Create a renderer',
      step2_desc: 'Instantiate DOMRendererView or DOMEditorView with the container and your config.',
      step3_title: '3. Manage lifecycle',
      step3_desc: 'Call render() when data changes, destroy() when the node is removed.',
      tiptap_example: 'Tiptap plugin — complete implementation',
      outro: 'This same pattern works for Slate, ProseMirror, Quill, CodeMirror, or any editor that supports custom node rendering.',
    },
    demo: {
      title: 'Tiptap Live Demo',
      sub: 'A real Tiptap editor with MathInline and MathBlock extensions powered by Fizzex.',
      instructions: 'This is a live Tiptap editor. You can freely edit the text. Double-click any block formula to edit it.',
      tabs: { euler: "Euler's Identity", pythagorean: 'Pythagorean Theorem' },
      contents: {
        euler: `
        <h2>Euler's Identity — The Most Beautiful Equation</h2>
        <p>In 1748, Leonhard Euler discovered a profound connection between the five most fundamental constants in mathematics. The result is known as <strong>Euler's identity</strong>:</p>
        <div data-math-block data-latex="e^{i\\pi} + 1 = 0">e^{i\\pi} + 1 = 0</div>
        <p>This single equation unifies the additive identity <span data-math-inline data-latex="0">0</span>, the multiplicative identity <span data-math-inline data-latex="1">1</span>, the base of natural logarithms <span data-math-inline data-latex="e">e</span>, the imaginary unit <span data-math-inline data-latex="i">i</span>, and the ratio of a circle's circumference to its diameter <span data-math-inline data-latex="\\pi">\\pi</span>. Mathematician Benjamin Peirce called it "the most remarkable formula in mathematics," and physicist Richard Feynman described it as "our jewel."</p>

        <h3>The Five Constants</h3>
        <p>To appreciate why this identity is so special, consider that each of its five constants was born independently in entirely different branches of mathematics. <span data-math-inline data-latex="0">0</span> and <span data-math-inline data-latex="1">1</span> are the fundamental units of arithmetic. <span data-math-inline data-latex="\\pi">\\pi</span> emerges from geometry — as the ratio of a circle's circumference to its diameter. <span data-math-inline data-latex="e">e</span> arises naturally in calculus, as the limiting value of continuous compound growth. And <span data-math-inline data-latex="i">i</span>, satisfying <span data-math-inline data-latex="i^2 = -1">i^2 = -1</span>, extends algebra into the complex numbers.</p>
        <p>The fact that these five constants come together in a single, concise equation symbolizes the deep interconnectedness of seemingly disparate areas of mathematics.</p>

        <h3>Where does it come from?</h3>
        <p>Euler's identity is a special case of <strong>Euler's formula</strong>, which relates complex exponentials to trigonometric functions:</p>
        <div data-math-block data-latex="e^{i\\theta} = \\cos\\theta + i\\sin\\theta">e^{i\\theta} = \\cos\\theta + i\\sin\\theta</div>
        <p>This formula parameterizes the unit circle in the complex plane. As the angle <span data-math-inline data-latex="\\theta">\\theta</span> varies, <span data-math-inline data-latex="e^{i\\theta}">e^{i\\theta}</span> traces out the unit circle, with the real part equal to <span data-math-inline data-latex="\\cos\\theta">\\cos\\theta</span> and the imaginary part equal to <span data-math-inline data-latex="\\sin\\theta">\\sin\\theta</span>.</p>
        <p>When we substitute <span data-math-inline data-latex="\\theta = \\pi">\\theta = \\pi</span>, we get <span data-math-inline data-latex="\\cos\\pi = -1">\\cos\\pi = -1</span> and <span data-math-inline data-latex="\\sin\\pi = 0">\\sin\\pi = 0</span>, which gives us:</p>
        <div data-math-block data-latex="e^{i\\pi} = \\cos\\pi + i\\sin\\pi = -1">e^{i\\pi} = \\cos\\pi + i\\sin\\pi = -1</div>
        <p>Adding <span data-math-inline data-latex="1">1</span> to both sides immediately yields <span data-math-inline data-latex="e^{i\\pi} + 1 = 0">e^{i\\pi} + 1 = 0</span>.</p>

        <h3>Proof via Taylor Series</h3>
        <p>Euler's formula itself can be derived from the Taylor series expansions of the three functions:</p>
        <div data-math-block data-latex="e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!}, \\quad \\cos x = \\sum_{n=0}^{\\infty} \\frac{(-1)^n x^{2n}}{(2n)!}, \\quad \\sin x = \\sum_{n=0}^{\\infty} \\frac{(-1)^n x^{2n+1}}{(2n+1)!}">...</div>
        <p>Substituting <span data-math-inline data-latex="x = i\\theta">x = i\\theta</span> into the series for <span data-math-inline data-latex="e^x">e^x</span>, the powers of <span data-math-inline data-latex="i">i</span> cycle with period four (<span data-math-inline data-latex="i^0=1,\\; i^1=i,\\; i^2=-1,\\; i^3=-i">i^0=1, i^1=i, i^2=-1, i^3=-i</span>), so separating real and imaginary parts reproduces the cosine and sine series exactly — a remarkably elegant proof.</p>

        <h3>Why does it matter?</h3>
        <p>Euler's identity is more than beautiful — it is deeply practical. Using complex exponentials to handle trigonometric functions makes AC circuit analysis in electrical engineering far more concise, and is essential for expressing the phase of wave functions in quantum mechanics. The Fourier transform, used throughout signal processing, would not exist without Euler's formula. A single identity that threads through nearly every branch of mathematics, physics, and engineering.</p>
        `,
        pythagorean: `
        <h2>Pythagorean Theorem — The Cornerstone of Geometry</h2>
        <p>In a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides. This is the <strong>Pythagorean theorem</strong>, one of the oldest and most widely used results in all of mathematics:</p>
        <div data-math-block data-latex="a^2 + b^2 = c^2">a^2 + b^2 = c^2</div>
        <p>Here, <span data-math-inline data-latex="a">a</span> and <span data-math-inline data-latex="b">b</span> are the two legs adjacent to the right angle, and <span data-math-inline data-latex="c">c</span> is the hypotenuse — the longest side, opposite the right angle. The theorem is named after the ancient Greek mathematician Pythagoras, though Babylonian and Indian mathematicians knew the relationship long before him.</p>

        <h3>Visual Proof: Thinking in Areas</h3>
        <p>The most intuitive proof of the Pythagorean theorem uses <strong>area comparison</strong>. Draw a square on each side of the triangle: the areas of the two squares on the legs (<span data-math-inline data-latex="a^2">a^2</span> and <span data-math-inline data-latex="b^2">b^2</span>) sum to exactly the area of the square on the hypotenuse (<span data-math-inline data-latex="c^2">c^2</span>). Try double-clicking the formula block above and changing the values to see how this relationship holds visually.</p>
        <p>Another famous proof arranges four copies of the right triangle inside a large square of side <span data-math-inline data-latex="a + b">a + b</span>. The remaining inner region is <span data-math-inline data-latex="c^2">c^2</span> in one arrangement and <span data-math-inline data-latex="a^2 + b^2">a^2 + b^2</span> in another, proving the two are equal.</p>

        <h3>A Concrete Example: the 3-4-5 Triangle</h3>
        <p>The most famous Pythagorean triple is <span data-math-inline data-latex="(3, 4, 5)">3, 4, 5</span>. Let's verify:</p>
        <div data-math-block data-latex="3^2 + 4^2 = 9 + 16 = 25 = 5^2">3^2 + 4^2 = 9 + 16 = 25 = 5^2</div>
        <p>Other triples include <span data-math-inline data-latex="(5, 12, 13)">5, 12, 13</span>, <span data-math-inline data-latex="(8, 15, 17)">8, 15, 17</span>, and <span data-math-inline data-latex="(7, 24, 25)">7, 24, 25</span> — infinitely many exist. In general, for any positive integers <span data-math-inline data-latex="m > n">m > n</span>, the triple <span data-math-inline data-latex="(m^2 - n^2,\\; 2mn,\\; m^2 + n^2)">m^2 - n^2, 2mn, m^2 + n^2</span> always produces a valid Pythagorean triple.</p>

        <h3>Pythagoras in Everyday Life</h3>
        <p>The Pythagorean theorem extends far beyond the textbook. Builders use the 3-4-5 ratio to verify right angles on construction sites. Navigation systems compute straight-line distances between two points using this very theorem. The distance formula in computer graphics is a direct extension of it:</p>
        <div data-math-block data-latex="d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}">d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}</div>
        <p>In three dimensions it becomes <span data-math-inline data-latex="d = \\sqrt{\\Delta x^2 + \\Delta y^2 + \\Delta z^2}">d = \\sqrt{\\Delta x^2 + \\Delta y^2 + \\Delta z^2}</span>, used everywhere from game engines to calculating distances between stars in astronomy.</p>

        <h3>Connection to Fermat's Last Theorem</h3>
        <p>A natural question arises from the Pythagorean theorem: what if we raise the exponent above <span data-math-inline data-latex="2">2</span>? That is, does <span data-math-inline data-latex="a^n + b^n = c^n">a^n + b^n = c^n</span> have positive integer solutions for <span data-math-inline data-latex="n \\geq 3">n \\geq 3</span>? In 1637, Fermat famously claimed it does not, but left no proof. The problem stood unsolved for 358 years until Andrew Wiles finally proved it in 1995.</p>
        `,
      },
    },
  },
};
