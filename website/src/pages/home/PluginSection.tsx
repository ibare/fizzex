import { useLang } from '../../i18n/context';
import { Link, useParams } from 'react-router-dom';
import CodeBlock from '../../components/CodeBlock';

const snippet = `const renderer = new FizzexRenderer(container);
renderer.render('\\\\frac{1}{2} + x^2');`;

const layers = [
  { key: 'layer_core', color: 'var(--color-step-1)' },
  { key: 'layer_headless', color: 'var(--color-step-3)' },
  { key: 'layer_plugins', color: 'var(--color-step-5)' },
] as const;

export default function PluginSection() {
  const { t } = useLang();
  const { lang } = useParams();

  return (
    <section className="section" style={{ background: '#fff' }}>
      <div className="container">
        <div className="section__header">
          <h2 className="section__title">{t.pluginSection.title}</h2>
          <p className="section__sub">{t.pluginSection.sub}</p>
        </div>

        <div style={styles.layerRow}>
          {layers.map((layer, i) => {
            const data = t.pluginSection[layer.key];
            return (
              <div key={layer.key} style={styles.layerWrapper}>
                <div style={{ ...styles.card, borderTop: `3px solid ${layer.color}` }}>
                  <div style={{ ...styles.cardTitle, color: layer.color }}>
                    {data.title}
                  </div>
                  <div style={styles.cardDesc}>{data.desc}</div>
                </div>
                {i < layers.length - 1 && (
                  <div style={styles.arrow}>&rarr;</div>
                )}
              </div>
            );
          })}
        </div>

        <div style={styles.codeWrapper}>
          <CodeBlock>{snippet}</CodeBlock>
        </div>

        <div style={styles.ctaWrapper}>
          <Link to={`/${lang}/plugins`} className="btn btn--outline">
            {t.pluginSection.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '0.5em',
    marginBottom: '2em',
  },
  layerWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5em',
  },
  card: {
    padding: '1.2em',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
    minWidth: '160px',
    maxWidth: '220px',
  },
  cardTitle: {
    fontSize: '0.95em',
    fontWeight: 700,
    marginBottom: '0.3em',
  },
  cardDesc: {
    fontSize: '0.8em',
    color: 'var(--color-muted)',
    lineHeight: 1.5,
  },
  arrow: {
    color: 'var(--color-muted)',
    fontSize: '1.4em',
    flexShrink: 0,
  },
  codeWrapper: {
    maxWidth: '480px',
    margin: '0 auto 1.5em',
  },
  ctaWrapper: {
    textAlign: 'center' as const,
  },
};
