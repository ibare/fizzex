import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import type { Lang } from './i18n/types';
import { LangProvider } from './i18n/context';
import { detectLanguage } from './i18n/detect';
import Nav from './layout/Nav';
import Footer from './layout/Footer';
import { lazy, Suspense, useEffect, useRef } from 'react';
import Home from './pages/Home';

const Playground = lazy(() => import('./pages/Playground'));
const PipelineExplorer = lazy(() => import('./pages/PipelineExplorer'));
const Examples = lazy(() => import('./pages/Examples'));
const Plugins = lazy(() => import('./pages/Plugins'));
const Comparison = lazy(() => import('./pages/Comparison'));

function LangRoot() {
  return <Navigate to={`/${detectLanguage()}/`} replace />;
}

/** /:lang/:page 까지만 비교하여 페이지 전환 시에만 스크롤 리셋.
 *  카테고리 변경(/examples/basic → /examples/calc)은 스크롤 유지. */
function ScrollToTop() {
  const { pathname } = useLocation();
  const prevBase = useRef('');

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    const base = segments.slice(0, 2).join('/');
    if (base !== prevBase.current) {
      window.scrollTo(0, 0);
    }
    prevBase.current = base;
  }, [pathname]);

  return null;
}

function LangShell() {
  const { lang } = useParams<{ lang: string }>();
  const validLang: Lang = lang === 'ko' ? 'ko' : 'en';

  return (
    <LangProvider lang={validLang}>
      <ScrollToTop />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Nav />
        <main style={{ flex: 1 }}>
          <Suspense fallback={<div style={{ padding: '4em', textAlign: 'center' }}>Loading...</div>}>
            <Routes>
              <Route index element={<Home />} />
              <Route path="playground" element={<Playground />} />
              <Route path="pipeline" element={<PipelineExplorer />} />
              <Route path="plugins" element={<Plugins />} />
              <Route path="examples" element={<Examples />} />
              <Route path="examples/:category" element={<Examples />} />
              <Route path="comparison" element={<Comparison />} />
              <Route path="comparison/:category" element={<Comparison />} />
              <Route path="*" element={<Navigate to={`/${validLang}/`} replace />} />
            </Routes>
          </Suspense>
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
