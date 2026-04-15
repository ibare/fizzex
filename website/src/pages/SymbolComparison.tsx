import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createStateFromLatex } from 'fizzex';
import { EditorView } from 'fizzex/react';
import { useLang } from '../i18n/context';
import { symbolCategories } from '../data/symbol-data';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { renderMathJax } from '../utils/mathjax';
import type { EditorState } from 'fizzex';

export default function SymbolComparison() {
  const { t, lang } = useLang();
  const { category: categoryParam } = useParams<{ category?: string }>();
  const [displayMode, setDisplayMode] = useState<'display' | 'inline'>('inline');

  const activeCategory = Math.max(0, symbolCategories.findIndex((c) => c.key === categoryParam));
  const currentCategory = symbolCategories[activeCategory];
  const categoryLabels = t.symbolPage.categories as Record<string, string>;
  const isDisplay = displayMode === 'display';

  const rendered = useMemo(() => {
    return currentCategory.items.map(([cmd, latex]) => {
      const renderLatex = latex ?? cmd;
      let fizzexState: EditorState | null = null;
      let katexHtml = '';
      let mathjaxHtml = '';
      try { fizzexState = createStateFromLatex(renderLatex); } catch { /* skip */ }
      try { katexHtml = katex.renderToString(renderLatex, { throwOnError: false, displayMode: isDisplay }); } catch { /* skip */ }
      try { mathjaxHtml = renderMathJax(renderLatex, isDisplay); } catch { /* skip */ }
      return { cmd, fizzexState, katexHtml, mathjaxHtml };
    });
  }, [activeCategory, displayMode]);

  return (
    <section className="section">
      <div className="container">
        <div className="section__header section__header--left">
          <h2 className="section__title">{t.symbolPage.title}</h2>
          <p className="section__sub">{t.symbolPage.sub}</p>
        </div>

        <div style={styles.layout}>
          {/* Sidebar */}
          <nav style={styles.sidebar}>
            <div style={styles.sidebarList}>
              {symbolCategories.map((cat, i) => (
                <Link
                  key={cat.key}
                  to={`/${lang}/symbols/${cat.key}`}
                  style={{
                    ...styles.sidebarBtn,
                    background: i === activeCategory ? 'var(--color-accent)' : 'transparent',
                    color: i === activeCategory ? '#fff' : 'var(--color-text)',
                    fontWeight: i === activeCategory ? 600 : 400,
                  }}
                >
                  {categoryLabels[cat.key] ?? cat.key}
                  <span style={styles.countBadge}>{cat.items.length}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div style={styles.content}>
            {/* Toggle */}
            <div style={styles.toggleRow}>
              <span style={styles.itemCount}>
                {currentCategory.items.length} {t.symbolPage.items_label}
              </span>
              <div style={styles.modeToggle}>
                <button
                  style={{ ...styles.modeBtn, ...(isDisplay ? styles.modeBtnActive : {}) }}
                  onClick={() => setDisplayMode('display')}
                >
                  {t.symbolPage.display_mode_display}
                </button>
                <button
                  style={{ ...styles.modeBtn, ...(!isDisplay ? styles.modeBtnActive : {}) }}
                  onClick={() => setDisplayMode('inline')}
                >
                  {t.symbolPage.display_mode_inline}
                </button>
              </div>
            </div>

            {/* Header */}
            <div style={styles.headerRow}>
              <span>{t.symbolPage.command_label}</span>
              <span>{t.symbolPage.fizzex_label}</span>
              <span>{t.symbolPage.katex_label}</span>
              <span>{t.symbolPage.mathjax_label}</span>
            </div>

            {/* Items */}
            {rendered.map((item, i) => (
              <div key={`${currentCategory.key}-${i}`} style={styles.itemRow}>
                <div style={styles.cmdCell}>
                  <code style={styles.cmdCode}>{item.cmd}</code>
                </div>
                <div style={styles.renderCell}>
                  {item.fizzexState ? (
                    <EditorView initialState={item.fizzexState} readOnly autoSize displayMode={displayMode} />
                  ) : (
                    <span style={styles.errorText}>-</span>
                  )}
                </div>
                <div style={styles.renderCell}>
                  {item.katexHtml ? (
                    <span dangerouslySetInnerHTML={{ __html: item.katexHtml }} />
                  ) : (
                    <span style={styles.errorText}>-</span>
                  )}
                </div>
                <div style={styles.renderCell}>
                  {item.mathjaxHtml ? (
                    <span dangerouslySetInnerHTML={{ __html: item.mathjaxHtml }} />
                  ) : (
                    <span style={styles.errorText}>-</span>
                  )}
                </div>
              </div>
            ))}
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  countBadge: {
    fontSize: '10px',
    opacity: 0.6,
    marginLeft: '0.5em',
  },
  content: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '0' },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 1em 0.5em',
  },
  itemCount: {
    fontSize: '12px',
    color: 'var(--color-muted)',
  },
  headerRow: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr 1fr 1fr',
    gap: '0.5em',
    padding: '0.5em 1em',
    fontWeight: 600,
    fontSize: '0.85em',
    color: 'var(--color-heading)',
    borderBottom: '2px solid var(--color-border)',
  },
  itemRow: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr 1fr 1fr',
    gap: '0.5em',
    padding: '0.4em 1em',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
  },
  cmdCell: {
    overflow: 'hidden',
  },
  cmdCode: {
    fontSize: '11px',
    color: 'var(--color-muted)',
    wordBreak: 'break-all' as const,
    fontFamily: 'var(--font-mono, monospace)',
  },
  renderCell: {
    minHeight: '1.8em',
    display: 'flex',
    alignItems: 'center',
    overflow: 'visible',
  },
  errorText: { color: 'var(--color-muted)', fontSize: '0.8em' },
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
