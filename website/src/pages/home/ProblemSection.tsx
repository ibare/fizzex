import { useLang } from '../../i18n/context';

export default function ProblemSection() {
  const { t } = useLang();

  return (
    <section className="section section--alt">
      <div className="container">
        <div className="section__header">
          <h2 className="section__title">{t.problem.title}</h2>
          <p className="section__sub">{t.problem.sub}</p>
        </div>
        <div className="grid grid--2">
          <div className="card">
            <h3 style={styles.colTitle}>{t.problem.current_title}</h3>
            <ul style={styles.list}>
              {t.problem.current_items.map((item, i) => (
                <li key={i} style={styles.listItem}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="card" style={{ borderColor: 'var(--color-accent)', borderWidth: '1.5px' }}>
            <h3 style={{ ...styles.colTitle, color: 'var(--color-accent)' }}>
              {t.problem.fizzex_title}
            </h3>
            <ul style={styles.list}>
              {t.problem.fizzex_items.map((item, i) => (
                <li key={i} style={styles.listItem}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  colTitle: {
    fontSize: '1em',
    fontWeight: 600,
    color: 'var(--color-muted)',
    marginBottom: '0.8em',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6em',
  },
  listItem: {
    fontSize: '0.9em',
    color: 'var(--color-text)',
    lineHeight: 1.5,
    paddingLeft: '1.2em',
    position: 'relative',
  },
};
