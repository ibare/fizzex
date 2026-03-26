import { useLang } from '../i18n/context';

export default function Home() {
  const { t, lang } = useLang();

  return (
    <>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.container}>
          <h1 style={styles.headline}>{t.hero.headline}</h1>
          <p style={styles.sub}>{t.hero.sub}</p>
          <div style={styles.ctas}>
            <a href={`/${lang}/demo`} style={styles.ctaPrimary}>{t.hero.cta_demo}</a>
            <a href="https://github.com/ibare/fizzex" target="_blank" rel="noopener noreferrer" style={styles.ctaSecondary}>{t.hero.cta_github}</a>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>{t.quickStart.title}</h2>
          <p style={styles.sectionSub}>{t.quickStart.sub}</p>
          <div style={styles.codeBlock}>
            <p style={styles.codeLabel}>{t.quickStart.install_label}</p>
            <pre>npm install fizzex</pre>
          </div>
          <div style={{ ...styles.codeBlock, marginTop: '1.5em' }}>
            <p style={styles.codeLabel}>{t.quickStart.usage_label}</p>
            <pre>{`import { parseLatex, astToLatex } from 'fizzex';

const ast = parseLatex('\\\\frac{1}{2} + x^2');
const latex = astToLatex(ast);`}</pre>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ ...styles.section, background: 'var(--color-bg-alt)' }}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>{t.features.title}</h2>
          <p style={styles.sectionSub}>{t.features.sub}</p>
          <div style={styles.grid}>
            <FeatureCard title={t.features.editor_title} desc={t.features.editor_desc} />
            <FeatureCard title={t.features.latex_title} desc={t.features.latex_desc} />
            <FeatureCard title={t.features.analysis_title} desc={t.features.analysis_desc} />
            <FeatureCard title={t.features.cas_title} desc={t.features.cas_desc} />
            <FeatureCard title={t.features.visualization_title} desc={t.features.visualization_desc} />
            <FeatureCard title={t.features.i18n_title} desc={t.features.i18n_desc} />
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>{t.architecture.title}</h2>
          <p style={styles.sectionSub}>{t.architecture.sub}</p>
          <div style={styles.codeBlock}>
            <p style={styles.codeLabel}>{t.architecture.pipeline_label}</p>
            <pre>{`LaTeX → parseLatex() → AST → astToBox() → Box → layoutBox() → Canvas`}</pre>
          </div>
        </div>
      </section>
    </>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      <p style={styles.cardDesc}>{desc}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    padding: '5em 0 4em',
    textAlign: 'center',
  },
  container: {
    maxWidth: 'var(--container-max)',
    margin: '0 auto',
    padding: '0 1.5em',
  },
  headline: {
    fontSize: '2.5em',
    fontWeight: 800,
    lineHeight: 1.2,
    color: 'var(--color-heading)',
    whiteSpace: 'pre-line',
  },
  sub: {
    marginTop: '1em',
    fontSize: '1.1em',
    color: 'var(--color-muted)',
    maxWidth: '600px',
    marginLeft: 'auto',
    marginRight: 'auto',
    lineHeight: 1.6,
  },
  ctas: {
    marginTop: '2em',
    display: 'flex',
    gap: '1em',
    justifyContent: 'center',
  },
  ctaPrimary: {
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0.7em 1.8em',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '1em',
    textDecoration: 'none',
  },
  ctaSecondary: {
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    padding: '0.7em 1.8em',
    borderRadius: 'var(--radius)',
    fontWeight: 500,
    fontSize: '1em',
    textDecoration: 'none',
  },
  section: {
    padding: 'var(--section-pad) 0',
  },
  sectionTitle: {
    fontSize: '1.8em',
    fontWeight: 700,
    color: 'var(--color-heading)',
    textAlign: 'center',
  },
  sectionSub: {
    marginTop: '0.5em',
    color: 'var(--color-muted)',
    textAlign: 'center',
    marginBottom: '2em',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.5em',
  },
  card: {
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    padding: '1.5em',
  },
  cardTitle: {
    fontSize: '1.1em',
    fontWeight: 600,
    color: 'var(--color-heading)',
    marginBottom: '0.5em',
  },
  cardDesc: {
    fontSize: '0.9em',
    color: 'var(--color-muted)',
    lineHeight: 1.5,
  },
  codeBlock: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  codeLabel: {
    fontSize: '0.85em',
    fontWeight: 600,
    color: 'var(--color-muted)',
    marginBottom: '0.5em',
  },
};
