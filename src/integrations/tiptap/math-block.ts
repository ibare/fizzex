import { Node, mergeAttributes } from '@tiptap/core';
import { DOMRendererView } from '../../headless/renderer';
import { DOMEditorView } from '../../headless/editor-view';
import type { MathBlockOptions } from './types';

export const MathBlock = Node.create<MathBlockOptions>({
  name: 'mathBlock',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      fizzexConfig: { baseFontSize: 24 },
      editable: true,
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
    return [{ tag: 'div[data-math-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-math-block': '',
        class: 'math-block',
      }),
      HTMLAttributes.latex || '',
    ];
  },

  addNodeView() {
    const extensionOptions = this.options;

    return ({ node, getPos, editor: tiptapEditor }) => {
      const dom = document.createElement('div');
      dom.style.textAlign = 'center';
      dom.style.padding = '8px 0';
      dom.setAttribute('data-math-block', '');

      const renderContainer = document.createElement('div');
      dom.appendChild(renderContainer);

      let renderer = new DOMRendererView(
        renderContainer,
        extensionOptions.fizzexConfig,
      );
      let currentLatex = node.attrs.latex as string;
      let isEditing = false;
      let fizzexEditor: DOMEditorView | null = null;

      if (currentLatex) {
        renderer.render(currentLatex);
      }
      renderer.enableExplorer({ dblclick: false, hoverIcon: true });

      function enterEditMode() {
        if (!extensionOptions.editable || isEditing) return;
        isEditing = true;

        // Destroy renderer
        renderer.destroy();
        renderContainer.innerHTML = '';

        // Create editor
        fizzexEditor = new DOMEditorView(
          renderContainer,
          extensionOptions.fizzexConfig,
        );
        fizzexEditor.setLatex(currentLatex);
        fizzexEditor.focus();

        fizzexEditor.onChange((newLatex: string) => {
          currentLatex = newLatex;
        });
      }

      function exitEditMode() {
        if (!isEditing || !fizzexEditor) return;

        const finalLatex = fizzexEditor.getLatex();
        fizzexEditor.destroy();
        fizzexEditor = null;
        isEditing = false;

        // Update tiptap node
        const pos = getPos();
        if (typeof pos === 'number') {
          tiptapEditor
            .chain()
            .focus()
            .command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, { latex: finalLatex });
              return true;
            })
            .run();
        }

        // Re-render read-only
        currentLatex = finalLatex;
        renderer = new DOMRendererView(
          renderContainer,
          extensionOptions.fizzexConfig,
        );
        renderer.render(currentLatex);
        renderer.enableExplorer({ dblclick: false, hoverIcon: true });
      }

      // Double-click to edit
      dom.addEventListener('dblclick', enterEditMode);

      // Escape to exit edit mode
      const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isEditing) {
          e.preventDefault();
          e.stopPropagation();
          exitEditMode();
        }
      };
      dom.addEventListener('keydown', handleKeydown);

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== 'mathBlock') return false;
          if (isEditing) return true; // Skip re-render while editing
          const newLatex = updatedNode.attrs.latex as string;
          if (newLatex !== currentLatex) {
            currentLatex = newLatex;
            renderer.render(newLatex);
          }
          return true;
        },
        destroy() {
          dom.removeEventListener('dblclick', enterEditMode);
          dom.removeEventListener('keydown', handleKeydown);
          if (fizzexEditor) {
            fizzexEditor.destroy();
          }
          renderer.destroy();
        },
        stopEvent() {
          return isEditing; // Capture events while editing
        },
      };
    };
  },
});
