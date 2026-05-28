# Fizzex

> Canvas-based mathematical expression editor — light, fast, framework-agnostic.

**[Website](https://ibare.github.io/fizzex)** · **[GitHub](https://github.com/ibare/fizzex)**

---

## Installation

```bash
npm install fizzex
```

## Entry Points

| Import | Purpose | Peer dependencies |
|---|---|---|
| `fizzex` | Core — parser, renderer, analyzer, evaluator | – |
| `fizzex/headless` | Framework-agnostic renderer & editor | – |
| `fizzex/react` | React components | `react`, `react-dom` |
| `fizzex/tiptap` | Tiptap extensions | `@tiptap/core` |

All peer dependencies are optional — import only what you need.

## Quick Start

### Headless rendering (read-only)

```ts
import { DOMRendererView } from 'fizzex/headless';

const renderer = new DOMRendererView(container, {
  baseFontSize: 20,
  theme: 'light',
});
renderer.render('\\frac{1}{2} + x^2');
```

### Headless editor (interactive)

```ts
import { DOMEditorView } from 'fizzex/headless';

const editor = new DOMEditorView(container, { baseFontSize: 20 });
editor.setLatex('x^2 + 2x - 3 = 0');
editor.onChange((latex) => console.log(latex));
```

### React

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

### Tiptap

```ts
import { MathInline, MathBlock } from 'fizzex/tiptap';

const editor = new Editor({
  extensions: [
    StarterKit,
    MathInline.configure({ fizzexConfig: { baseFontSize: 18 } }),
    MathBlock.configure({ fizzexConfig: { baseFontSize: 24 }, editable: true }),
  ],
});
```

### LaTeX ↔ AST

```ts
import { parseLatex, astToLatex } from 'fizzex';

const { ast } = parseLatex('\\frac{1}{2} + x^2');
const latex = astToLatex(ast);
```

### Expression analysis

```ts
import { parseLatex, analyzeExpression } from 'fizzex';

const { ast } = parseLatex('x^2 + 2x - 3 = 0');
const analysis = analyzeExpression(ast);

analysis.primaryDomain;             // 'polynomial'
analysis.polynomial?.degree;        // 2
analysis.visualization.graphable2D; // true
```

### Numeric evaluation

```ts
import {
  parseLatex,
  evaluateSync,
  evaluateMatrixSync,
  evaluateComplexSync,
  differentiateAt,
} from 'fizzex';

// Scalar
const { ast } = parseLatex('x^2 + 2x - 3');
evaluateSync(ast, { x: 2 });              // 5

// Automatic differentiation (forward-mode dual numbers)
differentiateAt(ast, 'x', { x: 2 });       // 6

// Complex (Euler's identity). LaTeX commands like `\pi` are normalized
// to their Unicode form, so the binding key is 'π', not '\pi'.
const euler = parseLatex('e^{i \\pi}').ast;
evaluateComplexSync(euler, { e: Math.E, 'π': Math.PI });
// { re: -1, im: ~0 }

// Matrix
const m = parseLatex('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}').ast;
evaluateMatrixSync(m, {});
// { rows: 2, cols: 2, data: [[1,2],[3,4]] }
```

### Visualization

```ts
import {
  parseLatex,
  buildSemanticMap,
  getVisualizersForCatalog,
  createVisualizer,
  createVisualizerRegistry,
} from 'fizzex';

// The host hosts the visualizer assets (manifest.json + spec files) as
// static resources and points `baseUrl` at the directory URL. You can
// either reuse the bundled catalog shipped at
// `node_modules/fizzex/dist/visualizers/` (copy/proxy it to your public
// path) or publish your own catalog.
const registry = createVisualizerRegistry({
  baseUrl: '/visualizers/',
});

const { ast } = parseLatex('T^2 = \\frac{4\\pi^2}{GM} a^3');
const catalogId = buildSemanticMap(ast).get(ast.id)?.catalogId;
const refs = catalogId ? getVisualizersForCatalog(catalogId) : [];

const instance = refs[0]
  ? await createVisualizer(container, {
      registry,
      id: refs[0].id,
      width: 400,
      height: 400,
    })
  : null;
```

## What's exported

### `fizzex`

- **Parser** — `parseLatex`, `astToLatex`
- **Editor primitives** — `MathEditor`, `createInitialState`, `createStateFromLatex`, node creators (`createNumber`, `createFrac`, `createIntegral`, `createMatrix`, …)
- **Analyzer** — `analyzeExpression`, `analyzeBindings`, `analyzeEvaluability`, `buildSemanticMap`
- **Evaluator** — `evaluateSync` / `evaluate`, `evaluateMatrixSync` / `evaluateMatrix`, `evaluateComplexSync` / `evaluateComplex`, `differentiateAt` / `differentiate`
- **Visualization** — `createVisualizer`, `createVisualizerRegistry`, `getVisualizersForCatalog`
- **Types** — `MathNode`, `EditorState`, `ExpressionAnalysis`, `Bindings`, `EvalResult`, `Matrix`, `Complex`, `Dual`, …

### `fizzex/headless`

- **Renderers** — `DOMRendererView`, `DOMEditorView`, `DOMStreamView`
- **Explorer** — `ExplorerOverlay`, `ExplorerInlineControls`, `ExplorerSceneChips`, `ExplorerVisualizerController`
- **Modification utilities** — `cloneAst`, `createModificationState`, `modifyNumberNode`, `resetNode`, `resetAll`, `hasModifications`, `getControlType`, `buildInlineControlConfig`, `buildConfidenceRegions`, `classifyConfidence`

### `fizzex/react`

- `EditorView`, `StreamView`, `SuggestionChips`, `SuggestionPopover`, `ExpressionExplorer`

### `fizzex/tiptap`

- `MathInline`, `MathBlock`

## Compatibility

- Node.js **20+**
- React **19+** (for `fizzex/react`)
- Modern browsers with Canvas 2D and ES2020 support

## Links

- [Website & live demos](https://ibare.github.io/fizzex)
- [Plugin guide](https://ibare.github.io/fizzex/en/plugins) — integrate Fizzex into any host editor
- [GitHub](https://github.com/ibare/fizzex) — issues, roadmap, contributing

## License

MIT
