# Fizzex

> Canvas-based mathematical expression editor — light and easy formula input, like fizzy bubbles

**[Website](https://ibare.github.io/fizzex)** | **[GitHub](https://github.com/ibare/fizzex)**

## What's in a Name?

**Fizzex** = **Fizz** + **TeX**

- **Fizz**: The sound of bubbles rising in sparkling wine
- **TeX**: The gold standard for mathematical typesetting

Like a sparkling Prosecco, Fizzex is:
- **Light** — no complex setup, ready to use
- **Easy** — removes the friction of traditional math input
- **Delightful** — formulas naturally bubble into shape

## Features

```
┌─────────────────────────────────────────────────────────────┐
│                         Fizzex                              │
├─────────────────────────────────────────────────────────────┤
│  Input        │  LaTeX ←→ AST ←→ Editor                     │
├─────────────────────────────────────────────────────────────┤
│  Rendering    │  AST → Box Model → Canvas                   │
├─────────────────────────────────────────────────────────────┤
│  Analysis     │  AST → Analyzer → Domain/Variable/Viz       │
├─────────────────────────────────────────────────────────────┤
│  Computation  │  CAS (simplify, expand, factor, solve, ...) │
├─────────────────────────────────────────────────────────────┤
│  Visualization│  FunctionGraph │ UnitCircle │ NumberLine │...│
├─────────────────────────────────────────────────────────────┤
│  UX           │  Autocomplete │ Coefficient slider │ i18n   │
├─────────────────────────────────────────────────────────────┤
│  Integration  │  Headless adapter │ Tiptap │ Plugin system  │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install fizzex
```

## Subpath Exports

Fizzex provides multiple entry points for different use cases:

| Import | Purpose | Peer Dependencies |
|--------|---------|-------------------|
| `fizzex` | Core: parser, renderer, analysis, CAS | none |
| `fizzex/headless` | Framework-agnostic renderer & editor | none |
| `fizzex/react` | React components (MathCanvas, etc.) | `react`, `react-dom` |
| `fizzex/tiptap` | Tiptap editor extensions | `@tiptap/core` |

All peer dependencies are **optional** — import only what you need.

## Quick Start

### Headless Rendering (No Framework)

```typescript
import { FizzexRenderer } from 'fizzex/headless';

const renderer = new FizzexRenderer(container, {
  baseFontSize: 20,
  theme: 'light',
});
renderer.render('\\frac{1}{2} + x^2');
```

### Headless Editor (No Framework)

```typescript
import { FizzexEditor } from 'fizzex/headless';

const editor = new FizzexEditor(container, {
  baseFontSize: 20,
});
editor.setLatex('x^2 + 2x - 3 = 0');
editor.onChange((latex) => console.log(latex));
```

### React Editor

```tsx
import { MathCanvas } from 'fizzex/react';

function App() {
  return (
    <MathCanvas
      width={400}
      height={80}
      theme="light"
      showSuggestions
      onChange={(state) => console.log(state)}
    />
  );
}
```

### Tiptap Integration

```typescript
import { MathInline, MathBlock } from 'fizzex/tiptap';

const editor = new Editor({
  extensions: [
    StarterKit,
    MathInline.configure({ fizzexConfig: { baseFontSize: 18 } }),
    MathBlock.configure({ fizzexConfig: { baseFontSize: 24 }, editable: true }),
  ],
});
```

### LaTeX Conversion

```typescript
import { parseLatex, astToLatex } from 'fizzex';

const ast = parseLatex('\\frac{1}{2} + x^2');
const latex = astToLatex(ast);
```

### Expression Analysis

```typescript
import { parseLatex, analyzeExpression } from 'fizzex';

const ast = parseLatex('x^2 + 2x - 3 = 0');
const analysis = analyzeExpression(ast);

console.log(analysis.primaryDomain);           // 'polynomial'
console.log(analysis.polynomial?.degree);      // 2
console.log(analysis.visualization.bestFit);   // 'function-graph-2d'
```

### CAS (Computer Algebra System)

```typescript
import { parseLatex, simplify, expand, factor, solve, diff, integrate } from 'fizzex';

const ast = parseLatex('(x+1)^2');

const expanded = expand(ast);              // x^2 + 2x + 1
const derivative = diff(ast);             // 2(x+1) = 2x + 2

const equation = parseLatex('x^2 - 4 = 0');
const solutions = solve(equation);         // x = 2, x = -2
```

### Visualization

```tsx
import { FunctionGraph, UnitCircle, NumberLine, PolarGraph, AutoVisualizer } from 'fizzex';

<FunctionGraph expression="x^2 - 1" width={400} height={300} interactive />
<UnitCircle size={300} initialAngle={Math.PI / 4} interactive />
<NumberLine points={[{ value: 3, label: '3' }]} range={[-5, 8]} />
<PolarGraph expression="1 + \\cos(\\theta)" size={300} />
<AutoVisualizer analysis={analysis} latex={latex} showSelector />
```

## Plugin Architecture

Fizzex uses a three-layer architecture that makes it easy to integrate into any host editor:

```
fizzex (Core)
  │  Parser, renderer, analysis, CAS — framework-agnostic
  │
  ├── fizzex/headless
  │     FizzexRenderer (read-only) & FizzexEditor (interactive)
  │     Give it a DOM element — it handles everything
  │
  └── fizzex/tiptap, fizzex/slate, ...
        Thin wrappers (~20 lines) over the headless adapter
```

### Building Your Own Plugin

Any editor that supports custom node rendering can integrate Fizzex:

```typescript
// 1. Get a container from your host editor
const container = nodeView.dom;

// 2. Create a renderer
const renderer = new FizzexRenderer(container, { baseFontSize: 20 });

// 3. Render when data changes
renderer.render(node.attrs.latex);

// 4. Clean up
renderer.destroy();
```

See the [Plugins page](https://ibare.github.io/fizzex/en/plugins) for the full guide and live Tiptap demo.

## API Reference

### Core (`fizzex`)

```typescript
// Editor
import { MathEditor, createInitialState, createStateFromLatex } from 'fizzex';

// LaTeX
import { parseLatex, astToLatex } from 'fizzex';

// Analysis & CAS
import { analyzeExpression, matchVisualization } from 'fizzex';
import { simplify, expand, factor, solve, diff, integrate, evaluate } from 'fizzex';

// Node creators
import {
  createNumber, createVariable, createOperator,
  createFrac, createPower, createParen, createSubscript,
  createAbs, createSqrt, createFunc,
  createIntegral, createSum, createLimit, createProduct,
  createOverline, createMatrix, createText,
} from 'fizzex';
```

### Headless (`fizzex/headless`)

```typescript
import { FizzexRenderer, FizzexEditor } from 'fizzex/headless';
import type { FizzexConfig, FizzexSize, FizzexChangeHandler } from 'fizzex/headless';
```

### React (`fizzex/react`)

```typescript
import {
  MathCanvas, StructureViewer,
  SuggestionChips, SuggestionPopover,
  FunctionGraph, UnitCircle, NumberLine, PolarGraph, AutoVisualizer,
  FizzexI18nProvider,
} from 'fizzex/react';
```

### Tiptap (`fizzex/tiptap`)

```typescript
import { MathInline, MathBlock } from 'fizzex/tiptap';
import type { MathInlineOptions, MathBlockOptions } from 'fizzex/tiptap';
```

### Types

```typescript
import type {
  // AST
  MathNode, RootNode, NumberNode, VariableNode, OperatorNode,
  FracNode, PowerNode, SubscriptNode, SqrtNode, ParenNode, AbsNode,
  FuncNode, IntegralNode, SumNode, LimitNode, ProductNode,
  OverlineNode, MatrixNode, TextNode,
  // Editor
  EditorState, CursorPosition,
  // Analysis
  ExpressionAnalysis, VariableClassification, VisualizationType,
  // CAS
  CASResult, CASOperation,
  // Visualization
  GraphConfig, GraphRange,
} from 'fizzex';
```

## Architecture

```
src/
├── types.ts              # AST type definitions (MathNode, EditorState)
├── editor.ts             # Editor logic (keyboard input, node creation)
├── headless/             # Headless adapter layer
│   ├── renderer.ts       # FizzexRenderer — read-only rendering
│   ├── editor-view.ts    # FizzexEditor — interactive editor
│   └── types.ts          # FizzexConfig, FizzexSize
├── integrations/         # Host editor plugins
│   └── tiptap/           # Tiptap extensions (MathInline, MathBlock)
├── box/                  # Box model (TeX-style layout)
│   ├── types.ts          # Box type definitions
│   ├── constants.ts      # TeX constants
│   ├── font-metrics.ts   # Font metrics (LRU cached)
│   ├── box-builder.ts    # Box creation helpers
│   ├── box-layout.ts     # Layout calculation
│   ├── projector.ts      # Box → Surface projection
│   ├── surface.ts        # Projection target abstraction
│   └── ast-to-box.ts     # AST → Box conversion
├── latex/                # LaTeX support
│   ├── latex-parser.ts   # LaTeX → AST parser
│   ├── ast-to-latex.ts   # AST → LaTeX conversion
│   ├── node-factory.ts   # Generic node creation factory
│   ├── command-registry.ts  # Command registry (187+ commands)
│   └── commands/         # Modularized command handlers
├── suggestion/           # Context-aware autocomplete
├── analyzer/             # Expression analysis (9 modules)
├── cas/                  # Computer Algebra System (Nerdamer)
├── visualizer/           # Visualization components
├── fonts/                # New Computer Modern Math font management
├── i18n/                 # Internationalization
├── export/               # PNG export
├── utils/                # LRU cache, ID generation, benchmarks
└── react/                # React components
```

## Development

### Requirements

- Node.js 20+
- pnpm 8+

### Setup

```bash
pnpm install
pnpm dev       # Type watch mode
pnpm demo      # Run demo app
```

### Test

```bash
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
pnpm test:layout      # TeX layout compliance check
```

### Build

```bash
pnpm build       # Full build (tsc + vite)
pnpm typecheck   # Type check only
```

### Website

```bash
cd website
pnpm install
pnpm dev         # Local dev server
pnpm build       # Production build
```

The website is deployed to [GitHub Pages](https://ibare.github.io/fizzex) automatically on push to main.

## TODO

### Layout Engine (TeX Compliance)

- [ ] **Atom spacing matrix** — Implement TeX's 8x8 atom spacing matrix (Ord, Op, Bin, Rel, Open, Close, Punct, Inner) with style-dependent suppression. Currently uses single `operatorSpacing: 0.2em` for all operators. Required for correct Rel spacing (5mu), Bin spacing (4mu), script-style suppression, and Bin-to-Ord conversion for unary operators.
- [ ] **Super/subscript gap condition** (TeX Rule 18e) — When both super and subscript are present, enforce minimum gap of 4*xi8 between them, and ensure superscript bottom >= 4/5 * xHeight. Requires combined detection of simultaneous super/subscript in parser or layout.

### Rendering

- [ ] **Composite glyph rendering pipeline** — Currently only single Unicode codepoint → glyph rendering is supported. Negated symbols like `\npreceq` (⪯ + slash) and `\not\equiv` require a slash overlay compositing pipeline to match KaTeX/MathJax. Currently falls back to the closest precomposed Unicode character (e.g. ⋠ U+22E0), which causes visual differences due to mismatched equality styles (`\preceq`=⪯ straight vs `\npreceq`=⋠ tilde).
- [ ] **Extensible arrow commands** (`\xleftarrow`, `\xrightarrow`) — Arrows that stretch to fit argument text width, with text placed above/below. Requires a new Box type (arrow + text layout), dynamic arrow length calculation, and rule + arrowhead rendering.
- [ ] **`\left`/`\right` named delimiter support** — Currently `\left`/`\right` only recognizes single-character delimiters like `(`, `)`, `[`, `]`, `\{`, `\}`, `|`. Needs parsing logic in `leftHandler` for backslash command delimiters such as `\left\langle`…`\right\rangle`, `\left\lceil`…`\right\rceil`.
- [ ] **`\left\|`…`\right\|` double vertical bar delimiter** — Recognize `\|` as a delimiter after `\left`/`\right` and render ‖ (double vertical bar) that stretches to match content height. Requires extending `leftHandler` delimiter parsing + adding ‖ extensible data to delimiter-paths.
- [ ] **Fixed-size delimiters** (`\big`, `\Big`, `\bigg`, `\Bigg`) — Four fixed-size delimiter commands. Requires scale factor definitions per size, a new CommandHandler to parse the next token as a delimiter, and Box rendering logic for sized delimiters.
- [ ] **Wide accent rendering** (`\widetilde`, `\widehat`) — Currently rendered as a single glyph (˜, ˆ) placed over only the first character. Needs extensible accent rendering that stretches to cover the full content width, using OpenType MATH table MathGlyphVariantRecord or rule-based dynamic drawing.
- [ ] **Overbrace/Underbrace** (`\overbrace{...}^{...}`, `\underbrace{...}_{...}`) — Draws an extensible brace above/below content with annotation text above/below the brace. Requires a new AST node type + extensible brace rendering + annotation layout.
- [ ] **Extensible over-arrow** (`\overleftarrow`, `\overrightarrow`, `\overleftrightarrow`) — Arrows placed above content that stretch to match content width. Currently `\overrightarrow` maps to a single `\vec` glyph covering only the first character. Requires rule + arrowhead extensible rendering.
- [ ] **Stackrel/Overset/Underset** (`\stackrel`, `\overset`, `\underset`) — Structure commands that place text above/below a symbol. Requires a new AST node type + VBox-based layout + reduced font size rendering.
- [ ] **Boxed** (`\boxed`) — Draws a rectangular border around an expression. Requires stroke rectangle rendering on Box output. Can be implemented as a new AST node type or an accent variant.
- [ ] **Cancel family** (`\cancel`, `\bcancel`, `\xcancel`) — Draws diagonal lines or X marks over an expression. Requires a new AST node type + Canvas path-based diagonal rendering. Originates from the `cancel` package.
- [ ] **Simultaneous super/subscript alignment** (`x^a_b`) — Optimize vertical alignment when both superscript and subscript are present. Currently processed independently, resulting in different spacing compared to KaTeX/MathJax. Requires unifying super/subscripts into a single SupersubNode structure. See also "Super/subscript gap condition" in Layout Engine TODO.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT
