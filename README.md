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
| `fizzex/compute` | Parsing, evaluation & analysis with no DOM — for Node workers and other headless contexts | – |
| `fizzex/semantic` | Structural meaning of an expression, with its description catalog | – |
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

The parser is tolerant — it keeps going past input it does not recognize so that
partial input stays renderable while the user types. It reports what it skipped
in `warnings`, so **check them**; an unknown command produces an empty node
rather than an error:

```ts
const r = parseLatex('\\e');
r.ast.children;   // []  ← nothing was produced
r.hasErrors;      // false
r.warnings;       // [{ type: 'unknown_command', severity: 'warning', position: 0,
                  //    message: '알 수 없는 명령어: \\e',  // diagnostics are Korean
                  //    context: '\\e\\n^', token: 'e' }]
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

Two analyses answer different questions, and it is easy to mistake one for the
other:

```ts
import { analyzeEvaluability, analyzeBindings } from 'fizzex';

const { ast } = parseLatex('\\pi \\cdot x');

analyzeEvaluability(ast);  // { evaluable: true, unsupported: [] }
analyzeBindings(ast);      // { required: ['x'], constants: ['π'] }
```

`evaluable: true` means **every node type is supported by the evaluator** — not
that a value will come out. The expression above is `evaluable` while still
needing two symbols supplied. A matrix, by contrast, reports
`{ evaluable: false, unsupported: ['matrix'] }`.

Use `analyzeEvaluability` to decide whether evaluation is worth attempting, and
`analyzeBindings` to decide what to ask the user for.

### Numeric evaluation

> **The host supplies every symbol — including mathematical constants.**
> `evaluateSync` does not auto-bind `π` or `e`. Ask `analyzeBindings` what a
> given expression needs, then supply it. This is deliberate: constants must be
> editable so a learner can ask "what if π were 3?".

```ts
import {
  parseLatex,
  evaluateSync,
  evaluate,
  analyzeBindings,
  MATH_CONSTANT_VALUES,
  evaluateMatrixSync,
  evaluateComplexSync,
  differentiateAt,
} from 'fizzex';

// Scalar
const { ast } = parseLatex('x^2 + 2x - 3');
evaluateSync(ast, { x: 2 });              // 5

// Constants are symbols too — unbound ones yield no value
const pie = parseLatex('\\pi \\cdot e').ast;
analyzeBindings(pie);                     // { required: [], constants: ['e', 'π'] }
evaluateSync(pie);                        // undefined  ← nothing was supplied
evaluateSync(pie, { 'π': Math.PI, e: Math.E });   // 8.539734222673566

// `evaluate` tells you *why* it failed; `evaluateSync` only returns undefined
evaluate(pie);
// { ok: false, status: 'unbound', detail: { variable: 'π' } }
//   ^ reports the first unbound symbol it reaches; check `status`, not the name

// MATH_CONSTANT_VALUES holds the standard values, keyed by normalized name.
// Pick the ones you mean — do NOT spread the whole map: φ, ϕ and γ are commonly
// free variables (angle, phase, Lorentz factor), and blanket-binding them turns
// a user's angle φ into the golden ratio silently.
// Lookups are `number | undefined`: ∞ has no usable value, so filter.
const circle = parseLatex('\\pi \\cdot r^2').ast;
const { required, constants } = analyzeBindings(circle);  // ['r'], ['π']

const supplied: Record<string, number> = {};
for (const name of constants) {
  const v = MATH_CONSTANT_VALUES[name];
  if (v !== undefined) supplied[name] = v;
}

evaluateSync(circle, { ...supplied, r: 2 });   // 12.566370614359172

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
  getVisualizersForForm,
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
const formId = buildSemanticMap(ast).get(ast.id)?.formId;
const refs = formId ? getVisualizersForForm(formId) : [];

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
- **Visualization** — `createVisualizer`, `createVisualizerRegistry`, `getVisualizersForForm`
- **Types** — `MathNode`, `EditorState`, `ExpressionAnalysis`, `Bindings`, `EvalResult`, `Matrix`, `Complex`, `Dual`, …

### `fizzex/compute`

Everything here runs without a DOM, a canvas, or a framework — import it from a Node worker
where `react` is not installed.

- **Parser** — `parseLatex`, `astToLatex`, plus `LatexParseResult` / `ParseError` types
- **Tolerant parser** — `tolerantParse`, `determineRenderMode` — parses incomplete input into a partial AST
- **Streaming parser** — `StreamTokenizer`, `FizzexStreamParser` — for LaTeX arriving in chunks
- **Evaluator** — `evaluateSync` / `evaluate`, `evaluateMatrixSync` / `evaluateMatrix`, `evaluateComplexSync` / `evaluateComplex`, `differentiateAt` / `differentiate`, `analyzeBindings`, `analyzeEvaluability`
- **Analyzer** — `analyzeExpression`, `analyzePolynomialProfile`, `classifyVariables`, `detectDomains`, `findNodes`
- **Types** — every `MathNode` union member, so consumers walking the AST can name each branch

```js
import { parseLatex, evaluateSync, differentiateAt } from 'fizzex/compute';

const { ast, hasErrors } = parseLatex('x^2 + 3x - 1');
evaluateSync(ast, { x: 2 });          // 9
differentiateAt(ast, 'x', { x: 2 });  // 7
```

One thing to know before sending results across a worker boundary:

**Node ids are only unique within one AST.** `parseLatex()` resets the id counter on every
call, so nodes parsed from two different expressions collide (`x^2+2x-3=0` and `y=mx+b` share
seven ids). Key your own state by expression, not by node id alone.

Results themselves travel fine: every return value is a plain object or a finite `number`,
so `structuredClone` — and `postMessage` with it — accepts them. Non-finite results never
escape; `evaluateSync` returns `undefined` and `evaluate` reports `{ ok: false, status:
'divergent' }` instead.

### `fizzex/semantic`

- `getSemanticMeaning`, `buildSemanticMap`, `buildAstAncestorMap`, `getCatalogDetail`, `getVisualizersForForm`

Split out from `fizzex/compute` because it carries the description catalog — around 500 KB of
JSON that a worker doing arithmetic has no reason to load.

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
