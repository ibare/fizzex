import { useNavigate, useParams } from 'react-router-dom';
import { useLang } from '../i18n/context';
import type { Lang } from '../i18n/types';

export default function Nav() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { lang: currentLang } = useParams();

  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'ko' : 'en';
    navigate(`/${next}/`);
  };

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <a href={`/${currentLang}/`} style={styles.logo}>Fizzex</a>
        <nav style={styles.nav}>
          <a href={`/${currentLang}/`} style={styles.link}>{t.nav.home}</a>
          <a href="https://github.com/ibare/fizzex" target="_blank" rel="noopener noreferrer" style={styles.link}>{t.nav.github}</a>
          <button onClick={toggleLang} style={styles.langBtn}>
            {lang === 'en' ? '한국어' : 'English'}
          </button>
        </nav>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
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
    fontSize: '1.2em',
    color: 'var(--color-heading)',
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
  },
  langBtn: {
    background: 'var(--color-bg-alt)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.3em 0.8em',
    fontSize: '0.85em',
    cursor: 'pointer',
    color: 'var(--color-text)',
  },
};
