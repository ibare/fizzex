import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { parseLatex, createStateFromLatex, analyzeExpression } from 'fizzex';
import { MathCanvas } from 'fizzex/react';
import { useLang } from '../i18n/context';
import { categories } from '../data/examples-data';
import type { ExpressionAnalysis, EditorState } from 'fizzex';

interface RenderedItem {
  state: EditorState | null;
  analysis: ExpressionAnalysis | null;
}

export default function Examples() {
  const { t, lang } = useLang();
  const { category: categoryParam } = useParams<{ category?: string }>();

  const activeCategory = Math.max(0, categories.findIndex((c) => c.key === categoryParam));
  const currentCategory = categories[activeCategory];
  const categoryLabels = t.examples.categories as Record<string, string>;

  const renderedItems = useMemo<RenderedItem[]>(() => {
    return currentCategory.items.map((item) => {
      let state: EditorState | null = null;
      let analysis: ExpressionAnalysis | null = null;
      try {
        state = createStateFromLatex(item.latex);
        const ast = parseLatex(item.latex);
        analysis = analyzeExpression(ast);
      } catch {
        try { state = createStateFromLatex(item.latex); } catch { /* skip */ }
      }
      return { state, analysis };
    });
  }, [currentCategory]);

  return (
    <section className="section">
      <div className="container">
        <div className="section__header">
          <h2 className="section__title">{t.examples.title}</h2>
          <p className="section__sub">{t.examples.sub}</p>
        </div>

        <div style={styles.layout}>
          {/* Sidebar */}
          <nav style={styles.sidebar}>
            <div style={styles.sidebarList}>
              {categories.map((cat, i) => (
                <Link
                  key={cat.key}
                  to={`/${lang}/examples/${cat.key}`}
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
            {currentCategory.items.map((item, i) => {
              const rendered = renderedItems[i];
              return (
                <div key={`${currentCategory.key}-${i}`} className="card">
                  <div style={styles.itemHeader}>
                    <div style={styles.itemLabel}>{item.label}</div>
                    <code style={styles.itemLatex}>{item.latex}</code>
                  </div>

                  {rendered.state && (
                    <div style={styles.renderBox}>
                      <MathCanvas initialState={rendered.state} readOnly autoSize />
                    </div>
                  )}

                  {rendered.analysis && (
                    <div style={styles.analysisBox}>
                      <div style={styles.analysisTitle}>{t.examples.analysis_label}</div>
                      <div style={styles.analysisGrid}>
                        <span style={styles.analysisKey}>Domain</span>
                        <span>{rendered.analysis.primaryDomain}</span>
                        <span style={styles.analysisKey}>Form</span>
                        <span>{rendered.analysis.form}</span>
                        <span style={styles.analysisKey}>Variables</span>
                        <span>{rendered.analysis.variables.join(', ') || 'none'}</span>
                        <span style={styles.analysisKey}>Complexity</span>
                        <span>{rendered.analysis.complexity}/10</span>
                        {rendered.analysis.visualization.bestFit && (
                          <>
                            <span style={styles.analysisKey}>Best Viz</span>
                            <span>{rendered.analysis.visualization.bestFit}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
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
  sidebarList: { display: 'flex', flexDirection: 'column', gap: '0.25em' },
  sidebarBtn: {
    display: 'block',
    padding: '0.6em 1em',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    fontSize: '0.9em',
    fontFamily: 'inherit',
    cursor: 'pointer',
    textAlign: 'left' as const,
    textDecoration: 'none',
    transition: 'all 0.15s ease-out',
  },
  content: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '1em' },
  itemHeader: { marginBottom: '0.75em' },
  itemLabel: { fontWeight: 600, fontSize: '0.95em', color: 'var(--color-heading)', marginBottom: '0.3em' },
  itemLatex: { fontSize: '0.8em', wordBreak: 'break-all' as const },
  renderBox: {
    padding: '1em',
    background: 'var(--color-bg-alt)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'auto',
  },
  analysisBox: {
    marginTop: '0.75em',
    padding: '1em',
    background: 'var(--color-bg-alt)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85em',
  },
  analysisTitle: { fontWeight: 600, marginBottom: '0.5em', color: 'var(--color-heading)' },
  analysisGrid: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.3em 1em' },
  analysisKey: { color: 'var(--color-muted)' },
};
