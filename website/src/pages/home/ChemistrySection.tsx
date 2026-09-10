import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createStateFromLatex } from 'fizzex';
import { EditorView } from 'fizzex/react';
import type { EditorState } from 'fizzex';
import { useLang } from '../../i18n/context';

/**
 * 섹션이 보여주는 화학식과 그 캡션 키.
 *
 * 수식과 캡션을 한 배열에 묶는다. 둘을 따로 두고 인덱스로 맞물리게 하면 한쪽에만
 * 항목을 더했을 때 카드가 조용히 사라지거나 수식 없는 카드가 나오는데, 컴파일러가
 * 그것을 잡지 못한다. 여기서는 `captionKey` 가 틀리면 컴파일이 멈춘다.
 *
 * LaTeX 는 사람이 읽는 말이 아니라 데이터라 i18n 이 아니라 여기 둔다 —
 * HeroFormulas 의 FORMULAS 와 같은 이유다.
 */
const CARDS = [
  { latex: '\\ce{2H2 + O2 -> 2H2O}', captionKey: 'reaction' },
  { latex: '\\ce{SO4^2-}', captionKey: 'charge' },
  { latex: '\\ce{^{227}_{90}Th}', captionKey: 'isotope' },
  { latex: '\\ce{N2 + 3H2 <=>[Fe] 2NH3}', captionKey: 'equilibrium' },
] as const;

export default function ChemistrySection() {
  const { t, lang } = useLang();

  const states = useMemo<(EditorState | null)[]>(
    () =>
      CARDS.map(({ latex }) => {
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
          {CARDS.map(({ latex, captionKey }, i) => {
            const caption = t.chemistrySection[captionKey];
            return (
              <div key={latex} className="card">
                {states[i] && (
                  <div style={styles.renderBox}>
                    <EditorView initialState={states[i]} readOnly autoSize />
                  </div>
                )}
                <h3 className="card__title">{caption.title}</h3>
                <p className="card__desc">{caption.desc}</p>
                <code style={styles.latex}>{latex}</code>
              </div>
            );
          })}
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
