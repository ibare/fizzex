import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import type { Lang } from './i18n/types';
import { LangProvider } from './i18n/context';
import { detectLanguage } from './i18n/detect';
import Nav from './layout/Nav';
import Footer from './layout/Footer';
import { lazy, Suspense } from 'react';
import Home from './pages/Home';

const Playground = lazy(() => import('./pages/Playground'));
const PipelineExplorer = lazy(() => import('./pages/PipelineExplorer'));
const Examples = lazy(() => import('./pages/Examples'));
const Comparison = lazy(() => import('./pages/Comparison'));

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
          <Suspense fallback={<div style={{ padding: '4em', textAlign: 'center' }}>Loading...</div>}>
            <Routes>
              <Route index element={<Home />} />
              <Route path="playground" element={<Playground />} />
              <Route path="pipeline" element={<PipelineExplorer />} />
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
