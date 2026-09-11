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
| `fizzex/svg` | Vector typesetting with no DOM — for PDF/print servers | – (the font is passed in) |
| `fizzex/browser` | IIFE bundle of the PNG exporter, for injection into a headless browser | – |
| `fizzex/webfonts/*` | The math font files themselves (`.otf`, `.woff2`) | – |

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
                  //    message: 'Unknown command: \\e',
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
analysis.summary;                   // { variables: ['x'], degree: 2,
                                    //   functions: [], domains: ['polynomial'] }
```

`summary` carries **facts, not a sentence** — the analyzer does not know which
language you speak. Turn it into prose with `formatSummary`, which reads the
locale you loaded.

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

### Server-side rendering (SVG)

Typesets to vector SVG with no DOM, Canvas or headless browser — so it runs in a Node server.
Glyphs are emitted as outline `<path>` data, which means the output carries no font reference:
nothing to embed, nothing for the recipient to install.

The font is injected rather than discovered, so you choose the loader and the file. The math
font ships with the package under `fizzex/webfonts/`.

```ts
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { renderLatexToSVG } from 'fizzex/svg';

const font = opentype.loadSync(
  fileURLToPath(import.meta.resolve('fizzex/webfonts/NewCMMath-Regular.otf')),
);

const { svg, width, height, baseline } = renderLatexToSVG('\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', {
  font,
  fontSize: 22,
});
```

`baseline` is measured upward from the bottom edge — use it to sit the formula on a text
baseline when placing it inline.

`renderAstToSVG(ast, options)` takes an AST directly if you have already parsed it.

Any font object works as long as it exposes `unitsPerEm` and `charToGlyph()`; opentype.js's
`Font` satisfies this structurally. Fizzex does not depend on opentype.js — it is not a declared
peer, and you may use any loader that produces a compatible object. Note that opentype.js cannot
read `.woff2`, so use the `.otf` on the server and keep the `.woff2` for browsers.

### Rendering to PNG in a headless browser

If you need a raster image instead, `fizzex/browser` is an IIFE bundle you inject into a page
(Playwright, Puppeteer). Because such a page has no origin to resolve the default font URL
against, point it at a font you serve yourself:

```ts
const bundle = fileURLToPath(import.meta.resolve('fizzex/browser'));
await page.addScriptTag({ content: readFileSync(bundle, 'utf8') });
await page.evaluate(async (fontUrl) => {
  window.FizzexExport.setMathFontUrl(fontUrl);
  await window.FizzexExport.ensureFontsLoaded();
}, myServedFontUrl);
```

Prefer `fizzex/svg` when the destination is print or PDF — it is vector, needs no browser, and
the text stays sharp at any scale.

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

Framework-neutral — nothing here needs React, so Node, Vue and Svelte hosts can import it.

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

`FizzexI18nProvider` and the label hooks (`useFizzexLabels`, `useLocalizedSuggestions`, …) live here too.
The root does not export anything React; import components and the Provider from `fizzex/react`.

### `fizzex/tiptap`

- `MathInline`, `MathBlock`

### `fizzex/svg`

- `renderLatexToSVG`, `renderAstToSVG` — typeset to vector SVG
- Types: `MathFont`, `FontGlyph`, `FontGlyphPath`, `SvgRenderOptions`, `SvgRenderResult`

## Localization

Descriptions come in ten languages: `en` (default), `ko`, `ja`, `zh`, `ar`, `es`,
`fr`, `hi`, `id`, `pt`.

```tsx
import { FizzexI18nProvider } from 'fizzex/react';

<FizzexI18nProvider locale="ja">
  <EditorView />
</FizzexI18nProvider>
```

Outside React, load the language yourself:

```ts
import { loadLocale, setLocale } from 'fizzex';

await loadLocale('ja');
setLocale('ja');
```

**No language ships in the bundle.** One locale is about 570KB — ten would be
5.7MB that an English-only host still pays for. `loadLocale` pulls just the one
you ask for through a dynamic import, so your bundler emits a chunk per language
and downloads one. Until a locale is loaded, descriptions come back empty rather
than throwing.

Catalog matching reads only the locale-independent index, so the same formula
matches the same entry in every language. Diagnostics (parser warnings, thrown
errors) are always English — they are not written for the reader of a formula.

See [docs/i18n.md](docs/i18n.md) for what is and isn't translated, and how to add
a language.

## Compatibility

- Node.js **20+**
- React **19+** (for `fizzex/react`)
- Modern browsers with Canvas 2D and ES2020 support
- `fizzex/svg` and `fizzex/compute` need neither a DOM nor Canvas
- **ESM and CommonJS** — every entry point resolves under both `import` and `require`.
  Bundlers take the ESM build, so the CommonJS output never reaches a browser bundle.

## Links

- [Website & live demos](https://ibare.github.io/fizzex)
- [Plugin guide](https://ibare.github.io/fizzex/en/plugins) — integrate Fizzex into any host editor
- [GitHub](https://github.com/ibare/fizzex) — issues, roadmap, contributing

## License

MIT
