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
│  Visualization│  Catalog-matched interactive visualizers        │
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
| `fizzex/react` | React components (EditorView, etc.) | `react`, `react-dom` |
| `fizzex/tiptap` | Tiptap editor extensions | `@tiptap/core` |

All peer dependencies are **optional** — import only what you need.

## Quick Start

### Headless Rendering (No Framework)

```typescript
import { DOMRendererView } from 'fizzex/headless';

const renderer = new DOMRendererView(container, {
  baseFontSize: 20,
  theme: 'light',
});
renderer.render('\\frac{1}{2} + x^2');
```

### Headless Editor (No Framework)

```typescript
import { DOMEditorView } from 'fizzex/headless';

const editor = new DOMEditorView(container, {
  baseFontSize: 20,
});
editor.setLatex('x^2 + 2x - 3 = 0');
editor.onChange((latex) => console.log(latex));
```

### React Editor

```tsx
import { EditorView } from 'fizzex/react';

function App() {
  return (
    <EditorView
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
console.log(analysis.visualization.graphable2D); // true
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

```typescript
import {
  parseLatex,
  buildSemanticMap,
  getVisualizersForCatalog,
  createVisualizer,
  createVisualizerRegistry,
} from 'fizzex';
import { ExplorerOverlay } from 'fizzex/headless';

// The host supplies the visualizer registry — Fizzex does not ship a default CDN.
// Two options:
//   (a) Point `baseUrl` at the bundled spec assets shipped inside the package
//       (`fizzex/visualizers/manifest.json` + spec.json files). No external hosting required.
//   (b) Point `baseUrl` at wherever your host publishes manifest.json + spec files.
const registry = createVisualizerRegistry({
  baseUrl: new URL('fizzex/visualizers/', import.meta.url).href,
});

// One formula can have multiple independent visualizers (2D, 3D, etc.)
const ast = parseLatex('T^2 = \\frac{4\\pi^2}{GM} a^3');
const semanticMap = buildSemanticMap(ast);
const catalogId = semanticMap.get(ast.id)?.catalogId;

// Discover every visualizer linked to this formula
const refs = catalogId ? getVisualizersForCatalog(catalogId) : [];
// refs: [{ id: 'kepler-orbit-2d', name: '지구 궤도 — 2D', ... },
//        { id: 'kepler-orbit-3d', name: '지구 궤도 — 3D', ... }]

// Mount on demand — registry fetches the spec JSON and picks the renderer chunk.
const instance = refs[0]
  ? await createVisualizer(container, {
      registry,
      id: refs[0].id,
      width: 400,
      height: 400,
    })
  : null;

// Or let ExplorerOverlay surface them as toggleable banner buttons
const overlay = new ExplorerOverlay({ ast, theme: 'light', visualizerRegistry: registry });
```

## Plugin Architecture

Fizzex uses a three-layer architecture that makes it easy to integrate into any host editor:

```
fizzex (Core)
  │  Parser, renderer, analysis, CAS — framework-agnostic
  │
  ├── fizzex/headless
  │     DOMRendererView (read-only) & DOMEditorView (interactive)
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
const renderer = new DOMRendererView(container, { baseFontSize: 20 });

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
import { analyzeExpression } from 'fizzex';
import { simplify, expand, factor, solve, diff, integrate, evaluate } from 'fizzex';

// Visualization
import {
  createVisualizer,
  createVisualizerRegistry,
  getVisualizersForCatalog,
} from 'fizzex';

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
import { DOMRendererView, DOMEditorView } from 'fizzex/headless';
import type { FizzexConfig, FizzexSize, FizzexChangeHandler } from 'fizzex/headless';
```

### React (`fizzex/react`)

```typescript
import {
  EditorView, StreamView,
  SuggestionChips, SuggestionPopover,
  ExpressionExplorer,
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
│   ├── renderer.ts       # DOMRendererView — read-only rendering
│   ├── editor-view.ts    # DOMEditorView — interactive editor
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
