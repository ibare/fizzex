import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import type { Lang } from './i18n/types';
import { LangProvider } from './i18n/context';
import { detectLanguage } from './i18n/detect';
import Nav from './layout/Nav';
import Footer from './layout/Footer';
import Home from './pages/Home';

function LangRoot() {
  return <Navigate to={`/${detectLanguage()}/`} replace />;
}

function LangShell() {
  const { lang } = useParams<{ lang: string }>();
  const validLang: Lang = lang === 'ko' ? 'ko' : 'en';

  return (
    <LangProvider lang={validLang}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Nav />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route index element={<Home />} />
            <Route path="*" element={<Navigate to={`/${validLang}/`} replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </LangProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LangRoot />} />
      <Route path="/:lang/*" element={<LangShell />} />
    </Routes>
  );
}
