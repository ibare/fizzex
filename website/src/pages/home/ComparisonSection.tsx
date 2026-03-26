import { useLang } from '../../i18n/context';
import ComparisonTable from '../../components/ComparisonTable';

export default function ComparisonSection() {
  const { t } = useLang();

  return (
    <section className="section">
      <div className="container">
        <div className="section__header">
          <h2 className="section__title">{t.comparison.title}</h2>
          <p className="section__sub">{t.comparison.sub}</p>
        </div>
        <ComparisonTable headers={t.comparison.headers} rows={t.comparison.rows} />
      </div>
    </section>
  );
}
