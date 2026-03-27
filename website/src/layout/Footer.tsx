import { useLang } from '../i18n/context';

export default function Footer() {
  const { t } = useLang();

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <span style={styles.tagline}>{t.footer.tagline}</span>
        <div style={styles.copyright}>
          © 2026 <a href="https://day1company.co.kr/home" target="_blank" rel="noopener noreferrer" className="copyright-link" style={styles.copyrightLink}>DAY 1 COMPANY</a>. All rights reserved.
        </div>
        <div style={styles.links}>
          <a href="https://github.com/ibare/fizzex" target="_blank" rel="noopener noreferrer" style={styles.link}>GitHub</a>
          <a href="https://www.npmjs.com/package/fizzex" target="_blank" rel="noopener noreferrer" style={styles.link}>npm</a>
          <span style={styles.link}>MIT</span>
        </div>
      </div>
      <style>{`
        .copyright-link:hover {
          text-decoration: underline !important;
        }
      `}</style>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    borderTop: '1px solid var(--color-border)',
    padding: '2em 0',
    marginTop: '0',
  },
  container: {
    maxWidth: 'var(--container-max)',
    margin: '0 auto',
    padding: '0 1.5em',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5em',
    fontSize: '0.85em',
    color: 'var(--color-muted)',
  },
  tagline: {},
  copyright: {
    fontSize: '0.75em',
    color: 'var(--color-muted)',
  },
  copyrightLink: {
    color: 'var(--color-muted)',
    textDecoration: 'none',
  },
  links: {
    display: 'flex',
    gap: '1.2em',
  },
  link: {
    color: 'var(--color-muted)',
    textDecoration: 'none',
    fontSize: '0.9em',
  },
};
