export const snippets = {
  install: `npm install fizzex`,

  editor: `import { EditorView } from 'fizzex/react';

function App() {
  return (
    <EditorView
      width={400}
      height={80}
      theme="light"
      onChange={(state) => console.log(state)}
    />
  );
}`,

  latex: `import { parseLatex, astToLatex } from 'fizzex';

// LaTeX → AST
const ast = parseLatex('\\\\frac{1}{2} + x^2');

// AST → LaTeX
const latex = astToLatex(ast);`,

  analysis: `import { parseLatex, analyzeExpression } from 'fizzex';

const ast = parseLatex('x^2 + 2x - 3 = 0');
const analysis = analyzeExpression(ast);

analysis.primaryDomain;           // 'polynomial'
analysis.polynomial?.degree;      // 2
analysis.visualization.graphable2D; // true`,

  evaluator: `import {
  parseLatex,
  evaluateSync,
  evaluateComplexSync,
  differentiateAt,
} from 'fizzex';

const { ast } = parseLatex('x^2 + 2x - 3');

// Scalar evaluation with bindings
evaluateSync(ast, { x: 2 });       // 5

// Complex number evaluation
const c = parseLatex('e^{i \\\\pi}').ast;
evaluateComplexSync(c, { e: Math.E, '\\\\pi': Math.PI });
// { re: -1, im: 0 } (Euler's identity)

// Automatic differentiation (forward-mode)
differentiateAt(ast, 'x', { x: 2 }); // 6 — d/dx(x² + 2x - 3) at x=2`,

  visualization:`import {
  parseLatex,
  buildSemanticMap,
  getVisualizersForCatalog,
  createVisualizer,
  createVisualizerRegistry,
} from 'fizzex';

// Host supplies the registry — Fizzex does not ship a default CDN.
const registry = createVisualizerRegistry({
  baseUrl: 'https://cdn.example.com/fizzex-visualizers/',
});

const ast = parseLatex('T^2 = \\\\frac{4\\\\pi^2}{GM} a^3');
const catalogId = buildSemanticMap(ast).get(ast.id)?.catalogId;

// One formula can map to multiple independent visualizers (2D, 3D, etc.)
const refs = catalogId ? getVisualizersForCatalog(catalogId) : [];
refs.forEach((r) => console.log(r.name)); // "2D 궤도", "3D 궤도"

// Mount on demand — registry fetches the spec JSON and picks the renderer chunk.
const instance = refs[0]
  ? await createVisualizer(container, {
      registry,
      id: refs[0].id,
      width: 400,
      height: 400,
    })
  : null;`,
};

export const tabKeys = ['install', 'editor', 'latex', 'analysis', 'evaluator', 'visualization'] as const;
