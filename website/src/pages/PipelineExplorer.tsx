import { useState, useEffect, useCallback, useMemo, Component } from 'react';
import type { ReactNode } from 'react';
import { useLang } from '../i18n/context';
import {
  parseLatex,
  analyzeExpression,
  simplify,
  factor,
  solve,
  createStateFromLatex,
  EditorView,
} from 'fizzex';
import type { ExpressionAnalysis, RootNode, CASResult } from 'fizzex';

/* ── Presets ── */

const PRESETS = [
  { label: 'x\u00B2 + 2x - 3 = 0', latex: 'x^2 + 2x - 3 = 0' },
  { label: 'sin(x)', latex: '\\sin(x)' },
  { label: '|x - 2| < 5', latex: '|x - 2| < 5' },
  { label: 'r = 1 + cos \u03B8', latex: 'r = 1 + \\cos\\theta' },
  { label: 'd/dx(x\u00B3 + 2x)', latex: '\\frac{d}{dx}(x^3 + 2x)' },
];

const STEP_KEYS = ['input', 'parse', 'analyze', 'compute', 'visualize'] as const;
type StepKey = (typeof STEP_KEYS)[number];

const STEP_COLORS = [
  'var(--color-step-1)',
  'var(--color-step-2)',
  'var(--color-step-3)',
  'var(--color-step-4)',
  'var(--color-step-5)',
];

/* ── Error Boundary ── */

interface EBProps { fallback: ReactNode; children: ReactNode }
interface EBState { hasError: boolean }

class ErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

/* ── Main Component ── */

export default function PipelineExplorer() {
  const { t } = useLang();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const latex = PRESETS[selectedIdx].latex;

  /* Parse once per expression */
  const { parsed, editorState, analysisResult } = useMemo(() => {
    let parsed: RootNode | null = null;
    let editorState: ReturnType<typeof createStateFromLatex> | null = null;
    let analysisResult: ExpressionAnalysis | null = null;
    try { parsed = parseLatex(latex); } catch { /* skip */ }
    try { editorState = createStateFromLatex(latex); } catch { /* skip */ }
    if (parsed) {
      try { analysisResult = analyzeExpression(parsed); } catch { /* skip */ }
    }
    return { parsed, editorState, analysisResult };
  }, [latex]);

  const stepMeta = t.pipelineExplorer.steps;

  return (
    <section className="section">
      <div className="container">
        <div className="section__header section__header--left">
          <h2 className="section__title">{t.pipelineExplorer.title}</h2>
          <p className="section__sub">{t.pipelineExplorer.sub}</p>
        </div>

        {/* Expression selector */}
        <div style={styles.selectorRow}>
          <label style={styles.selectLabel}>{t.pipelineExplorer.select_label}</label>
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            style={styles.select}
          >
            {PRESETS.map((p, i) => (
              <option key={p.latex} value={i}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Accordion steps */}
        <div style={styles.steps}>
          {STEP_KEYS.map((key, i) => {
            const meta = stepMeta[key];
            return (
              <div key={key} style={{ ...styles.stepCard, borderLeftColor: STEP_COLORS[i] }}>
                <div style={styles.stepHeader}>
                  <div style={{ ...styles.badge, background: STEP_COLORS[i] }}>{i + 1}</div>
                  <div style={styles.stepInfo}>
                    <div style={styles.stepTitle}>{meta.title}</div>
                    <div style={styles.stepDesc}>{meta.desc}</div>
                  </div>
                </div>
                <div style={styles.stepContent}>
                  <StepContent
                    stepKey={key}
                    latex={latex}
                    ast={parsed}
                    editorState={editorState}
                    analysis={analysisResult}
                    t={t}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Step Content Router ── */

interface StepContentProps {
  stepKey: StepKey;
  latex: string;
  ast: RootNode | null;
  editorState: ReturnType<typeof createStateFromLatex> | null;
  analysis: ExpressionAnalysis | null;
  t: ReturnType<typeof useLang>['t'];
}

function StepContent({ stepKey, latex, ast, editorState, analysis, t }: StepContentProps) {
  switch (stepKey) {
    case 'input':
      return <StepInput latex={latex} editorState={editorState} />;
    case 'parse':
      return <StepParse ast={ast} />;
    case 'analyze':
      return <StepAnalyze analysis={analysis} t={t} />;
    case 'compute':
      return <StepCompute latex={latex} analysis={analysis} t={t} />;
    case 'visualize':
      return <StepVisualize latex={latex} analysis={analysis} t={t} />;
  }
}

/* ── Step 1: Input ── */

function StepInput({
  latex,
  editorState,
}: {
  latex: string;
  editorState: ReturnType<typeof createStateFromLatex> | null;
}) {
  return (
    <div>
      <div className="code-block" style={{ marginBottom: '1em' }}>
        <code>{latex}</code>
      </div>
      {editorState && (
        <EditorView initialState={editorState} readOnly autoSize />
      )}
    </div>
  );
}

/* ── Step 2: Parse ── */

function StepParse({ ast }: { ast: RootNode | null }) {
  if (!ast) return <p style={styles.muted}>No AST available.</p>;

  const truncatedAst = truncateAst(ast, 3);
  const json = JSON.stringify(truncatedAst, null, 2);
  const display = json.length > 2000 ? json.slice(0, 2000) + '\n  ...' : json;

  return (
    <div className="code-block" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        <code>{display}</code>
      </pre>
    </div>
  );
}

function truncateAst(node: unknown, maxDepth: number, depth = 0): unknown {
  if (depth >= maxDepth) return '[...]';
  if (Array.isArray(node)) {
    return node.slice(0, 6).map((item) => truncateAst(item, maxDepth, depth + 1));
  }
  if (node && typeof node === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
      if (key === 'id') continue; // skip internal ids for readability
      result[key] = truncateAst(val, maxDepth, depth + 1);
    }
    return result;
  }
  return node;
}

/* ── Step 3: Analyze ── */

function StepAnalyze({
  analysis,
  t,
}: {
  analysis: ExpressionAnalysis | null;
  t: ReturnType<typeof useLang>['t'];
}) {
  if (!analysis) return <p style={styles.muted}>Analysis unavailable.</p>;

  const rows: [string, string][] = [
    [t.playground.analysis.form, analysis.form],
    [t.playground.analysis.domain, analysis.primaryDomain],
    [t.playground.analysis.variables, analysis.variables.join(', ') || '-'],
    [t.playground.analysis.features, analysis.features.join(', ') || '-'],
    [
      t.playground.analysis.visualization,
      [
        analysis.visualization.graphable2D && '2D',
        analysis.visualization.graphable3D && '3D',
        analysis.visualization.geometric && 'geometric',
        analysis.visualization.numberLine && 'number-line',
      ].filter(Boolean).join(', ') || '-',
    ],
    [t.playground.analysis.complexity, String(analysis.complexity)],
  ];

  return (
    <div className="card">
      {rows.map(([label, value]) => (
        <div key={label} style={styles.kvRow}>
          <span style={styles.kvLabel}>{label}</span>
          <span style={styles.kvValue}>{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Step 4: Compute ── */

function StepCompute({
  latex,
  analysis,
  t,
}: {
  latex: string;
  analysis: ExpressionAnalysis | null;
  t: ReturnType<typeof useLang>['t'];
}) {
  const [results, setResults] = useState<CASResult[]>([]);
  const [loading, setLoading] = useState(true);

  const runCAS = useCallback(async () => {
    setLoading(true);
    const ops: CASResult[] = [];
    try {
      const s = await simplify(latex);
      if (s.success) ops.push(s);
    } catch { /* skip */ }
    try {
      const f = await factor(latex);
      if (f.success) ops.push(f);
    } catch { /* skip */ }
    if (analysis?.form === 'equation') {
      try {
        const sv = await solve(latex);
        if (sv.success) ops.push(sv);
      } catch { /* skip */ }
    }
    setResults(ops);
    setLoading(false);
  }, [latex, analysis?.form]);

  useEffect(() => {
    runCAS();
  }, [runCAS]);

  if (loading) return <p style={styles.muted}>{t.pipelineExplorer.loading}</p>;

  if (results.length === 0) {
    return <p style={styles.muted}>{t.pipelineExplorer.no_cas}</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75em' }}>
      {results.map((r) => (
        <div key={r.operation} className="card">
          <div style={styles.kvRow}>
            <span style={styles.kvLabel}>{r.operation}</span>
            <span style={styles.kvValue}>{r.resultLatex ?? '-'}</span>
          </div>
          {r.resultLatex && (
            <div style={{ marginTop: '0.5em' }}>
              <RenderLatex latex={r.resultLatex} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RenderLatex({ latex }: { latex: string }) {
  try {
    const state = createStateFromLatex(latex);
    return <EditorView initialState={state} readOnly autoSize />;
  } catch {
    return <span style={styles.muted}>{latex}</span>;
  }
}

/* ── Step 5: Visualize ── */

function StepVisualize({
  latex,
  analysis,
  t,
}: {
  latex: string;
  analysis: ExpressionAnalysis | null;
  t: ReturnType<typeof useLang>['t'];
}) {
  if (!analysis) {
    return <p style={styles.muted}>{t.pipelineExplorer.no_viz}</p>;
  }

  const caps = analysis.visualization;
  const hasAny = caps.graphable2D || caps.graphable3D || caps.geometric || caps.numberLine;
  if (!hasAny) {
    return <p style={styles.muted}>{t.pipelineExplorer.no_viz}</p>;
  }

  return (
    <div style={{ padding: '16px', opacity: 0.6, fontStyle: 'italic' }}>
      Visualizer 프레임워크로 전환 예정
    </div>
  );
}

/* ── Styles ── */

const styles: Record<string, React.CSSProperties> = {
  selectorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1em',
    marginBottom: '2em',
    flexWrap: 'wrap',
  },
  selectLabel: {
    fontSize: '0.9em',
    fontWeight: 600,
    color: 'var(--color-heading)',
  },
  select: {
    fontFamily: 'inherit',
    fontSize: '0.9em',
    padding: '0.5em 1em',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '220px',
  },
  steps: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75em',
  },
  stepCard: {
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-border)',
    borderLeft: '4px solid',
    overflow: 'hidden',
    background: 'var(--color-bg)',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75em',
    padding: '1em 1.25em 0.5em',
  },
  badge: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    color: '#fff',
    fontSize: '0.8em',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: '0.95em',
    fontWeight: 600,
    color: 'var(--color-heading)',
  },
  stepDesc: {
    fontSize: '0.8em',
    color: 'var(--color-muted)',
    marginTop: '0.15em',
  },
  stepContent: {
    padding: '0 1.25em 1.25em',
  },
  muted: {
    color: 'var(--color-muted)',
    fontSize: '0.85em',
    fontStyle: 'italic',
  },
  kvRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: '0.35em 0',
    borderBottom: '1px solid var(--color-border)',
  },
  kvLabel: {
    fontSize: '0.85em',
    fontWeight: 600,
    color: 'var(--color-muted)',
  },
  kvValue: {
    fontSize: '0.85em',
    color: 'var(--color-heading)',
    textAlign: 'right' as const,
    maxWidth: '60%',
    wordBreak: 'break-word' as const,
  },
};
