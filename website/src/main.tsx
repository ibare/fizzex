import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setMathFontUrl } from 'fizzex';
import App from './App';
import './global.css';

// base path에 맞게 폰트 URL 설정
setMathFontUrl(import.meta.env.BASE_URL + 'fonts/NewCMMath-Regular.woff2');

createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename="/fizzex/">
    <App />
  </BrowserRouter>,
);
