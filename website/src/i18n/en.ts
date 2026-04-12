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
      'Integrated CAS: simplify, solve, differentiate, integrate',
      'Auto-visualization recommends the right chart for any expression',
    ],
  },
  pipeline: {
    title: 'One library, full pipeline',
    sub: 'From LaTeX input to interactive visualization — a clean, testable pipeline.',
    steps: {
      input: { label: 'Input', desc: 'LaTeX string or keyboard-driven editor' },
      parse: { label: 'Parse', desc: 'Bidirectional LaTeX-AST conversion, 187+ commands' },
      analyze: { label: 'Analyze', desc: 'Domain detection, variable classification, feature extraction' },
      compute: { label: 'Compute', desc: 'Simplify, expand, factor, solve, differentiate, integrate' },
      visualize: { label: 'Visualize', desc: 'Function graphs, unit circles, number lines, polar plots' },
    },
  },
  features: {
    title: 'Everything you need for math on the web',
    sub: 'From input to visualization, one package covers the full pipeline.',
    editor: {
      title: 'Canvas Editor',
      desc: 'Keyboard-driven math input rendered on HTML Canvas with TeX-quality box model layout. No DOM overhead.',
    },
    latex: {
      title: 'LaTeX Parser',
      desc: 'Bidirectional LaTeX-AST conversion with 187+ commands. Parse, transform, and serialize back.',
    },
    analysis: {
      title: 'Expression Analyzer',
      desc: 'Detect mathematical domains, classify variables, extract features, and auto-recommend visualizations.',
    },
    cas: {
      title: 'Computer Algebra',
      desc: 'Simplify, expand, factor, solve equations, differentiate, and integrate — powered by Nerdamer.',
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
  comparison: {
    title: 'How Fizzex compares',
    sub: 'Not just another renderer — a complete math expression platform.',
    headers: {
      feature: 'Feature',
      katex: 'KaTeX',
      mathjax: 'MathJax',
      mathlive: 'MathLive',
      fizzex: 'Fizzex',
    },
    rows: {
      rendering: { label: 'Rendering', values: ['CSS/DOM', 'SVG/DOM', 'DOM', 'Canvas'] },
      editing: { label: 'Editing', values: ['-', '-', 'Yes', 'Yes'] },
      latex_parse: { label: 'LaTeX Parse', values: ['Yes', 'Yes', 'Yes', 'Yes'] },
      analysis: { label: 'Expression Analysis', values: ['-', '-', '-', 'Yes'] },
      cas: { label: 'CAS (Algebra)', values: ['-', '-', '-', 'Yes'] },
      visualization: { label: 'Visualization', values: ['-', '-', '-', 'Yes'] },
      autocomplete: { label: 'Autocomplete', values: ['-', '-', 'Basic', 'Context-aware'] },
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
      cas: 'CAS',
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
      visualization: 'Recommended Viz',
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
      compute: { title: 'Compute', desc: 'CAS operations applied to the expression' },
      visualize: { title: 'Visualize', desc: 'Auto-selected visualization for the expression' },
    },
    click_to_expand: 'Click to expand',
    no_cas: 'No CAS operations applicable for this expression.',
    no_viz: 'No visualization available for this expression.',
    loading: 'Computing...',
  },
  examples: {
    title: 'Examples Gallery',
    sub: 'Explore expressions by mathematical domain. Click Render to see Fizzex in action.',
    render_btn: 'Render',
    collapse_btn: 'Collapse',
    analysis_label: 'Analysis',
    visualization_label: 'Visualization',
    categories: {
      polynomial: 'Polynomial',
      trigonometric: 'Trigonometric',
      calculus: 'Calculus',
      inequality: 'Inequality',
      polar: 'Polar',
      structures: 'Matrix & Structures',
      complex: 'Complex Formulas',
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
    categories: {
      fractions: 'Fractions',
      powers: 'Powers & Roots',
      trig: 'Trigonometric',
      integrals: 'Integrals',
      sigma: 'Sigma / Sum',
      limits: 'Limits',
      greek: 'Greek Letters',
      matrices: 'Matrices',
      complex: 'Complex Formulas',
      sets: 'Set Theory & Logic',
    },
  },
  pluginSection: {
    title: 'Plug into any editor',
    sub: 'A headless adapter layer lets you integrate Fizzex into any host editor with minimal code.',
    layer_core: {
      title: 'Core',
      desc: 'Parser, renderer, analysis, CAS — the full math engine',
    },
    layer_headless: {
      title: 'Headless Adapter',
      desc: 'FizzexRenderer & FizzexEditor — mount to any DOM element',
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
      core_desc: 'LaTeX parser, TeX box model renderer, expression analyzer, CAS engine, visualization components. Framework-agnostic, no DOM dependency.',
      headless_title: 'fizzex/headless',
      headless_desc: 'FizzexRenderer for read-only rendering and FizzexEditor for interactive editing. Give it a DOM element — it handles Canvas setup, HiDPI scaling, font loading, and the full rendering pipeline.',
      plugins_title: 'fizzex/tiptap, fizzex/slate, ...',
      plugins_desc: 'Thin wrappers that connect the headless adapter to a specific host editor. Each plugin is typically 20-30 lines of code.',
      philosophy: 'The headless layer does the heavy lifting so that plugin authors only write host-specific glue code.',
    },
    api: {
      title: 'Headless API',
      sub: 'Two classes cover all integration needs.',
      renderer_title: 'FizzexRenderer',
      renderer_desc: 'Read-only math rendering. Pass a container element and a LaTeX string.',
      editor_title: 'FizzexEditor',
      editor_desc: 'Interactive math editor with keyboard input, cursor, IME support, and auto-complete.',
      config_title: 'FizzexConfig',
    },
    guide: {
      title: 'Build Your Own Plugin',
      sub: 'Three steps to integrate Fizzex into any editor.',
      step1_title: '1. Get a container',
      step1_desc: 'Your host editor provides a DOM element for custom node rendering (NodeView, Element, etc.).',
      step2_title: '2. Create a renderer',
      step2_desc: 'Instantiate FizzexRenderer or FizzexEditor with the container and your config.',
      step3_title: '3. Manage lifecycle',
      step3_desc: 'Call render() when data changes, destroy() when the node is removed.',
      tiptap_example: 'Tiptap plugin — complete implementation',
      outro: 'This same pattern works for Slate, ProseMirror, Quill, CodeMirror, or any editor that supports custom node rendering.',
    },
    demo: {
      title: 'Tiptap Live Demo',
      sub: 'A real Tiptap editor with MathInline and MathBlock extensions powered by Fizzex.',
      instructions: 'This is a live Tiptap editor. You can freely edit the text. Double-click any block formula to edit it.',
      content: `
        <h2>Euler's Identity — The Most Beautiful Equation</h2>
        <p>In 1748, Leonhard Euler discovered a profound connection between the five most fundamental constants in mathematics. The result is known as <strong>Euler's identity</strong>:</p>
        <div data-math-block data-latex="e^{i\\pi} + 1 = 0">e^{i\\pi} + 1 = 0</div>
        <p>This single equation unifies the additive identity <span data-math-inline data-latex="0">0</span>, the multiplicative identity <span data-math-inline data-latex="1">1</span>, the base of natural logarithms <span data-math-inline data-latex="e">e</span>, the imaginary unit <span data-math-inline data-latex="i">i</span>, and the ratio of a circle's circumference to its diameter <span data-math-inline data-latex="\\pi">\\pi</span>.</p>
        <h3>Where does it come from?</h3>
        <p>Euler's identity is a special case of <strong>Euler's formula</strong>, which relates complex exponentials to trigonometric functions:</p>
        <div data-math-block data-latex="e^{i\\theta} = \\cos\\theta + i\\sin\\theta">e^{i\\theta} = \\cos\\theta + i\\sin\\theta</div>
        <p>When we substitute <span data-math-inline data-latex="\\theta = \\pi">\\theta = \\pi</span>, we get <span data-math-inline data-latex="\\cos\\pi = -1">\\cos\\pi = -1</span> and <span data-math-inline data-latex="\\sin\\pi = 0">\\sin\\pi = 0</span>, which gives us:</p>
        <div data-math-block data-latex="e^{i\\pi} = \\cos\\pi + i\\sin\\pi = -1">e^{i\\pi} = \\cos\\pi + i\\sin\\pi = -1</div>
        <p>Rearranging yields the identity. Euler's formula itself can be derived from the Taylor series expansions:</p>
        <div data-math-block data-latex="e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!}, \\quad \\cos x = \\sum_{n=0}^{\\infty} \\frac{(-1)^n x^{2n}}{(2n)!}, \\quad \\sin x = \\sum_{n=0}^{\\infty} \\frac{(-1)^n x^{2n+1}}{(2n+1)!}">...</div>
        <p>Substituting <span data-math-inline data-latex="x = i\\theta">x = i\\theta</span> into the series for <span data-math-inline data-latex="e^x">e^x</span> and separating real and imaginary parts reproduces the cosine and sine series — a remarkably elegant proof.</p>
      `,
    },
  },
};
