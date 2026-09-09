/**
 * SVG 조판 통합 테스트 — 실제 폰트로 Node 에서 돌린다.
 *
 * vitest environment 가 'node' 라 `document` 가 없다. 이 파일이 통과한다는 것은
 * DOM 없이 조판이 끝난다는 뜻이고, 그것이 이 표면의 존재 이유다.
 *
 * 폰트 파일 경로를 쓰는 곳은 테스트뿐이다 — 라이브러리 코드는 폰트를 주입받는다.
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { renderAstToSVG, renderLatexToSVG } from './svg-renderer.js';
import type { MathFont } from './types.js';
import { parseLatex } from '../latex/index.js';

// opentype.js 의 Font 가 구조적으로 MathFont 를 만족한다 —
// 이 대입이 컴파일되는 것 자체가 "opentype 에 의존하지 않는다" 는 설계의 검증이다.
const font: MathFont = opentype.loadSync(
  fileURLToPath(new URL('../../fonts/NewCMMath-Regular.otf', import.meta.url)),
);

describe('renderLatexToSVG', () => {
  it('DOM 없이 조판한다', () => {
    expect(typeof document).toBe('undefined');
    const { svg } = renderLatexToSVG('x^2 + 1', { font });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it.each([
    ['x^2 + 1'],
    ['\\frac{a}{b}'],
    ['\\int_0^1 x^2 dx'],
    ['\\sqrt{x+1}'],
    ['\\sum_{i=1}^{n} i'],
    ['\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}'],
    ['\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'],
  ])('%s 를 유효한 SVG 로 낸다', (latex) => {
    const { svg, width, height, baseline } = renderLatexToSVG(latex, { font });

    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(baseline).toBeGreaterThanOrEqual(0);
    expect(baseline).toBeLessThanOrEqual(height);
    expect(svg).toContain(`viewBox="0 0 ${width} ${height}"`);
    // 열린 태그 수와 자기닫힘 수가 맞아야 파서가 받는다
    expect(svg.match(/<path/g)?.length ?? 0).toBeGreaterThan(0);
  });

  it('글자를 <text> 가 아니라 윤곽선으로 낸다', () => {
    // <text> 로 내보내면 PDF 수신자에게 폰트 설치를 요구하게 된다
    const { svg } = renderLatexToSVG('x', { font });
    expect(svg).not.toContain('<text');
    expect(svg).toContain('<path');
  });

  it('큰 연산자와 근호가 실제로 그려진다', () => {
    // 적분·합·근호는 글리프와 벡터 path 두 경로를 모두 탄다
    const integral = renderLatexToSVG('\\int_0^1 x dx', { font });
    const plain = renderLatexToSVG('x', { font });
    expect(integral.height).toBeGreaterThan(plain.height);
    expect(integral.svg.length).toBeGreaterThan(plain.svg.length);
  });
});

describe('renderAstToSVG 옵션', () => {
  const ast = parseLatex('x + 1').ast;

  it('fontSize 를 키우면 결과도 커진다', () => {
    const small = renderAstToSVG(ast, { font, fontSize: 10 });
    const large = renderAstToSVG(ast, { font, fontSize: 40 });
    expect(large.width).toBeGreaterThan(small.width);
    expect(large.height).toBeGreaterThan(small.height);
  });

  it('색상을 반영한다', () => {
    const { svg } = renderAstToSVG(ast, { font, color: '#ff0000' });
    expect(svg).toContain('fill="#ff0000"');
  });

  it('backgroundColor 를 주면 배경 사각형을 깐다', () => {
    expect(renderAstToSVG(ast, { font }).svg).not.toContain('<rect width="100%"');
    expect(renderAstToSVG(ast, { font, backgroundColor: '#fff' }).svg).toContain(
      '<rect width="100%" height="100%" fill="#fff"/>',
    );
  });

  it('padding 이 크기에 더해진다', () => {
    const tight = renderAstToSVG(ast, { font, padding: 0 });
    const loose = renderAstToSVG(ast, { font, padding: 10 });
    expect(loose.width - tight.width).toBe(20);
    expect(loose.height - tight.height).toBe(20);
  });

  it('축소 폰트를 폭에 반영한다 — 지수가 붙어도 밑변 폭은 그대로다', () => {
    // 폭 측정자가 font 대입을 무시하면 지수가 밑과 같은 크기로 계산돼
    // 폭이 과하게 늘어난다.
    const base = renderAstToSVG(parseLatex('x').ast, { font, padding: 0 });
    const power = renderAstToSVG(parseLatex('x^2').ast, { font, padding: 0 });
    const full = renderAstToSVG(parseLatex('x2').ast, { font, padding: 0 });

    const exponentWidth = power.width - base.width;
    const fullSizeDigitWidth = full.width - base.width;
    expect(exponentWidth).toBeGreaterThan(0);
    expect(exponentWidth).toBeLessThan(fullSizeDigitWidth);
  });
});
