import { describe, it, expect } from 'vitest';
import { tokenize, asciiToOperator, isNumericStart, isIdentChar } from './lexer';
import type { Token } from './lexer';

/** 토큰 결과를 [kind, value] 튜플 리스트로 단순화 */
function toPairs(tokens: Token[]): Array<[string, string]> {
  return tokens.map((t) => [t.kind, t.value]);
}

describe('lexer — 정책 헬퍼', () => {
  it('asciiToOperator: * → ×', () => {
    expect(asciiToOperator('*')).toBe('×');
  });

  it('asciiToOperator: + → +', () => {
    expect(asciiToOperator('+')).toBe('+');
  });

  it('asciiToOperator: 알파벳은 null', () => {
    expect(asciiToOperator('a')).toBeNull();
  });

  it('asciiToOperator: 인식 안 되는 기호는 null', () => {
    expect(asciiToOperator('@')).toBeNull();
  });

  it('isNumericStart: 0~9 모두 true', () => {
    for (let i = 0; i <= 9; i++) expect(isNumericStart(String(i))).toBe(true);
  });

  it('isNumericStart: . 도 true (leading dot 허용)', () => {
    expect(isNumericStart('.')).toBe(true);
  });

  it('isNumericStart: 문자는 false', () => {
    expect(isNumericStart('x')).toBe(false);
  });

  it('isIdentChar: 소문자/대문자 영문자 true', () => {
    expect(isIdentChar('a')).toBe(true);
    expect(isIdentChar('Z')).toBe(true);
  });

  it('isIdentChar: 숫자/기호 false', () => {
    expect(isIdentChar('1')).toBe(false);
    expect(isIdentChar('_')).toBe(false);
  });
});

describe('lexer — 숫자 리터럴', () => {
  it('단일 자릿수', () => {
    const { tokens } = tokenize('7');
    expect(toPairs(tokens)).toEqual([['NUMBER', '7']]);
  });

  it('두 자리 정수가 단일 NUMBER 토큰', () => {
    const { tokens } = tokenize('10');
    expect(toPairs(tokens)).toEqual([['NUMBER', '10']]);
    expect(tokens[0]).toMatchObject({ start: 0, end: 2 });
  });

  it('세 자리 정수', () => {
    const { tokens } = tokenize('123');
    expect(toPairs(tokens)).toEqual([['NUMBER', '123']]);
  });

  it('소수', () => {
    const { tokens } = tokenize('3.14');
    expect(toPairs(tokens)).toEqual([['NUMBER', '3.14']]);
  });

  it('앞자리 0 생략 소수 (.5)', () => {
    const { tokens } = tokenize('.5');
    expect(toPairs(tokens)).toEqual([['NUMBER', '.5']]);
  });

  it('후행 dot (3.) — 정수 토큰화 + trailing-dot 진단', () => {
    const { tokens, diagnostics } = tokenize('3.');
    expect(toPairs(tokens)).toEqual([['NUMBER', '3']]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].kind).toBe('trailing-dot');
  });

  it('외로운 . — 토큰 발행 안 함 + lone-dot 진단', () => {
    const { tokens, diagnostics } = tokenize('.');
    expect(tokens).toHaveLength(0);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].kind).toBe('lone-dot');
  });

  it('소스 범위가 리터럴 전체 범위', () => {
    const { tokens } = tokenize('  3.14');
    expect(tokens[0]).toMatchObject({ start: 2, end: 6 });
  });
});

describe('lexer — 식별자', () => {
  it('단일 영문자는 IDENT 토큰', () => {
    const { tokens } = tokenize('x');
    expect(toPairs(tokens)).toEqual([['IDENT', 'x']]);
  });

  it('"abc"는 IDENT 3개 (단일 문자 정책)', () => {
    const { tokens } = tokenize('abc');
    expect(toPairs(tokens)).toEqual([
      ['IDENT', 'a'],
      ['IDENT', 'b'],
      ['IDENT', 'c'],
    ]);
  });
});

describe('lexer — 연산자', () => {
  it('+ - = < > : / 는 자기자신 OP', () => {
    expect(toPairs(tokenize('+').tokens)).toEqual([['OP', '+']]);
    expect(toPairs(tokenize('-').tokens)).toEqual([['OP', '-']]);
    expect(toPairs(tokenize('=').tokens)).toEqual([['OP', '=']]);
    expect(toPairs(tokenize('<').tokens)).toEqual([['OP', '<']]);
    expect(toPairs(tokenize('>').tokens)).toEqual([['OP', '>']]);
    expect(toPairs(tokenize(':').tokens)).toEqual([['OP', ':']]);
    expect(toPairs(tokenize('/').tokens)).toEqual([['OP', '/']]);
  });

  it('* → OP × (Q1 결정)', () => {
    const { tokens } = tokenize('*');
    expect(toPairs(tokens)).toEqual([['OP', '×']]);
  });

  it('a*b*c — 곱셈 기호가 정상 토큰화', () => {
    const { tokens } = tokenize('a*b*c');
    expect(toPairs(tokens)).toEqual([
      ['IDENT', 'a'],
      ['OP', '×'],
      ['IDENT', 'b'],
      ['OP', '×'],
      ['IDENT', 'c'],
    ]);
  });

  it(', ; ! 도 OP 토큰', () => {
    expect(toPairs(tokenize(',').tokens)).toEqual([['OP', ',']]);
    expect(toPairs(tokenize(';').tokens)).toEqual([['OP', ';']]);
    expect(toPairs(tokenize('!').tokens)).toEqual([['OP', '!']]);
  });
});

describe('lexer — 백슬래시 명령어', () => {
  it('\\frac', () => {
    const { tokens } = tokenize('\\frac');
    expect(toPairs(tokens)).toEqual([['COMMAND', 'frac']]);
  });

  it('\\times', () => {
    const { tokens } = tokenize('\\times');
    expect(toPairs(tokens)).toEqual([['COMMAND', 'times']]);
  });

  it('별표 변형 \\align*', () => {
    const { tokens } = tokenize('\\align*');
    expect(toPairs(tokens)).toEqual([['COMMAND', 'align*']]);
  });

  it('단일문자 명령어 \\,', () => {
    const { tokens } = tokenize('\\,');
    expect(toPairs(tokens)).toEqual([['COMMAND', ',']]);
  });

  it('이스케이프 \\{', () => {
    const { tokens } = tokenize('\\{');
    expect(toPairs(tokens)).toEqual([['ESC', '{']]);
  });

  it('이스케이프 \\|', () => {
    const { tokens } = tokenize('\\|');
    expect(toPairs(tokens)).toEqual([['ESC', '|']]);
  });
});

describe('lexer — 구조 문자', () => {
  it('{, }, (, ), [, ], ^, _, |', () => {
    const { tokens } = tokenize('{}()[]^_|');
    expect(toPairs(tokens)).toEqual([
      ['LBRACE', '{'],
      ['RBRACE', '}'],
      ['LPAREN', '('],
      ['RPAREN', ')'],
      ['LBRACKET', '['],
      ['RBRACKET', ']'],
      ['CARET', '^'],
      ['UNDERSCORE', '_'],
      ['PIPE', '|'],
    ]);
  });
});

describe('lexer — 공백·진단', () => {
  it('공백/탭/개행은 스킵', () => {
    const { tokens } = tokenize('a  b\tc\nd');
    expect(toPairs(tokens)).toEqual([
      ['IDENT', 'a'],
      ['IDENT', 'b'],
      ['IDENT', 'c'],
      ['IDENT', 'd'],
    ]);
  });

  it('인식 안 되는 @ — STRAY 토큰 + 진단', () => {
    const { tokens, diagnostics } = tokenize('a@b');
    expect(toPairs(tokens)).toEqual([
      ['IDENT', 'a'],
      ['STRAY', '@'],
      ['IDENT', 'b'],
    ]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].kind).toBe('stray-char');
  });
});

describe('lexer — 조합 시나리오', () => {
  it('x + 10', () => {
    const { tokens } = tokenize('x + 10');
    expect(toPairs(tokens)).toEqual([
      ['IDENT', 'x'],
      ['OP', '+'],
      ['NUMBER', '10'],
    ]);
  });

  it('x^{12}', () => {
    const { tokens } = tokenize('x^{12}');
    expect(toPairs(tokens)).toEqual([
      ['IDENT', 'x'],
      ['CARET', '^'],
      ['LBRACE', '{'],
      ['NUMBER', '12'],
      ['RBRACE', '}'],
    ]);
  });

  it('\\frac{1}{2}', () => {
    const { tokens } = tokenize('\\frac{1}{2}');
    expect(toPairs(tokens)).toEqual([
      ['COMMAND', 'frac'],
      ['LBRACE', '{'],
      ['NUMBER', '1'],
      ['RBRACE', '}'],
      ['LBRACE', '{'],
      ['NUMBER', '2'],
      ['RBRACE', '}'],
    ]);
  });

  it('2*3 — silent skip이 아니라 정상 토큰화', () => {
    const { tokens } = tokenize('2*3');
    expect(toPairs(tokens)).toEqual([
      ['NUMBER', '2'],
      ['OP', '×'],
      ['NUMBER', '3'],
    ]);
  });
});
