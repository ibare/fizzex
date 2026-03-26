import { useLang } from '../i18n/context';

export default function Footer() {
  const { t } = useLang();

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <span style={styles.brand}>Fizzex</span>
        <span style={styles.tagline}>{t.footer.tagline}</span>
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    borderTop: '1px solid var(--color-border)',
    padding: '2em 0',
    marginTop: '4em',
  },
  container: {
    maxWidth: 'var(--container-max)',
    margin: '0 auto',
    padding: '0 1.5em',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85em',
    color: 'var(--color-muted)',
  },
  brand: {
    fontWeight: 600,
    color: 'var(--color-heading)',
  },
  tagline: {},
};
