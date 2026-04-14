/**
 * KaTeX 엔진 래퍼
 *
 * strict mode에서 파싱 + renderToString으로 렌더 테스트
 */

import katex, { __parse } from 'katex';
import type { Engine, EngineResult } from './types';

export const katexEngine: Engine = {
  name: 'katex',

  test(latex: string): EngineResult {
    const result: EngineResult = {
      parseSuccess: false,
      renderSuccess: false,
    };

    // 파싱 테스트 (strict mode)
    try {
      __parse(latex, { strict: true });
      result.parseSuccess = true;
    } catch (e: unknown) {
      result.parseError = (e as Error).message?.substring(0, 200);
      return result;
    }

    // 렌더 테스트
    try {
      katex.renderToString(latex, { throwOnError: true });
      result.renderSuccess = true;
    } catch (e: unknown) {
      result.renderError = (e as Error).message?.substring(0, 200);
    }

    return result;
  },
};
