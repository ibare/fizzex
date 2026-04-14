import { useLang } from '../../i18n/context';
import Card from '../../components/Card';

export default function UnderTheHoodSection() {
  const { t } = useLang();

  const items = [
    t.underTheHood.tolerantParser,
    t.underTheHood.texLayout,
    t.underTheHood.modular,
    t.underTheHood.hiFidelity,
  ];

  return (
    <section className="section">
      <div className="container">
        <div className="section__header">
          <h2 className="section__title">{t.underTheHood.title}</h2>
          <p className="section__sub">{t.underTheHood.sub}</p>
        </div>
        <div className="grid grid--2">
          {items.map((item) => (
            <Card key={item.title} title={item.title} description={item.desc} />
          ))}
        </div>
      </div>
    </section>
  );
}
