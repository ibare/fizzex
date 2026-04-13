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
│   ├── box-renderer.ts   # Canvas rendering
│   ├── render-backend.ts # Render backend abstraction
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

- [ ] **합성 글리프 렌더링 파이프라인** — 현재 렌더링은 단일 유니코드 문자 → 글리프 방식만 지원. `\npreceq`(⪯ + 슬래시), `\not\equiv` 등 두 글리프를 겹쳐 합성하는 부정 기호를 KaTeX/MathJax와 동일하게 렌더링하려면 슬래시 오버레이 합성 파이프라인이 필요. 현재는 가장 가까운 precomposed 유니코드 문자(⋠ U+22E0 등)를 사용하며, 기반 심볼의 등호 스타일이 달라 형태 차이가 발생 (`\preceq`=⪯ 직선 등호 vs `\npreceq`=⋠ tilde 등호).
- [ ] **Extensible arrow 명령어** (`\xleftarrow`, `\xrightarrow`) — 인자 텍스트 너비에 맞게 화살표가 늘어나고 그 위/아래에 텍스트를 배치하는 구조. 새로운 Box 타입(화살표 + 텍스트 레이아웃), 동적 화살표 길이 계산, Rule 렌더링 + 화살촉 렌더링이 필요.
- [ ] **`\left`/`\right` named delimiter 지원** — 현재 `\left`/`\right`는 `(`, `)`, `[`, `]`, `\{`, `\}`, `|` 등 단일 문자 구분자만 인식. `\left\langle`…`\right\rangle`, `\left\lceil`…`\right\rceil` 등 backslash 명령어 형태의 구분자를 `leftHandler`에서 파싱하는 로직이 필요.
- [ ] **`\left\|`…`\right\|` 이중 세로줄 구분자** — `\|`를 `\left`/`\right` 뒤에서 구분자로 인식하고, 내용물 높이에 맞게 ‖(double vertical bar)를 신축 렌더링하는 기능. `leftHandler`의 구분자 파싱 확장 + delimiter-paths에 ‖ extensible 데이터 추가 필요.
- [ ] **크기 지정 구분자** (`\big`, `\Big`, `\bigg`, `\Bigg`) — 4단계 고정 크기 구분자 명령어. 각 크기별 scale factor 정의, 다음 토큰을 구분자로 파싱하여 해당 크기로 렌더링하는 새로운 CommandHandler + Box 렌더링 로직 필요.
- [ ] **Wide accent 렌더링** (`\widetilde`, `\widehat`) — 현재 단일 글리프(˜, ˆ)로 첫 글자에만 배치됨. 내용 전체 너비에 맞게 늘어나는 extensible accent 렌더링 필요. OpenType MATH 테이블의 MathGlyphVariantRecord 또는 Rule 기반 동적 그리기 방식으로 구현.
- [ ] **Overbrace/Underbrace** (`\overbrace{...}^{...}`, `\underbrace{...}_{...}`) — 내용 너비에 맞는 중괄호를 위/아래에 그리고, 그 위/아래에 주석을 배치하는 구조. 새 AST 노드 타입 + extensible brace 렌더링 + 주석 레이아웃 필요.
- [ ] **Extensible over-arrow** (`\overleftarrow`, `\overrightarrow`, `\overleftrightarrow`) — 내용 전체 너비에 맞게 늘어나는 화살표를 내용 위에 배치. 현재 `\overrightarrow`는 단일 글리프 `\vec`로 매핑되어 첫 글자만 커버. Rule + 화살촉 조합의 extensible 렌더링 필요.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT
