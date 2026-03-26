import { useState, useCallback, useMemo } from 'react';
import { useLang } from '../i18n/context';
import { parseLatex, analyzeExpression, astToLatex } from 'fizzex';
import { MathCanvas } from 'fizzex/react';
import type { ExpressionAnalysis, EditorState } from 'fizzex';

const PRESETS = [
  'x^2 + 2x - 3 = 0',
  '\\frac{1}{2} + \\frac{1}{3}',
  '\\int_0^1 x^2 \\, dx',
  '\\sin^2\\theta + \\cos^2\\theta = 1',
  '\\sum_{n=1}^{\\infty} \\frac{1}{n^2}',
  '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
  '|x - 1| < 3',
  'E = mc^2',
];

export default function Playground() {
  const { t } = useLang();
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [presetState, setPresetState] = useState<EditorState | null>(null);
  const [analysis, setAnalysis] = useState<ExpressionAnalysis | null>(null);
  const [latex, setLatex] = useState('');

  const handleChange = useCallback((state: EditorState) => {
    setEditorState(state);
    setAnalysis(null);
    try {
      setLatex(astToLatex(state.ast));
    } catch {
      setLatex('');
    }
  }, []);

  const handlePreset = useCallback((preset: string) => {
    try {
      const { createStateFromLatex } = require('fizzex') as typeof import('fizzex');
      const state = createStateFromLatex(preset);
      setPresetState(state);
      setEditorState(state);
      setLatex(preset);
      setAnalysis(null);
    } catch {
      /* ignore */
    }
  }, []);

  const handleAnalyze = () => {
    const ast = editorState?.ast;
    if (!ast) return;
    try {
      setAnalysis(analyzeExpression(ast));
    } catch {
      setAnalysis(null);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="section__header">
          <h2 className="section__title">{t.playground.title}</h2>
          <p className="section__sub">{t.playground.sub}</p>
        </div>

        <div className="grid grid--2">
          {/* Left: Editor */}
          <div>
            <label style={styles.label}>{t.playground.input_label}</label>
            <div className="card" style={styles.editorCard}>
              <MathCanvas
                key={presetState ? JSON.stringify(presetState.ast).slice(0, 50) : 'empty'}
                initialState={presetState ?? undefined}
                onChange={handleChange}
                width={420}
                height={120}
                showSuggestions
                showStructureToggle
                theme="light"
              />
            </div>

            {latex && (
              <div style={styles.latexPreview}>
                <span style={styles.latexLabel}>LaTeX</span>
                <code style={styles.latexCode}>{latex}</code>
              </div>
            )}

            <div style={styles.presetsRow}>
              <span style={styles.presetsLabel}>{t.playground.presets_label}</span>
              <div style={styles.presetsWrap}>
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    className="btn btn--outline"
                    style={styles.presetBtn}
                    onClick={() => handlePreset(p)}
                  >
                    {p.length > 28 ? p.slice(0, 26) + '...' : p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Analysis */}
          <div>
            <button
              className="btn btn--primary"
              style={styles.analyzeBtn}
              onClick={handleAnalyze}
              disabled={!editorState}
            >
              {t.playground.analyze_btn}
            </button>

            {analysis && (
              <div className="card" style={{ marginTop: '1em' }}>
                <h3 className="card__title">{t.playground.analyze_btn}</h3>
                <div style={styles.analysisGrid}>
                  <AnalysisRow label={t.playground.analysis.form} value={analysis.form} />
                  <AnalysisRow label={t.playground.analysis.domain} value={analysis.primaryDomain} />
                  <AnalysisRow
                    label={t.playground.analysis.variables}
                    value={analysis.variables.length > 0 ? analysis.variables.join(', ') : '-'}
                  />
                  <AnalysisRow
                    label={t.playground.analysis.features}
                    value={analysis.features.length > 0 ? analysis.features.join(', ') : '-'}
                  />
                  <AnalysisRow
                    label={t.playground.analysis.visualization}
                    value={
                      analysis.visualization.recommended.length > 0
                        ? analysis.visualization.recommended.join(', ')
                        : '-'
                    }
                  />
                  <AnalysisRow
                    label={t.playground.analysis.complexity}
                    value={String(analysis.complexity)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalysisRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.analysisRow}>
      <span style={styles.analysisLabel}>{label}</span>
      <span style={styles.analysisValue}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  label: {
    display: 'block',
    fontSize: '0.85em',
    fontWeight: 600,
    color: 'var(--color-heading)',
    marginBottom: '0.5em',
  },
  editorCard: {
    padding: '0.5em',
    minHeight: '140px',
  },
  latexPreview: {
    marginTop: '0.75em',
    padding: '0.6em 1em',
    background: '#1e1e2e',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.75em',
    overflow: 'auto',
  },
  latexLabel: {
    fontSize: '0.7em',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  latexCode: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8em',
    color: '#cdd6f4',
    background: 'none',
    padding: 0,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
  },
  presetsRow: {
    marginTop: '1em',
  },
  presetsLabel: {
    display: 'block',
    fontSize: '0.8em',
    fontWeight: 600,
    color: 'var(--color-muted)',
    marginBottom: '0.5em',
  },
  presetsWrap: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.4em',
  },
  presetBtn: {
    fontSize: '0.75em',
    padding: '0.35em 0.7em',
    fontFamily: 'var(--font-mono)',
  },
  analyzeBtn: {
    width: '100%',
  },
  analysisGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5em',
    marginTop: '0.75em',
  },
  analysisRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '0.35em 0',
    borderBottom: '1px solid var(--color-border)',
  },
  analysisLabel: {
    fontSize: '0.85em',
    fontWeight: 600,
    color: 'var(--color-muted)',
  },
  analysisValue: {
    fontSize: '0.85em',
    color: 'var(--color-heading)',
    textAlign: 'right' as const,
    maxWidth: '60%',
    wordBreak: 'break-word' as const,
  },
};
