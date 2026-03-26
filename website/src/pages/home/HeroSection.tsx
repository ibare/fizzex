import { useLang } from '../../i18n/context';
import CodeBlock from '../../components/CodeBlock';

export default function HeroSection() {
  const { t, lang } = useLang();

  return (
    <section style={{ padding: '6em 0 5em' }}>
      <div className="container">
        <h1 style={styles.headline}>{t.hero.headline}</h1>
        <p style={styles.sub}>{t.hero.sub}</p>
        <div style={{ maxWidth: '320px', margin: '2em 0' }}>
          <CodeBlock inline copyable>{t.hero.install}</CodeBlock>
        </div>
        <div style={styles.ctas}>
          <a href="#quick-start" className="btn btn--primary">{t.hero.cta_start}</a>
          <a
            href="https://github.com/ibare/fizzex"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--outline"
          >
            {t.hero.cta_github}
          </a>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headline: {
    fontSize: '2.8em',
    fontWeight: 800,
    lineHeight: 1.15,
    color: 'var(--color-heading)',
    whiteSpace: 'pre-line',
    maxWidth: '14em',
  },
  sub: {
    marginTop: '1em',
    fontSize: '1.1em',
    color: 'var(--color-muted)',
    maxWidth: '540px',
    lineHeight: 1.6,
  },
  ctas: {
    display: 'flex',
    gap: '0.75em',
    flexWrap: 'wrap' as const,
  },
};
