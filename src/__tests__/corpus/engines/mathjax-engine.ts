/**
 * MathJax 엔진 래퍼
 *
 * AllPackages (noerrors 제외) + SVG 출력으로 merror 감지
 */

import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import type { Engine, EngineResult } from './types';

// noerrors 패키지 제외 — merror 감지 정확도 확보
const packages = AllPackages.filter((p: string) => p !== 'noerrors' && p !== 'noundefined');

// 모듈 레벨 싱글톤 초기화
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({ packages });
const svg = new SVG({ fontCache: 'none' });
const htmlDoc = mathjax.document('', { InputJax: tex, OutputJax: svg });

export const mathjaxEngine: Engine = {
  name: 'mathjax',

  test(latex: string): EngineResult {
    const result: EngineResult = {
      parseSuccess: false,
      renderSuccess: false,
    };

    try {
      const node = htmlDoc.convert(latex, { display: false });
      const output = adaptor.outerHTML(node);

      // MathJax는 에러 시 merror 요소 또는 data-mjx-error 속성 생성
      const hasMerror = output.includes('data-mjx-error') || output.includes('merror');

      if (hasMerror) {
        const errorMatch = output.match(/data-mjx-error="([^"]*)"/);
        result.parseError = errorMatch?.[1] || 'MathJax merror';
      } else {
        result.parseSuccess = true;
        result.renderSuccess = true;
      }
    } catch (e: unknown) {
      result.parseError = (e as Error).message?.substring(0, 200);
    }

    // 내부 상태 리셋
    htmlDoc.clear();

    return result;
  },
};
