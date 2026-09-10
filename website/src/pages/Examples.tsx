import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { parseLatex, createStateFromLatex, analyzeExpression, findNodes } from 'fizzex';
import { EditorView } from 'fizzex/react';
import { useLang } from '../i18n/context';
import { visualizerRegistry } from '../visualizer-registry';
import { categories } from '../data/examples-data';
import type { ExpressionAnalysis, EditorState, ChemNode, RootNode } from 'fizzex';

interface RenderedItem {
  state: EditorState | null;
  analysis: ExpressionAnalysis | null;
}

/**
 * 화학식은 아직 의미 분석 대상이 아니다.
 *
 * 지금 analyzeExpression 에 넣으면 domain=arithmetic, variables=[] 처럼 수식으로 읽은
 * 결과가 나와 화면에 틀린 정보가 붙는다. 카탈로그·semantic 연동이 끝나면 이 함수를 지우고
 * 분석 결과를 그대로 보여주면 된다.
 *
 * 카테고리 이름이 아니라 AST 로 판별한다 — 화학식이 다른 카테고리에 들어와도 맞아야 한다.
 */
function isChemistry(ast: RootNode): boolean {
  return findNodes<ChemNode>(ast, 'chem').length > 0;
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
        const { ast } = parseLatex(item.latex);
        if (!isChemistry(ast)) analysis = analyzeExpression(ast);
      } catch {
        try { state = createStateFromLatex(item.latex); } catch { /* skip */ }
      }
      return { state, analysis };
    });
  }, [currentCategory]);

  return (
    <section className="section">
      <div className="container">
        <div className="section__header section__header--left">
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
                    <div style={styles.itemLabel}>{t.examples.items[item.labelKey] ?? item.labelKey}</div>
                    <code style={styles.itemLatex}>{item.latex}</code>
                  </div>

                  {rendered.state && (
                    <div style={styles.renderBox}>
                      <EditorView
                        initialState={rendered.state}
                        readOnly
                        autoSize
                        showExplorerToggle
                        visualizerRegistry={visualizerRegistry}
                      />
                    </div>
                  )}

                  {rendered.analysis && (
                    <div style={styles.analysisBox}>
                      <div style={styles.analysisTitle}>{t.examples.analysis_label}</div>
                      <div style={styles.analysisGrid}>
                        <span style={styles.analysisKey}>{t.playground.analysis.domain}</span>
                        <span>{rendered.analysis.primaryDomain}</span>
                        <span style={styles.analysisKey}>{t.playground.analysis.form}</span>
                        <span>{rendered.analysis.form}</span>
                        <span style={styles.analysisKey}>{t.playground.analysis.variables}</span>
                        <span>{rendered.analysis.variables.join(', ') || t.examples.no_variables}</span>
                        <span style={styles.analysisKey}>{t.playground.analysis.complexity}</span>
                        <span>{rendered.analysis.complexity}/10</span>
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
