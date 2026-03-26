# Fizzex

> Canvas-based mathematical expression editor — light and easy formula input, like fizzy bubbles

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
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install fizzex
```

## Quick Start

### Math Editor (React)

```tsx
import { MathCanvas } from 'fizzex';

function App() {
  return (
    <MathCanvas
      width={400}
      height={80}
      theme="light"
      onChange={(state) => console.log(state)}
    />
  );
}
```

### LaTeX Conversion

```typescript
import { parseLatex, astToLatex } from 'fizzex';

// LaTeX → AST
const ast = parseLatex('\\frac{1}{2} + x^2');

// AST → LaTeX
const latex = astToLatex(ast);
```

### Expression Analysis

```typescript
import { parseLatex, analyzeExpression } from 'fizzex';

const ast = parseLatex('x^2 + 2x - 3 = 0');
const analysis = analyzeExpression(ast);

console.log(analysis.primaryDomain);      // 'polynomial'
console.log(analysis.polynomial?.degree); // 2
console.log(analysis.variableClassification);
// { mainVariables: ['x'], coefficients: [], confidence: 1.0 }
console.log(analysis.visualization.bestFit); // 'function-graph-2d'
```

### CAS (Computer Algebra System)

```typescript
import { parseLatex, simplify, expand, factor, solve, diff, integrate } from 'fizzex';

const ast = parseLatex('(x+1)^2');

const expanded = expand(ast);              // x^2 + 2x + 1
const factored = factor(expanded.result!); // (x+1)^2
const derivative = diff(ast);              // 2(x+1) = 2x + 2
const integral = integrate(ast);           // (x+1)^3/3

const equation = parseLatex('x^2 - 4 = 0');
const solutions = solve(equation);         // x = 2, x = -2
```

### Visualization

```tsx
import { FunctionGraph, UnitCircle, NumberLine, PolarGraph, AutoVisualizer } from 'fizzex';

// 2D Function Graph
<FunctionGraph
  expression="x^2 - 1"
  width={400}
  height={300}
  interactive
/>

// Unit Circle (Trigonometric)
<UnitCircle
  size={300}
  initialAngle={Math.PI / 4}
  interactive
/>

// Number Line (Inequality)
<NumberLine
  points={[{ value: 3, label: '3', included: false }]}
  intervals={[{ start: -10, end: 3, startIncluded: true, endIncluded: false }]}
  range={[-5, 8]}
/>

// Polar Graph
<PolarGraph
  expression="1 + \\cos(\\theta)"
  size={300}
/>

// Auto Visualization (based on analysis)
<AutoVisualizer
  analysis={analysis}
  latex={latex}
  showSelector
  coefficientValues={{ a: 1, b: 2 }}
/>
```

### Autocomplete

```tsx
import { SuggestionChips, SuggestionPopover, getSuggestions } from 'fizzex';

const suggestions = getSuggestions(editorState);

<SuggestionChips
  suggestions={suggestions}
  onSelect={(suggestion) => applyAction(suggestion.action)}
/>

<SuggestionPopover
  isOpen={showSuggestions}
  suggestions={suggestions}
  onSelect={handleSelect}
/>
```

### i18n

```tsx
import { FizzexI18nProvider } from 'fizzex';

const customLabels = {
  categories: {
    greek: 'Greek Letters',
    operators: 'Operators',
    functions: 'Functions',
  },
};

<FizzexI18nProvider labels={customLabels}>
  <MathCanvas />
</FizzexI18nProvider>
```

## API Reference

### Core

```typescript
import { MathEditor, createInitialState, createEmptyRoot } from 'fizzex';
import { parseLatex, astToLatex } from 'fizzex';
import {
  createNumber, createVariable, createOperator,
  createFrac, createPower, createParen, createSubscript,
  createAbs, createSqrt, createFunc,
  createIntegral, createSum, createLimit, createProduct,
  createOverline, createMatrix, createText,
} from 'fizzex';
```

### Analysis & CAS

```typescript
import { analyzeExpression, matchVisualization } from 'fizzex';
import { simplify, expand, factor, solve, diff, integrate, evaluate } from 'fizzex';
```

### React Components

```typescript
import {
  MathCanvas, StructureViewer,
  SuggestionChips, SuggestionPopover,
  FunctionGraph, UnitCircle, NumberLine, PolarGraph, AutoVisualizer,
  FizzexI18nProvider,
} from 'fizzex';
```

### Types

```typescript
import type {
  MathNode, RootNode, NumberNode, VariableNode, OperatorNode,
  FracNode, PowerNode, SubscriptNode, SqrtNode, ParenNode, AbsNode,
  FuncNode, IntegralNode, SumNode, LimitNode, ProductNode,
  OverlineNode, MatrixNode, TextNode,
  EditorState, CursorPosition,
  ExpressionAnalysis, VariableClassification, VisualizationType,
  CASResult, CASOperation,
  GraphConfig, GraphRange,
} from 'fizzex';
```

## Architecture

```
src/
├── types.ts              # AST type definitions (MathNode, EditorState)
├── editor.ts             # Editor logic (keyboard input, node creation)
├── box/                  # Box model (TeX-style layout)
│   ├── types.ts          # Box type definitions
│   ├── constants.ts      # TeX constants (σ, ξ, etc.)
│   ├── font-metrics.ts   # Font metrics (LRU cached)
│   ├── box-builder.ts    # Box creation helpers
│   ├── box-layout.ts     # Layout calculation
│   ├── box-renderer.ts   # Canvas rendering
│   ├── render-backend.ts # Render backend abstraction
│   └── ast-to-box.ts     # AST → Box conversion
├── latex/                # LaTeX support
│   ├── latex-parser.ts   # LaTeX → AST parser
│   ├── ast-to-latex.ts   # AST → LaTeX conversion
│   ├── node-factory.ts   # Generic node creation factory
│   ├── parse-errors.ts   # Parse error definitions
│   ├── command-registry.ts  # Command registry
│   └── commands/         # Modularized command handlers
├── suggestion/           # Autocomplete
├── analyzer/             # Expression analysis
├── cas/                  # Computer Algebra System
├── visualizer/           # Visualization components
├── fonts/                # Font management
├── i18n/                 # Internationalization
├── export/               # Export functionality
├── utils/                # Utilities
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
```

### Build

```bash
pnpm build       # Full build (tsc + vite)
pnpm typecheck   # Type check only
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT
