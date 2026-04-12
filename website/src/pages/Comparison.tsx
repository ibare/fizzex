import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createStateFromLatex } from 'fizzex';
import { MathCanvas } from 'fizzex/react';
import { useLang } from '../i18n/context';
import { comparisonCategories } from '../data/comparison-data';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { renderMathJax } from '../utils/mathjax';
import type { EditorState } from 'fizzex';

export default function Comparison() {
  const { t, lang } = useLang();
  const { category: categoryParam } = useParams<{ category?: string }>();
  const [displayMode, setDisplayMode] = useState<'display' | 'inline'>('display');

  const activeCategory = Math.max(0, comparisonCategories.findIndex((c) => c.key === categoryParam));
  const currentCategory = comparisonCategories[activeCategory];
  const categoryLabels = t.comparisonPage.categories as Record<string, string>;
  const isDisplay = displayMode === 'display';

  const rendered = useMemo(() => {
    return currentCategory.items.map((latex) => {
      let fizzexState: EditorState | null = null;
      let katexHtml = '';
      let mathjaxHtml = '';
      try { fizzexState = createStateFromLatex(latex); } catch { /* skip */ }
      try { katexHtml = katex.renderToString(latex, { throwOnError: false, displayMode: isDisplay }); } catch { /* skip */ }
      try { mathjaxHtml = renderMathJax(latex, isDisplay); } catch { /* skip */ }
      return { fizzexState, katexHtml, mathjaxHtml };
    });
  }, [activeCategory, displayMode]);

  return (
    <section className="section">
      <div className="container">
        <div className="section__header section__header--left">
          <h2 className="section__title">{t.comparisonPage.title}</h2>
          <p className="section__sub">{t.comparisonPage.sub}</p>
        </div>

        <div style={styles.layout}>
          {/* Sidebar */}
          <nav style={styles.sidebar}>
            <div style={styles.sidebarList}>
              {comparisonCategories.map((cat, i) => (
                <Link
                  key={cat.key}
                  to={`/${lang}/comparison/${cat.key}`}
                  style={{
                    ...styles.sidebarBtn,
                    background: i === activeCategory ? 'var(--color-accent)' : 'transparent',
                    color: i === activeCategory ? '#fff' : 'var(--color-text)',
                    fontWeight: i === activeCategory ? 600 : 400,
                  }}
                >
                  {categoryLabels[cat.key] ?? cat.key}
                </Link>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div style={styles.content}>
            {/* Toggle + Header */}
            <div style={styles.toggleRow}>
              <div style={styles.modeToggle}>
                <button
                  style={{
                    ...styles.modeBtn,
                    ...(isDisplay ? styles.modeBtnActive : {}),
                  }}
                  onClick={() => setDisplayMode('display')}
                >
                  {t.comparisonPage.display_mode_display}
                </button>
                <button
                  style={{
                    ...styles.modeBtn,
                    ...(!isDisplay ? styles.modeBtnActive : {}),
                  }}
                  onClick={() => setDisplayMode('inline')}
                >
                  {t.comparisonPage.display_mode_inline}
                </button>
              </div>
            </div>
            <div style={styles.headerRow}>
              <span>{t.comparisonPage.fizzex_label}</span>
              <span>{t.comparisonPage.katex_label}</span>
              <span>{t.comparisonPage.mathjax_label}</span>
            </div>

            {currentCategory.items.map((latex, i) => {
              const item = rendered[i];
              return (
                <div key={`${currentCategory.key}-${i}`} style={styles.itemGroup}>
                  {/* LaTeX source row — spans full width */}
                  <div style={styles.latexRow}>
                    <code style={styles.latexCode}>{latex}</code>
                  </div>
                  {/* Render row — 3 columns */}
                  <div style={styles.renderRow}>
                    <div style={styles.renderCell}>
                      {item.fizzexState ? (
                        <MathCanvas initialState={item.fizzexState} readOnly autoSize displayMode={displayMode} />
                      ) : (
                        <span style={styles.muted}>Error</span>
                      )}
                    </div>
                    <div style={styles.renderCell}>
                      {item.katexHtml ? (
                        <span dangerouslySetInnerHTML={{ __html: item.katexHtml }} />
                      ) : (
                        <span style={styles.muted}>Error</span>
                      )}
                    </div>
                    <div style={styles.renderCell}>
                      {item.mathjaxHtml ? (
                        <span dangerouslySetInnerHTML={{ __html: item.mathjaxHtml }} />
                      ) : (
                        <span style={styles.muted}>Error</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: { display: 'flex', gap: '2em', alignItems: 'flex-start' },
  sidebar: { minWidth: '180px', flexShrink: 0 },
  sidebarList: { display: 'flex', flexDirection: 'column', gap: '0' },
  sidebarBtn: {
    display: 'block',
    padding: '0.2em 1em',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    fontSize: '12px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    textAlign: 'left' as const,
    textDecoration: 'none',
    transition: 'all 0.15s ease-out',
  },
  content: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '0' },
  toggleRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0 1em 0.5em',
  },
  headerRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '1em',
    padding: '0.75em 1em',
    fontWeight: 600,
    fontSize: '0.9em',
    color: 'var(--color-heading)',
    borderBottom: '2px solid var(--color-border)',
  },
  itemGroup: {
    borderBottom: '1px solid var(--color-border)',
  },
  latexRow: {
    padding: '2px 1em',
    background: 'var(--color-surface, #f8f8f8)',
  },
  latexCode: {
    fontSize: '12px',
    color: 'var(--color-muted)',
    wordBreak: 'break-all' as const,
  },
  renderRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '1em',
    padding: '0.5em 1em 0.75em',
    alignItems: 'center',
  },
  renderCell: {
    minHeight: '2em',
    display: 'flex',
    alignItems: 'center',
    overflow: 'visible',
  },
  muted: { color: 'var(--color-muted)', fontSize: '0.85em' },
  modeToggle: {
    display: 'flex',
    gap: '0',
  },
  modeBtn: {
    padding: '0.2em 0.8em',
    border: 'none',
    background: 'transparent',
    color: 'var(--color-text)',
    fontSize: '12px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 0.15s ease-out',
  },
  modeBtnActive: {
    background: 'var(--color-accent)',
    color: '#fff',
    borderRadius: 'var(--radius-sm)',
  },
};
