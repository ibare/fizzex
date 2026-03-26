import { useLang } from '../../i18n/context';
import CodeBlock from '../../components/CodeBlock';

export default function FooterCTASection() {
  const { t } = useLang();

  return (
    <section className="section" style={{ textAlign: 'center' }}>
      <div className="container">
        <h2 className="section__title" style={{ marginBottom: '1.5em' }}>
          {t.footerCta.title}
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5em' }}>
          <CodeBlock inline copyable>npm install fizzex</CodeBlock>
        </div>
        <div style={{ display: 'flex', gap: '0.75em', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#quick-start" className="btn btn--primary">{t.footerCta.cta_start}</a>
          <a
            href="https://github.com/ibare/fizzex"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--outline"
          >
            {t.footerCta.cta_github}
          </a>
          <a
            href="https://www.npmjs.com/package/fizzex"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--outline"
          >
            {t.footerCta.cta_npm}
          </a>
        </div>
      </div>
    </section>
  );
}
