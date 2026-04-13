export const rendererExample = `import { FizzexRenderer } from 'fizzex/headless';

const renderer = new FizzexRenderer(container, {
  baseFontSize: 20,
  theme: 'light',
});
renderer.render('\\\\frac{1}{2} + x^2');`;

export const editorExample = `import { FizzexEditor } from 'fizzex/headless';

const editor = new FizzexEditor(container, {
  baseFontSize: 20,
  showSuggestions: true,
});
editor.setLatex('x^2 + 2x - 3 = 0');
editor.onChange((latex) => saveToDocument(latex));`;

export const configExample = `interface FizzexConfig {
  baseFontSize?: number;   // default 20
  fontFamily?: string;     // default New CM Math
  color?: string;          // default '#1a1a1a'
  theme?: 'light' | 'dark';
  padding?: number;        // default 8
}`;

export const tiptapPluginExample = `import { Node } from '@tiptap/core';
import { FizzexRenderer } from 'fizzex/headless';

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return { latex: { default: '' } };
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.style.display = 'inline-block';
      const renderer = new FizzexRenderer(dom, {
        baseFontSize: 18,
      });
      let current = node.attrs.latex;
      renderer.render(current);

      return {
        dom,
        update: (n) => {
          if (n.attrs.latex !== current) {
            current = n.attrs.latex;
            renderer.render(current);
          }
          return true;
        },
        destroy: () => renderer.destroy(),
      };
    };
  },
});`;

export const pluginSteps = `// Step 1: Your host editor gives you a DOM element
const container = nodeView.dom;

// Step 2: Create a FizzexRenderer
const renderer = new FizzexRenderer(container, {
  baseFontSize: 20,
});

// Step 3: Render when data changes
renderer.render(node.attrs.latex);

// Step 4: Clean up when node is removed
renderer.destroy();`;
