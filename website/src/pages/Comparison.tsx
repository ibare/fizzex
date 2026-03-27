import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createStateFromLatex } from 'fizzex';
import { MathCanvas } from 'fizzex/react';
import { useLang } from '../i18n/context';
import { comparisonCategories } from '../data/comparison-data';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { EditorState } from 'fizzex';

export default function Comparison() {
  const { t, lang } = useLang();
  const { category: categoryParam } = useParams<{ category?: string }>();

  const activeCategory = Math.max(0, comparisonCategories.findIndex((c) => c.key === categoryParam));
  const currentCategory = comparisonCategories[activeCategory];
  const categoryLabels = t.comparisonPage.categories as Record<string, string>;

  const rendered = useMemo(() => {
    return currentCategory.items.map((latex) => {
      let fizzexState: EditorState | null = null;
      let katexHtml = '';
      try { fizzexState = createStateFromLatex(latex); } catch { /* skip */ }
      try { katexHtml = katex.renderToString(latex, { throwOnError: false }); } catch { /* skip */ }
      return { fizzexState, katexHtml };
    });
  }, [activeCategory]);

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
            {/* Header row */}
            <div style={styles.headerRow}>
              <span>{t.comparisonPage.latex_source}</span>
              <span>{t.comparisonPage.fizzex_label}</span>
              <span>{t.comparisonPage.katex_label}</span>
            </div>

            {currentCategory.items.map((latex, i) => {
              const item = rendered[i];
              return (
                <div key={`${currentCategory.key}-${i}`} style={styles.row}>
                  <code style={styles.latexCode}>{latex}</code>
                  <div style={styles.renderCell}>
                    {item.fizzexState ? (
                      <MathCanvas initialState={item.fizzexState} readOnly autoSize />
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
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '1em',
    padding: '0.75em 1em',
    borderBottom: '1px solid var(--color-border)',
    alignItems: 'center',
  },
  latexCode: { fontSize: '0.8em', wordBreak: 'break-all' as const },
  renderCell: {
    minHeight: '2em',
    display: 'flex',
    alignItems: 'center',
    overflow: 'visible',
  },
  muted: { color: 'var(--color-muted)', fontSize: '0.85em' },
};
