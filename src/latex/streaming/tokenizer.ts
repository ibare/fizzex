/**
 * Stream Tokenizer — 텍스트/수식 경계 감지
 *
 * 4단계 상태 머신으로 입력 청크를 StreamToken 시퀀스로 변환한다.
 * 청크 경계를 안전하게 처리하며, 상태가 feed() 호출 간 유지된다.
 *
 * 단계:
 * - text: 일반 텍스트 축적
 * - maybe_delimiter: $ 구분자 모호성 해결 (auto_safe/auto_all)
 * - inline_math: \( ... \) 수학 내용 축적
 * - display_math: \[ ... \] 수학 내용 축적
 */

import type {
  TokenizerState,
  TokenizerOptions,
  StreamToken,
  LexicalContext,
} from './types.js';

/** 텍스트 모드 커맨드 — 내부에서 구분자 감지를 건너뛴다 */
const TEXT_MODE_COMMANDS = new Set([
  'text', 'mathrm', 'textrm', 'textbf', 'textit', 'textsf', 'texttt',
  'mbox', 'hbox', 'fbox', 'operatorname',
]);

/** 기본 옵션 */
const DEFAULT_OPTIONS: TokenizerOptions = {
  delimiterDetection: 'explicit',
  delimiterBufferSize: 50,
};

/** 초기 상태 생성 */
function createInitialState(): TokenizerState {
  return {
    phase: 'text',
    braceDepth: 0,
    commandBuffer: '',
    textModeDepth: 0,
    escapeNext: false,
    delimiterBuffer: '',
    contextStack: [],
    mathBuffer: '',
    textBuffer: '',
    globalOffset: 0,
  };
}

/**
 * Stream Tokenizer — 텍스트/수식 경계를 감지하는 상태 머신
 */
export class StreamTokenizer {
  private state: TokenizerState;
  private options: TokenizerOptions;

  constructor(options?: Partial<TokenizerOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.state = createInitialState();
  }

  /** 청크를 공급하고 생성된 토큰을 반환한다 */
  feed(chunk: string): StreamToken[] {
    const tokens: StreamToken[] = [];

    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      const globalPos = this.state.globalOffset + i;

      switch (this.state.phase) {
        case 'text':
          this.processText(ch, globalPos, tokens);
          break;
        case 'inline_math':
        case 'display_math':
          this.processMath(ch, globalPos, tokens);
          break;
        case 'maybe_delimiter':
          this.processMaybeDelimiter(ch, globalPos, tokens);
          break;
      }
    }

    this.state.globalOffset += chunk.length;

    // 텍스트 단계에서 확정된 텍스트를 즉시 방출 (백슬래시 대기 중이면 보존)
    if (this.state.phase === 'text' && this.state.textBuffer.length > 0) {
      this.flushTextBuffer(this.state.globalOffset, tokens);
    }

    return tokens;
  }

  /** 스트림 종료. 잔여 버퍼를 토큰으로 변환한다 */
  end(): StreamToken[] {
    const tokens: StreamToken[] = [];
    const pos = this.state.globalOffset;

    // 텍스트 버퍼 플러시
    if (this.state.textBuffer.length > 0) {
      tokens.push(this.createToken(
        'text',
        this.state.textBuffer,
        pos - this.state.textBuffer.length,
        pos,
        true,
      ));
      this.state.textBuffer = '';
    }

    // 커맨드 버퍼에 미완성 백슬래시가 있으면 텍스트로 방출
    if (this.state.commandBuffer.length > 0) {
      tokens.push(this.createToken(
        'text',
        this.state.commandBuffer,
        pos - this.state.commandBuffer.length,
        pos,
        true,
      ));
      this.state.commandBuffer = '';
    }

    // 수학 모드에서 종료 — 미닫힘 수학
    if (this.state.phase === 'inline_math' || this.state.phase === 'display_math') {
      if (this.state.mathBuffer.length > 0) {
        const displayMode = this.state.phase === 'display_math';
        tokens.push(this.createToken(
          'math_content',
          this.state.mathBuffer,
          pos - this.state.mathBuffer.length,
          pos,
          false,
          displayMode,
        ));
      }
      // math_end 없이 종료 — isComplete: false 토큰은 이미 위에서 방출
      this.state.mathBuffer = '';
    }

    // 구분자 버퍼 플러시
    if (this.state.delimiterBuffer.length > 0) {
      tokens.push(this.createToken(
        'text',
        this.state.delimiterBuffer,
        pos - this.state.delimiterBuffer.length,
        pos,
        true,
      ));
      this.state.delimiterBuffer = '';
    }

    return tokens;
  }

  /** 모호한 구분자 버퍼를 강제 해결한다 */
  flushAmbiguous(): StreamToken[] {
    if (this.state.phase !== 'maybe_delimiter' || this.state.delimiterBuffer.length === 0) {
      return [];
    }

    const pos = this.state.globalOffset;
    const token = this.createToken(
      'text',
      this.state.delimiterBuffer,
      pos - this.state.delimiterBuffer.length,
      pos,
      true,
    );
    this.state.delimiterBuffer = '';
    this.state.phase = 'text';
    return [token];
  }

  /** 현재 상태의 읽기 전용 스냅샷 */
  getState(): Readonly<TokenizerState> {
    return { ...this.state, contextStack: [...this.state.contextStack] };
  }

  /** 초기 상태로 리셋한다 */
  reset(): void {
    this.state = createInitialState();
  }

  // =========================================================================
  // 단계별 처리
  // =========================================================================

  /** text 단계: 일반 텍스트 처리 */
  private processText(ch: string, pos: number, tokens: StreamToken[]): void {
    // 커맨드 버퍼에 미완성 백슬래시가 있는 경우
    if (this.state.commandBuffer === '\\') {
      if (ch === '(') {
        // \( → inline math 시작
        this.flushTextBuffer(pos - 1, tokens);
        this.state.commandBuffer = '';
        this.enterMathMode(false, pos - 1, tokens);
        return;
      }
      if (ch === '[') {
        // \[ → display math 시작
        this.flushTextBuffer(pos - 1, tokens);
        this.state.commandBuffer = '';
        this.enterMathMode(true, pos - 1, tokens);
        return;
      }
      // 다른 문자 → 백슬래시 + 문자를 텍스트에 추가
      this.state.textBuffer += '\\' + ch;
      this.state.commandBuffer = '';
      return;
    }

    if (ch === '\\') {
      this.state.commandBuffer = '\\';
      return;
    }

    // $ 감지 (auto_safe / auto_all 모드)
    if (ch === '$' && this.options.delimiterDetection !== 'explicit') {
      this.flushTextBuffer(pos, tokens);
      this.state.phase = 'maybe_delimiter';
      this.state.delimiterBuffer = '$';
      return;
    }

    this.state.textBuffer += ch;
  }

  /** math 단계: 수학 내용 처리 */
  private processMath(ch: string, pos: number, tokens: StreamToken[]): void {
    const isDisplay = this.state.phase === 'display_math';

    // 커맨드 버퍼에 미완성 백슬래시
    if (this.state.commandBuffer === '\\') {
      if (ch === ')' && !isDisplay && this.state.textModeDepth === 0 && this.state.braceDepth === 0) {
        // \) → inline math 종료
        this.state.commandBuffer = '';
        this.exitMathMode(pos + 1, tokens);
        return;
      }
      if (ch === ']' && isDisplay && this.state.textModeDepth === 0 && this.state.braceDepth === 0) {
        // \] → display math 종료
        this.state.commandBuffer = '';
        this.exitMathMode(pos + 1, tokens);
        return;
      }

      // 커맨드 이름 시작
      if (/[a-zA-Z]/.test(ch)) {
        this.state.commandBuffer = '\\' + ch;
        return;
      }

      // 비알파벳 → 백슬래시 + 문자를 수학 버퍼에 추가
      this.state.mathBuffer += '\\' + ch;
      this.state.commandBuffer = '';
      return;
    }

    // 커맨드 이름 축적 중
    if (this.state.commandBuffer.length > 1) {
      if (/[a-zA-Z]/.test(ch)) {
        this.state.commandBuffer += ch;
        return;
      }

      // 커맨드 이름 완성
      const cmdName = this.state.commandBuffer.slice(1);

      // 텍스트 모드 커맨드 감지
      if (TEXT_MODE_COMMANDS.has(cmdName) && ch === '{') {
        this.state.textModeDepth++;
        this.state.mathBuffer += this.state.commandBuffer + ch;
        this.state.commandBuffer = '';
        return;
      }

      // 일반 커맨드 → 수학 버퍼에 추가
      this.state.mathBuffer += this.state.commandBuffer;
      this.state.commandBuffer = '';
      // 현재 문자를 다시 처리 (재귀 대신 fall-through)
      // ch를 아래에서 계속 처리
    } else if (ch === '\\') {
      this.state.commandBuffer = '\\';
      return;
    }

    // 텍스트 모드 내부에서 중괄호 추적
    if (this.state.textModeDepth > 0) {
      if (ch === '{') {
        this.state.braceDepth++;
      } else if (ch === '}') {
        if (this.state.braceDepth > 0) {
          this.state.braceDepth--;
        } else {
          this.state.textModeDepth--;
        }
      }
      this.state.mathBuffer += ch;
      return;
    }

    // 일반 수학 모드
    if (ch === '{') {
      this.state.braceDepth++;
    } else if (ch === '}') {
      if (this.state.braceDepth > 0) {
        this.state.braceDepth--;
      }
    }

    this.state.mathBuffer += ch;
  }

  /** maybe_delimiter 단계: $ 구분자 모호성 해결 */
  private processMaybeDelimiter(ch: string, pos: number, tokens: StreamToken[]): void {
    this.state.delimiterBuffer += ch;

    // 버퍼 크기 초과 → 텍스트로 해결
    if (this.state.delimiterBuffer.length > this.options.delimiterBufferSize) {
      tokens.push(this.createToken(
        'text',
        this.state.delimiterBuffer,
        pos - this.state.delimiterBuffer.length + 1,
        pos + 1,
        true,
      ));
      this.state.delimiterBuffer = '';
      this.state.phase = 'text';
    }

    // TODO: auto_safe/auto_all 시 $ 닫기 감지 로직 (코어 루프 안정 후 구현)
  }

  // =========================================================================
  // 헬퍼
  // =========================================================================

  /** 텍스트 버퍼를 토큰으로 플러시 */
  private flushTextBuffer(endPos: number, tokens: StreamToken[]): void {
    if (this.state.textBuffer.length === 0) return;

    tokens.push(this.createToken(
      'text',
      this.state.textBuffer,
      endPos - this.state.textBuffer.length,
      endPos,
      true,
    ));
    this.state.textBuffer = '';
  }

  /** 수학 모드 진입 */
  private enterMathMode(displayMode: boolean, startPos: number, tokens: StreamToken[]): void {
    this.state.phase = displayMode ? 'display_math' : 'inline_math';
    this.state.braceDepth = 0;
    this.state.textModeDepth = 0;
    this.state.mathBuffer = '';
    this.state.contextStack.push({ type: 'math', displayMode });

    tokens.push(this.createToken(
      'math_start',
      displayMode ? '\\[' : '\\(',
      startPos,
      startPos + 2,
      true,
      displayMode,
    ));
  }

  /** 수학 모드 종료 */
  private exitMathMode(endPos: number, tokens: StreamToken[]): void {
    const displayMode = this.state.phase === 'display_math';

    // 수학 내용 토큰 방출
    if (this.state.mathBuffer.length > 0) {
      const contentStart = endPos - 2 - this.state.mathBuffer.length;
      tokens.push(this.createToken(
        'math_content',
        this.state.mathBuffer,
        contentStart,
        endPos - 2,
        true,
        displayMode,
      ));
    }

    // math_end 토큰 방출
    tokens.push(this.createToken(
      'math_end',
      displayMode ? '\\]' : '\\)',
      endPos - 2,
      endPos,
      true,
      displayMode,
    ));

    // 상태 리셋
    this.state.mathBuffer = '';
    this.state.braceDepth = 0;
    this.state.textModeDepth = 0;
    this.state.phase = 'text';
    this.state.contextStack.pop();
  }

  /** 토큰 생성 */
  private createToken(
    type: StreamToken['type'],
    content: string,
    start: number,
    end: number,
    isComplete: boolean,
    displayMode?: boolean,
  ): StreamToken {
    return {
      type,
      content,
      displayMode,
      isComplete,
      sourceRange: { start, end },
    };
  }
}
