/**
 * Fizzex 엔진 래퍼
 *
 * parseLatex → astToBox 2단계 검증
 */

import { parseLatex } from '../../../latex/latex-parser';
import { astToBox } from '../../../box/ast-to-box';
import { createDeterministicMetrics } from '../../layout/deterministic-metrics';
import type { Engine, EngineResult } from './types';

const metrics = createDeterministicMetrics();

export const fizzexEngine: Engine = {
  name: 'fizzex',

  test(latex: string): EngineResult {
    const result: EngineResult = {
      parseSuccess: false,
      renderSuccess: false,
    };

    // 파싱 테스트
    const parseResult = parseLatex(latex);
    if (!parseResult.hasErrors) {
      result.parseSuccess = true;
    } else {
      result.parseError = parseResult.errors[0]?.message?.substring(0, 200);
    }

    // 박스 생성 테스트 (파싱 에러와 무관하게 시도 — partial AST 포함)
    try {
      const box = astToBox(parseResult.ast, metrics as any);
      if (box && box.width > 0) {
        result.renderSuccess = true;
      } else {
        result.renderError = box ? `빈 박스: width=${box.width}` : 'null 박스';
      }
    } catch (e: unknown) {
      result.renderError = (e as Error).message?.substring(0, 200);
    }

    return result;
  },
};
