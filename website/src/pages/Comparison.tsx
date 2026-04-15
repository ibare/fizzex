import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createStateFromLatex } from 'fizzex';
import { EditorView } from 'fizzex/react';
import { useLang } from '../i18n/context';
import { comparisonCategories } from '../data/comparison-data';
import { symbolCategories } from '../data/symbol-data';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { renderMathJax } from '../utils/mathjax';
import type { EditorState } from 'fizzex';

/** sym- 접두사로 심볼 카테고리를 구분 */
const SYMBOL_PREFIX = 'sym-';

/** 통합 카테고리 키 목록 */
const comparisonKeys = comparisonCategories.map((c) => c.key);
const symbolKeys = symbolCategories.map((c) => `${SYMBOL_PREFIX}${c.key}`);
const allKeys = [...comparisonKeys, ...symbolKeys];

/** 심볼 카테고리를 원래 키로 변환 */
function toSymbolKey(key: string) {
  return key.slice(SYMBOL_PREFIX.length);
}

export default function Comparison() {
  const { t, lang } = useLang();
  const { category: categoryParam } = useParams<{ category?: string }>();
  const [displayMode, setDisplayMode] = useState<'display' | 'inline'>('display');

  const activeKey = categoryParam && allKeys.includes(categoryParam) ? categoryParam : comparisonKeys[0];
  const isSymbol = activeKey.startsWith(SYMBOL_PREFIX);
  const isDisplay = displayMode === 'display';

  const categoryLabels = t.comparisonPage.categories as Record<string, string>;
  const sections = t.comparisonPage.sections;

  // 비교 카테고리 렌더링 데이터
  const comparisonRendered = useMemo(() => {
    if (isSymbol) return [];
    const cat = comparisonCategories.find((c) => c.key === activeKey);
    if (!cat) return [];
    return cat.items.map((latex) => {
      let fizzexState: EditorState | null = null;
      let katexHtml = '';
      let mathjaxHtml = '';
      try { fizzexState = createStateFromLatex(latex); } catch { /* skip */ }
      try { katexHtml = katex.renderToString(latex, { throwOnError: false, displayMode: isDisplay }); } catch { /* skip */ }
      try { mathjaxHtml = renderMathJax(latex, isDisplay); } catch { /* skip */ }
      return { latex, fizzexState, katexHtml, mathjaxHtml };
    });
  }, [activeKey, displayMode]);

  // 심볼 카테고리 렌더링 데이터
  const symbolRendered = useMemo(() => {
    if (!isSymbol) return [];
    const cat = symbolCategories.find((c) => c.key === toSymbolKey(activeKey));
    if (!cat) return [];
    return cat.items.map(([cmd, latex]) => {
      const renderLatex = latex ?? cmd;
      let fizzexState: EditorState | null = null;
      let katexHtml = '';
      let mathjaxHtml = '';
      try { fizzexState = createStateFromLatex(renderLatex); } catch { /* skip */ }
      try { katexHtml = katex.renderToString(renderLatex, { throwOnError: false, displayMode: isDisplay }); } catch { /* skip */ }
      try { mathjaxHtml = renderMathJax(renderLatex, isDisplay); } catch { /* skip */ }
      return { cmd, fizzexState, katexHtml, mathjaxHtml };
    });
  }, [activeKey, displayMode]);

  const symbolItemCount = isSymbol
    ? symbolCategories.find((c) => c.key === toSymbolKey(activeKey))?.items.length ?? 0
    : 0;

  return (
    <section className="section">
      <div className="container">
        <div className="section__header section__header--left">
          <h2 className="section__title">{t.comparisonPage.title}</h2>
          <p className="section__sub">{t.comparisonPage.sub}</p>
        </div>

        <div style={styles.layout}>
          {/* 2단 사이드바 */}
          <nav style={styles.sidebar}>
            <div style={styles.sidebarList}>
              {/* 렌더링 섹션 */}
              <div style={{
                ...styles.sectionHeader,
                color: !isSymbol ? 'var(--color-accent)' : 'var(--color-muted)',
              }}>{sections.rendering}</div>
              {comparisonCategories.map((cat) => (
                <Link
                  key={cat.key}
                  to={`/${lang}/comparison/${cat.key}`}
                  style={{
                    ...styles.sidebarBtn,
                    background: activeKey === cat.key ? 'var(--color-accent)' : 'transparent',
                    color: activeKey === cat.key ? '#fff' : 'var(--color-text)',
                    fontWeight: activeKey === cat.key ? 600 : 400,
                  }}
                >
                  {categoryLabels[cat.key] ?? cat.key}
                </Link>
              ))}

              {/* 심볼 섹션 — 클릭 시 펼침/접힘 */}
              <Link
                to={`/${lang}/comparison/${SYMBOL_PREFIX}${symbolCategories[0].key}`}
                style={{
                  ...styles.sectionHeader,
                  marginTop: '0.8em',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  color: isSymbol ? 'var(--color-accent)' : 'var(--color-muted)',
                }}
              >
                {sections.symbols}
              </Link>
              {symbolCategories.map((cat) => {
                const prefixedKey = `${SYMBOL_PREFIX}${cat.key}`;
                return (
                  <Link
                    key={prefixedKey}
                    to={`/${lang}/comparison/${prefixedKey}`}
                    style={{
                      ...styles.sidebarBtn,
                      background: activeKey === prefixedKey ? 'var(--color-accent)' : 'transparent',
                      color: activeKey === prefixedKey ? '#fff' : 'var(--color-text)',
                      fontWeight: activeKey === prefixedKey ? 600 : 400,
                    }}
                  >
                    {categoryLabels[prefixedKey] ?? cat.key}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* 콘텐츠 */}
          <div style={styles.content}>
            {/* 토글 + 아이템 수 */}
            <div style={styles.toggleRow}>
              {isSymbol && (
                <span style={styles.itemCount}>
                  {symbolItemCount} {t.symbolPage.items_label}
                </span>
              )}
              <div style={{ flex: 1 }} />
              <div style={styles.modeToggle}>
                <button
                  style={{ ...styles.modeBtn, ...(isDisplay ? styles.modeBtnActive : {}) }}
                  onClick={() => setDisplayMode('display')}
                >
                  {t.comparisonPage.display_mode_display}
                </button>
                <button
                  style={{ ...styles.modeBtn, ...(!isDisplay ? styles.modeBtnActive : {}) }}
                  onClick={() => setDisplayMode('inline')}
                >
                  {t.comparisonPage.display_mode_inline}
                </button>
              </div>
            </div>

            {/* 비교 모드: 3열 */}
            {!isSymbol && (
              <>
                <div style={styles.headerRow3}>
                  <span>{t.comparisonPage.fizzex_label}</span>
                  <span>{t.comparisonPage.katex_label}</span>
                  <span>{t.comparisonPage.mathjax_label}</span>
                </div>
                {comparisonRendered.map((item, i) => (
                  <div key={`${activeKey}-${i}`} style={styles.itemGroup}>
                    <div style={styles.latexRow}>
                      <code style={styles.latexCode}>{item.latex}</code>
                    </div>
                    <div style={styles.renderRow3}>
                      <div style={styles.renderCell}>
                        {item.fizzexState ? (
                          <EditorView initialState={item.fizzexState} readOnly autoSize displayMode={displayMode} />
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
                ))}
              </>
            )}

            {/* 심볼 모드: 4열 */}
            {isSymbol && (
              <>
                <div style={styles.headerRow4}>
                  <span>{t.symbolPage.command_label}</span>
                  <span>{t.comparisonPage.fizzex_label}</span>
                  <span>{t.comparisonPage.katex_label}</span>
                  <span>{t.comparisonPage.mathjax_label}</span>
                </div>
                {symbolRendered.map((item, i) => (
                  <div key={`${activeKey}-${i}`} style={styles.itemRow4}>
                    <div style={styles.cmdCell}>
                      <code style={styles.cmdCode}>{item.cmd}</code>
                    </div>
                    <div style={styles.renderCell}>
                      {item.fizzexState ? (
                        <EditorView initialState={item.fizzexState} readOnly autoSize displayMode={displayMode} />
                      ) : (
                        <span style={styles.muted}>-</span>
                      )}
                    </div>
                    <div style={styles.renderCell}>
                      {item.katexHtml ? (
                        <span dangerouslySetInnerHTML={{ __html: item.katexHtml }} />
                      ) : (
                        <span style={styles.muted}>-</span>
                      )}
                    </div>
                    <div style={styles.renderCell}>
                      {item.mathjaxHtml ? (
                        <span dangerouslySetInnerHTML={{ __html: item.mathjaxHtml }} />
                      ) : (
                        <span style={styles.muted}>-</span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
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
  sectionHeader: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-muted)',
    padding: '0.6em 1em 0.3em',
  },
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
    alignItems: 'center',
    padding: '0 1em 0.5em',
  },
  itemCount: {
    fontSize: '12px',
    color: 'var(--color-muted)',
  },
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
  // 비교 모드 (3열)
  headerRow3: {
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
  renderRow3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '1em',
    padding: '0.5em 1em 0.75em',
    alignItems: 'center',
  },
  // 심볼 모드 (4열)
  headerRow4: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr 1fr 1fr',
    gap: '0.5em',
    padding: '0.5em 1em',
    fontWeight: 600,
    fontSize: '0.85em',
    color: 'var(--color-heading)',
    borderBottom: '2px solid var(--color-border)',
  },
  itemRow4: {
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
  muted: { color: 'var(--color-muted)', fontSize: '0.85em' },
};
