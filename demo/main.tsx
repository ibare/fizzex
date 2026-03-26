import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import RenderingValidation from './RenderingValidation';

type Page = 'demo' | 'validation';

function Router() {
  const [page, setPage] = useState<Page>(() => {
    const hash = window.location.hash.slice(1);
    return hash === 'validation' ? 'validation' : 'demo';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      setPage(hash === 'validation' ? 'validation' : 'demo');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div>
      {/* 네비게이션 바 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-12 gap-6">
            <span className="font-bold text-lg text-gray-800">Fizzex</span>
            <div className="flex gap-4">
              <a
                href="#demo"
                className={`text-sm font-medium transition-colors ${
                  page === 'demo'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                데모
              </a>
              <a
                href="#validation"
                className={`text-sm font-medium transition-colors ${
                  page === 'validation'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                렌더링 검증
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* 페이지 콘텐츠 */}
      <div className="pt-12">
        {page === 'demo' ? <App /> : <RenderingValidation />}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
