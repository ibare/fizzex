import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createStateFromLatex } from 'fizzex';
import { EditorView } from 'fizzex/react';
import type { EditorState } from 'fizzex';
import { useLang } from '../../i18n/context';

/**
 * 섹션이 보여주는 화학식.
 *
 * 순서가 `t.chemistrySection.items` 와 짝을 이룬다. LaTeX 는 사람이 읽는 말이 아니라
 * 데이터라 i18n 이 아니라 여기 둔다 — HeroFormulas 의 FORMULAS 와 같은 이유다.
 */
const FORMULAS = [
  '\\ce{2H2 + O2 -> 2H2O}',
  '\\ce{SO4^2-}',
  '\\ce{^{227}_{90}Th}',
  '\\ce{N2 + 3H2 <=>[Fe] 2NH3}',
];

export default function ChemistrySection() {
  const { t, lang } = useLang();

  const states = useMemo<(EditorState | null)[]>(
    () =>
      FORMULAS.map((latex) => {
        try {
          return createStateFromLatex(latex);
        } catch {
          return null;
        }
      }),
    [],
  );

  return (
    <section className="section section--alt">
      <div className="container">
        <div className="section__header">
          <h2 className="section__title">{t.chemistrySection.title}</h2>
          <p className="section__sub">{t.chemistrySection.sub}</p>
        </div>

        <div className="grid grid--2">
          {t.chemistrySection.items.map((item, i) => (
            <div key={item.title} className="card">
              {states[i] && (
                <div style={styles.renderBox}>
                  <EditorView initialState={states[i]} readOnly autoSize />
                </div>
              )}
              <h3 className="card__title">{item.title}</h3>
              <p className="card__desc">{item.desc}</p>
              <code style={styles.latex}>{FORMULAS[i]}</code>
            </div>
          ))}
        </div>

        <div style={styles.ctaRow}>
          <Link to={`/${lang}/examples/chemistry`} className="btn btn--outline">
            {t.chemistrySection.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  renderBox: {
    padding: '1.25em 1em',
    marginBottom: '1em',
    background: 'var(--color-bg-alt)',
    borderRadius: 'var(--radius-sm)',
    overflowX: 'auto',
  },
  latex: {
    display: 'block',
    marginTop: '0.75em',
    fontSize: '0.8em',
    color: 'var(--color-muted)',
    wordBreak: 'break-all',
  },
  ctaRow: {
    marginTop: '2em',
    display: 'flex',
    justifyContent: 'center',
  },
};
