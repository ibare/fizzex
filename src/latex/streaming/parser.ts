/**
 * FizzexStreamParser — 스트리밍 파서
 *
 * StreamTokenizer로 텍스트/수식 경계를 감지하고,
 * 완성된 수학 블록에 tolerantParse()를 적용하여
 * StreamOutput 시퀀스를 생성한다.
 *
 * 핵심 원칙:
 * 1. 완성될 때까지 수식으로 렌더링하지 않는다
 * 2. 확정된 부분은 즉시 방출한다
 * 3. 화면 점프를 최소화한다
 */

import type {
  StreamOutput,
  StreamParserOptions,
  StreamParserState,
} from './types';
import type { TolerantParseOptions } from '../tolerant/types';
import { StreamTokenizer } from './tokenizer';
import { tolerantParse } from '../tolerant';

/** 기본 옵션 */
const DEFAULT_OPTIONS: StreamParserOptions = {
  parserMode: 'strict_fallback',
  delimiterDetection: 'explicit',
  unknownCommandPolicy: 'allow_unknown_leaf',
  backslashNormalization: true,
  whitespaceNormalization: true,
  delimiterBufferSize: 50,
  estimateSize: false,
};

/**
 * 스트리밍 LaTeX 파서
 *
 * LLM 토큰 스트리밍에 최적화된 점진적 파서.
 * feed(chunk)으로 텍스트를 공급하고, end()로 스트림을 종료한다.
 */
export class FizzexStreamParser {
  private tokenizer: StreamTokenizer;
  private options: StreamParserOptions;
  private tolerantOptions: Partial<TolerantParseOptions>;

  private mathAccumulator = '';
  private inMath = false;
  private displayMode = false;

  constructor(options?: Partial<StreamParserOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.tokenizer = new StreamTokenizer({
      delimiterDetection: this.options.delimiterDetection,
      delimiterBufferSize: this.options.delimiterBufferSize,
    });
    this.tolerantOptions = {
      parserMode: this.options.parserMode,
      delimiterDetection: this.options.delimiterDetection,
      unknownCommandPolicy: this.options.unknownCommandPolicy,
      backslashNormalization: this.options.backslashNormalization,
      whitespaceNormalization: this.options.whitespaceNormalization,
    };
  }

  /** 청크를 공급하고 생성된 출력을 반환한다 */
  feed(chunk: string): StreamOutput[] {
    const tokens = this.tokenizer.feed(chunk);
    const outputs: StreamOutput[] = [];

    for (const token of tokens) {
      switch (token.type) {
        case 'text':
          if (token.content.length > 0) {
            outputs.push({ type: 'text', content: token.content });
          }
          break;

        case 'math_start':
          this.inMath = true;
          this.displayMode = token.displayMode ?? false;
          this.mathAccumulator = '';
          break;

        case 'math_content':
          this.mathAccumulator += token.content;
          break;

        case 'math_end':
          this.completeMathBlock(outputs);
          break;

        case 'ambiguous':
          outputs.push({
            type: 'ambiguous_delimiter',
            content: token.content,
            possibleMath: true,
          });
          break;
      }
    }

    // 수학 수집 중이면 math_pending 방출
    // tokenizer 내부 버퍼(mathBuffer + commandBuffer)도 포함하여 전체 pending 상태 반영
    if (this.inMath) {
      const tokState = this.tokenizer.getState();
      const pendingLatex = this.mathAccumulator + tokState.mathBuffer + tokState.commandBuffer;
      if (pendingLatex.length > 0) {
        outputs.push({
          type: 'math_pending',
          rawLatex: pendingLatex,
          displayMode: this.displayMode,
        });
      }
    }

    return outputs;
  }

  /** 스트림 종료. 잔여 버퍼를 처리한다 */
  end(): StreamOutput[] {
    const tokens = this.tokenizer.end();
    const outputs: StreamOutput[] = [];

    for (const token of tokens) {
      switch (token.type) {
        case 'text':
          if (token.content.length > 0) {
            outputs.push({ type: 'text', content: token.content });
          }
          break;

        case 'math_content':
          this.mathAccumulator += token.content;
          break;

        case 'math_end':
          this.completeMathBlock(outputs);
          break;

        case 'ambiguous':
          outputs.push({
            type: 'ambiguous_delimiter',
            content: token.content,
            possibleMath: false,
          });
          break;
      }
    }

    // 미닫힘 수학 → math_failed (렌더링하지 않음)
    if (this.inMath) {
      if (this.mathAccumulator.length > 0) {
        const result = tolerantParse(this.mathAccumulator, this.tolerantOptions);
        outputs.push({
          type: 'math_failed',
          rawLatex: this.mathAccumulator,
          diagnostics: result.diagnostics,
        });
      }
      this.inMath = false;
      this.mathAccumulator = '';
    }

    return outputs;
  }

  /** 현재 상태의 읽기 전용 스냅샷 */
  getState(): StreamParserState {
    return {
      tokenizerState: this.tokenizer.getState(),
      pendingMath: this.inMath ? this.mathAccumulator : null,
      inMath: this.inMath,
      displayMode: this.displayMode,
    };
  }

  /** 초기 상태로 리셋한다 */
  reset(): void {
    this.tokenizer.reset();
    this.mathAccumulator = '';
    this.inMath = false;
    this.displayMode = false;
  }

  /** 수학 블록 완성 처리 */
  private completeMathBlock(outputs: StreamOutput[]): void {
    const result = tolerantParse(this.mathAccumulator, this.tolerantOptions);

    if (result.renderDecision.mode !== 'none') {
      outputs.push({
        type: 'math_complete',
        ast: result.ast,
        diagnostics: result.diagnostics,
        renderDecision: result.renderDecision,
        latex: this.mathAccumulator,
        displayMode: this.displayMode,
      });
    } else {
      outputs.push({
        type: 'math_failed',
        rawLatex: this.mathAccumulator,
        diagnostics: result.diagnostics,
      });
    }

    this.inMath = false;
    this.mathAccumulator = '';
  }
}
