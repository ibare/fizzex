/**
 * LaTeX 입력 → 토큰 스트림
 *
 * 입력 문자 시퀀스를 의미 단위 토큰으로 분해.
 * 정책 결정(* → ×, 자릿수 그루핑, 진단 발행)의 단일 거점.
 *
 * AST와 무의존.
 */

export type TokenKind =
  /** 정수/소수 리터럴 — value는 전체 리터럴 문자열("10", "3.14", ".5") */
  | 'NUMBER'
  /** 단일 영문자 식별자 */
  | 'IDENT'
  /** 이항/단항 연산자 — value는 표시 문자(×, +, =, ≤ 등) */
  | 'OP'
  /** 백슬래시 명령어 — value는 명령어 이름("frac", "sin", "times") */
  | 'COMMAND'
  /** 이스케이프된 특수문자 — value는 문자 자체("{", "}", "|", "%", "&", "$", "#", "_") */
  | 'ESC'
  | 'LBRACE'
  | 'RBRACE'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'CARET'
  | 'UNDERSCORE'
  | 'PIPE'
  /** 인식되지 않은 문자 — 진단 동반 */
  | 'STRAY';

export interface Token {
  kind: TokenKind;
  value: string;
  start: number;
  end: number;
}

export interface LexDiagnostic {
  kind: 'stray-char' | 'trailing-dot' | 'lone-dot';
  message: string;
  pos: number;
  char: string;
}

export interface LexResult {
  tokens: Token[];
  diagnostics: LexDiagnostic[];
}

// ─────────────────────────────────────────────────────────────
// 정책 테이블 — 입력 문자 → 의미 단위 매핑의 단일 진실의 원천
// ─────────────────────────────────────────────────────────────

/** ASCII 입력 문자 → 표시용 연산자 기호 매핑 */
const ASCII_OPERATOR_MAP: Record<string, string> = {
  '*': '×', // Q1 결정: 학습자 친화로 × 사용
  '+': '+',
  '-': '-',
  '=': '=',
  '<': '<',
  '>': '>',
  '/': '/',
  ':': ':',
  ',': ',',
  ';': ';',
  '!': '!',
};

/** ASCII 문자가 연산자 기호로 매핑되는지 + 매핑된 문자 반환 */
export function asciiToOperator(char: string): string | null {
  return ASCII_OPERATOR_MAP[char] ?? null;
}

/** 숫자 리터럴의 첫 문자가 될 수 있는지 (digit 또는 leading dot) */
export function isNumericStart(char: string): boolean {
  return /[0-9.]/.test(char);
}

/** 변수가 될 수 있는 단일 영문자인지 */
export function isIdentChar(char: string): boolean {
  return /[a-zA-Z]/.test(char);
}

// ─────────────────────────────────────────────────────────────
// 토크나이저
// ─────────────────────────────────────────────────────────────

/** 단일 문자 매핑 — 비기호 토큰 */
const SINGLE_CHAR_TOKENS: Record<string, TokenKind> = {
  '{': 'LBRACE',
  '}': 'RBRACE',
  '(': 'LPAREN',
  ')': 'RPAREN',
  '[': 'LBRACKET',
  ']': 'RBRACKET',
  '^': 'CARET',
  _: 'UNDERSCORE',
  '|': 'PIPE',
};

/** 백슬래시 뒤에 올 수 있는 이스케이프 문자 */
const ESC_CHARS = new Set(['{', '}', '|', '%', '&', '$', '#', '_']);

export function tokenize(input: string): LexResult {
  const tokens: Token[] = [];
  const diagnostics: LexDiagnostic[] = [];
  let pos = 0;

  while (pos < input.length) {
    const ch = input[pos];

    if (ch === ' ' || ch === '\t' || ch === '\n') {
      pos++;
      continue;
    }

    // 숫자 리터럴: [0-9]+(\.[0-9]+)? 또는 \.[0-9]+
    if (isNumericStart(ch)) {
      const start = pos;
      let hasIntPart = false;
      let hasDot = false;
      let hasFracPart = false;

      while (pos < input.length && /[0-9]/.test(input[pos])) {
        hasIntPart = true;
        pos++;
      }
      if (input[pos] === '.') {
        hasDot = true;
        pos++;
        while (pos < input.length && /[0-9]/.test(input[pos])) {
          hasFracPart = true;
          pos++;
        }
      }

      // 외로운 '.' — 숫자 부분이 전혀 없음
      if (!hasIntPart && !hasFracPart) {
        diagnostics.push({
          kind: 'lone-dot',
          message: "외로운 '.': 앞뒤로 숫자가 없는 점은 무시됨",
          pos: start,
          char: '.',
        });
        // 점 하나만 소비, 토큰 미발행
        continue;
      }

      // 정수 뒤 trailing dot (예: "3.") — 경고 + dot 제외하여 토큰화 (dot은 소비함)
      if (hasIntPart && hasDot && !hasFracPart) {
        diagnostics.push({
          kind: 'trailing-dot',
          message: "후행 '.': '3.'은 '3'으로 처리됨. 소수는 '3.14' 또는 '3.0' 형태 사용",
          pos: pos - 1,
          char: '.',
        });
        // 정수 부분만 토큰화. dot은 이미 pos가 넘어간 상태로 소비됨.
        tokens.push({
          kind: 'NUMBER',
          value: input.slice(start, pos - 1),
          start,
          end: pos - 1,
        });
        continue;
      }

      const end = pos;
      tokens.push({
        kind: 'NUMBER',
        value: input.slice(start, end),
        start,
        end,
      });
      continue;
    }

    // 식별자 (단일 영문자)
    if (isIdentChar(ch)) {
      tokens.push({ kind: 'IDENT', value: ch, start: pos, end: pos + 1 });
      pos++;
      continue;
    }

    // 백슬래시 — 명령어 또는 이스케이프
    if (ch === '\\') {
      const start = pos;
      pos++; // '\' 소비
      // 이스케이프 문자
      if (pos < input.length && ESC_CHARS.has(input[pos])) {
        const escCh = input[pos];
        pos++;
        tokens.push({ kind: 'ESC', value: escCh, start, end: pos });
        continue;
      }
      // 비알파벳 단일문자 명령어 (\, \: \; \! \  등)
      if (pos < input.length && !/[a-zA-Z]/.test(input[pos])) {
        const cmdCh = input[pos];
        pos++;
        tokens.push({ kind: 'COMMAND', value: cmdCh, start, end: pos });
        continue;
      }
      // 알파벳 명령어 이름
      let name = '';
      while (pos < input.length && /[a-zA-Z]/.test(input[pos])) {
        name += input[pos];
        pos++;
      }
      // 명령어 뒤 별표 변형 (\align*)
      if (input[pos] === '*') {
        name += '*';
        pos++;
      }
      tokens.push({ kind: 'COMMAND', value: name, start, end: pos });
      continue;
    }

    // 단일 문자 비기호 토큰
    if (SINGLE_CHAR_TOKENS[ch]) {
      tokens.push({ kind: SINGLE_CHAR_TOKENS[ch], value: ch, start: pos, end: pos + 1 });
      pos++;
      continue;
    }

    // 연산자
    const opSymbol = asciiToOperator(ch);
    if (opSymbol !== null) {
      tokens.push({ kind: 'OP', value: opSymbol, start: pos, end: pos + 1 });
      pos++;
      continue;
    }

    // 인식되지 않은 문자 — 진단
    diagnostics.push({
      kind: 'stray-char',
      message: `인식되지 않은 문자: '${ch}'`,
      pos,
      char: ch,
    });
    tokens.push({ kind: 'STRAY', value: ch, start: pos, end: pos + 1 });
    pos++;
  }

  return { tokens, diagnostics };
}
