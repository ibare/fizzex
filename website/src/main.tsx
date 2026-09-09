import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setMathFontUrl } from 'fizzex';
import mathFontUrl from '../../fonts/NewCMMath-Regular.woff2?url';
import App from './App';
import './global.css';

// 리포 루트 fonts/ 를 단일 원본으로 삼는다 — vite 가 자산으로 처리해 base path 를 붙인다.
// public/ 에 사본을 두면 루트 폰트와 갈라진다.
setMathFontUrl(mathFontUrl);

createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename="/fizzex/">
    <App />
  </BrowserRouter>,
);
