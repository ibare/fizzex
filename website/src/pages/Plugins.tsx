import { useState } from 'react';
import { useLang } from '../i18n/context';
import CodeBlock from '../components/CodeBlock';
import Card from '../components/Card';
import TabGroup from '../components/TabGroup';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { MathInline } from 'fizzex/integrations/tiptap/math-inline';
import { MathBlock } from 'fizzex/integrations/tiptap/math-block';
import Image from '@tiptap/extension-image';
import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import {
  rendererExample,
  editorExample,
  configExample,
  tiptapPluginExample,
  pluginSteps,
} from '../data/plugin-code';

/* ── Tiptap Demo ── */

const proseMirrorStyles = `
.ProseMirror:focus { outline: none; }
.ProseMirror h2 { font-size: 1.3em; margin-bottom: 0.5em; }
.ProseMirror p { margin-bottom: 0.75em; }
.ProseMirror img { max-width: 100%; height: auto; border-radius: 6px; margin: 0.5em 0; }
.ProseMirror [data-resize-handle] { width: 10px; height: 10px; background: var(--color-primary, #6c5ce7); border-radius: 2px; opacity: 0; transition: opacity .15s; z-index: 1; }
.ProseMirror *:hover > [data-resize-handle] { opacity: .7; cursor: nwse-resize; }
`;

const ClipboardImage = Extension.create({
  name: 'clipboardImage',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const items = event.clipboardData?.items;
            if (!items) return false;
            for (const item of items) {
              if (!item.type.startsWith('image/')) continue;
              const file = item.getAsFile();
              if (!file) continue;
              event.preventDefault();
              const reader = new FileReader();
              reader.onload = () => {
                const src = reader.result as string;
                const { tr, selection } = view.state;
                const node = view.state.schema.nodes.image.create({ src });
                view.dispatch(tr.replaceWith(selection.from, selection.to, node));
              };
              reader.readAsDataURL(file);
              return true;
            }
            return false;
          },
          handleDrop: (view, event) => {
            const files = event.dataTransfer?.files;
            if (!files?.length) return false;
            for (const file of files) {
              if (!file.type.startsWith('image/')) continue;
              event.preventDefault();
              const reader = new FileReader();
              reader.onload = () => {
                const src = reader.result as string;
                const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from;
                const node = view.state.schema.nodes.image.create({ src });
                view.dispatch(view.state.tr.replaceWith(pos, pos, node));
              };
              reader.readAsDataURL(file);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

const DEMO_KEYS = ['euler', 'pythagorean'] as const;

function TiptapDemo() {
  const { t } = useLang();
  const d = t.pluginsPage.demo;
  const [tabIndex, setTabIndex] = useState(0);
  const key = DEMO_KEYS[tabIndex];

  const editor = useEditor({
    extensions: [
      StarterKit,
      MathInline.configure({ fizzexConfig: { baseFontSize: 18 } }),
      MathBlock.configure({ fizzexConfig: { baseFontSize: 24 }, editable: true }),
      Image.configure({
        inline: true,
        allowBase64: true,
        resize: { enabled: true, minWidth: 60, minHeight: 60 },
      }),
      ClipboardImage,
    ],
    content: d.contents[key],
  }, [key, d]);

  const tabLabels = DEMO_KEYS.map((k) => d.tabs[k]);

  return (
    <>
      <TabGroup tabs={tabLabels} activeIndex={tabIndex} onChange={setTabIndex} />
      <div style={demoStyles.editorWrapper}>
        <EditorContent editor={editor} />
      </div>
    </>
  );
}

/* ── Main Page ── */

export default function Plugins() {
  const { t } = useLang();
  const p = t.pluginsPage;

  const guideSteps = [
    { title: p.guide.step1_title, desc: p.guide.step1_desc },
    { title: p.guide.step2_title, desc: p.guide.step2_desc },
    { title: p.guide.step3_title, desc: p.guide.step3_desc },
  ];

  return (
    <>
      {/* ── Section 1: Architecture ── */}
      <section className="section section--alt">
        <div className="container">
          <div className="section__header section__header--left">
            <h2 className="section__title">{p.arch.title}</h2>
            <p className="section__sub">{p.arch.sub}</p>
          </div>

          <div className="grid grid--3">
            <div style={{ borderTop: '4px solid var(--color-step-1)' }}>
              <Card title={p.arch.core_title} description={p.arch.core_desc} />
            </div>
            <div style={{ borderTop: '4px solid var(--color-step-3)' }}>
              <Card title={p.arch.headless_title} description={p.arch.headless_desc} />
            </div>
            <div style={{ borderTop: '4px solid var(--color-step-5)' }}>
              <Card title={p.arch.plugins_title} description={p.arch.plugins_desc} />
            </div>
          </div>

          <p style={styles.philosophy}>{p.arch.philosophy}</p>
        </div>
      </section>

      {/* ── Section 2: Headless API ── */}
      <section className="section">
        <div className="container">
          <div className="section__header section__header--left">
            <h2 className="section__title">{p.api.title}</h2>
            <p className="section__sub">{p.api.sub}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5em' }}>
            <Card title={p.api.renderer_title} description={p.api.renderer_desc}>
              <CodeBlock>{rendererExample}</CodeBlock>
            </Card>
            <Card title={p.api.editor_title} description={p.api.editor_desc}>
              <CodeBlock>{editorExample}</CodeBlock>
            </Card>
          </div>

          <div style={{ marginTop: '1.5em' }}>
            <Card title={p.api.config_title} description="">
              <CodeBlock>{configExample}</CodeBlock>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Section 3: Build Your Own Plugin ── */}
      <section className="section section--alt">
        <div className="container">
          <div className="section__header section__header--left">
            <h2 className="section__title">{p.guide.title}</h2>
            <p className="section__sub">{p.guide.sub}</p>
          </div>

          <div style={styles.stepsColumn}>
            {guideSteps.map((step) => (
              <div key={step.title} className="card" style={styles.stepCard}>
                <strong>{step.title}</strong>
                <p style={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5em' }}>
            <CodeBlock>{pluginSteps}</CodeBlock>
          </div>

          <div style={{ marginTop: '2em' }}>
            <p style={styles.codeLabel}>{p.guide.tiptap_example}</p>
            <CodeBlock>{tiptapPluginExample}</CodeBlock>
          </div>

          <p style={styles.outro}>{p.guide.outro}</p>
        </div>
      </section>

      {/* ── Section 4: Tiptap Live Demo ── */}
      <section className="section">
        <div className="container">
          <div className="section__header section__header--left">
            <h2 className="section__title">{p.demo.title}</h2>
            <p className="section__sub">{p.demo.sub}</p>
          </div>

          <p style={styles.instructions}>{p.demo.instructions}</p>

          <style>{proseMirrorStyles}</style>
          <TiptapDemo />
        </div>
      </section>
    </>
  );
}

/* ── Styles ── */

const styles: Record<string, React.CSSProperties> = {
  philosophy: {
    marginTop: '2em',
    fontStyle: 'italic',
    color: 'var(--color-muted)',
    textAlign: 'center',
    fontSize: '0.95em',
  },
  stepsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1em',
  },
  stepCard: {
    padding: '1.25em 1.5em',
  },
  stepDesc: {
    marginTop: '0.4em',
    color: 'var(--color-muted)',
    fontSize: '0.9em',
  },
  codeLabel: {
    fontSize: '0.85em',
    fontWeight: 600,
    color: 'var(--color-muted)',
    marginBottom: '0.5em',
  },
  outro: {
    marginTop: '1.5em',
    color: 'var(--color-muted)',
    fontSize: '0.9em',
  },
  instructions: {
    color: 'var(--color-muted)',
    fontSize: '0.9em',
    marginBottom: '1.5em',
  },
};

const demoStyles: Record<string, React.CSSProperties> = {
  editorWrapper: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    padding: '1.5em',
    minHeight: '300px',
    background: '#fff',
    fontSize: '1em',
    lineHeight: 1.7,
  },
};
