import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { useLang } from '../i18n/context';

export default function Nav() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { lang: currentLang } = useParams();
  const { pathname } = useLocation();

  const navItems = [
    { to: 'playground', label: t.playground.title },
    { to: 'pipeline', label: 'Pipeline' },
    { to: 'plugins', label: t.pluginsPage.title },
    { to: 'examples', label: lang === 'ko' ? '예제' : 'Examples' },
    { to: 'comparison', label: lang === 'ko' ? '비교' : 'Comparison' },
  ];

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <Link to={`/${currentLang}/`} style={styles.logo}>
          Fizzex
        </Link>
        <nav style={styles.nav}>
          {navItems.map(({ to, label }) => {
            const isActive = pathname.includes(`/${to}`);
            return (
              <Link
                key={to}
                to={`/${currentLang}/${to}`}
                style={isActive ? styles.linkActive : styles.link}
              >
                {label}
              </Link>
            );
          })}
          <a
            href="https://github.com/ibare/fizzex"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            <GitHubIcon />
          </a>
          <button
            onClick={() => navigate(lang === 'ko' ? '/en/' : '/ko/')}
            style={styles.langBtn}
          >
            {lang === 'ko' ? 'EN' : 'KO'}
          </button>
        </nav>
      </div>
    </header>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--color-border)',
    padding: '0.8em 0',
  },
  container: {
    maxWidth: 'var(--container-max)',
    margin: '0 auto',
    padding: '0 1.5em',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontWeight: 700,
    fontSize: '1.15em',
    color: 'var(--color-accent)',
    textDecoration: 'none',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5em',
  },
  link: {
    color: 'var(--color-muted)',
    fontSize: '0.9em',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  },
  linkActive: {
    color: 'var(--color-accent)',
    fontSize: '0.9em',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  },
  langBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    padding: '0.25em 0.6em',
    fontSize: '0.82em',
    cursor: 'pointer',
    color: 'var(--color-muted)',
    fontFamily: 'inherit',
    fontWeight: 500,
    transition: 'all 0.15s',
    borderRadius: 'var(--radius-sm)',
  },
};
