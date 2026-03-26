import { Node, mergeAttributes } from '@tiptap/core';
import { FizzexRenderer } from '../../headless/renderer';
import type { MathInlineOptions } from './types';

export const MathInline = Node.create<MathInlineOptions>({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return {
      fizzexConfig: { baseFontSize: 18 },
    };
  },

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-latex') || element.textContent || '',
        renderHTML: (attributes: Record<string, string>) => ({
          'data-latex': attributes.latex,
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'span[data-math-inline]' },
      { tag: 'span[data-latex]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-math-inline': '',
        class: 'math-inline',
      }),
      HTMLAttributes.latex || '',
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.style.display = 'inline-block';
      dom.style.verticalAlign = 'middle';
      dom.setAttribute('data-math-inline', '');

      const renderer = new FizzexRenderer(dom, this.options.fizzexConfig);
      let currentLatex = node.attrs.latex as string;
      if (currentLatex) {
        renderer.render(currentLatex);
      }

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'mathInline') return false;
          const newLatex = updatedNode.attrs.latex as string;
          if (newLatex !== currentLatex) {
            currentLatex = newLatex;
            renderer.render(newLatex);
          }
          return true;
        },
        destroy() {
          renderer.destroy();
        },
      };
    };
  },
});
