import { useLang } from '../../i18n/context';
import Card from '../../components/Card';

export default function FeaturesSection() {
  const { t } = useLang();

  const features = [
    t.features.editor,
    t.features.latex,
    t.features.analysis,
    t.features.evaluator,
    t.features.visualization,
    t.features.autocomplete,
  ];

  return (
    <section className="section section--alt">
      <div className="container">
        <div className="section__header">
          <h2 className="section__title">{t.features.title}</h2>
          <p className="section__sub">{t.features.sub}</p>
        </div>
        <div className="grid grid--2x3">
          {features.map((f) => (
            <Card key={f.title} title={f.title} description={f.desc} />
          ))}
        </div>
      </div>
    </section>
  );
}
