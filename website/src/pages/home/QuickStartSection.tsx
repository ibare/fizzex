import { useState } from 'react';
import { useLang } from '../../i18n/context';
import TabGroup from '../../components/TabGroup';
import CodeBlock from '../../components/CodeBlock';
import { snippets, tabKeys } from '../../data/quickstart-code';

export default function QuickStartSection() {
  const { t } = useLang();
  const [active, setActive] = useState(0);

  const tabLabels = tabKeys.map((key) => t.quickStart.tabs[key]);

  return (
    <section id="quick-start" className="section section--alt">
      <div className="container">
        <div className="section__header">
          <h2 className="section__title">{t.quickStart.title}</h2>
          <p className="section__sub">{t.quickStart.sub}</p>
        </div>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <TabGroup tabs={tabLabels} activeIndex={active} onChange={setActive} />
          <CodeBlock>{snippets[tabKeys[active]]}</CodeBlock>
        </div>
      </div>
    </section>
  );
}
