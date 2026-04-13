/**
 * 수학 폰트별 글리프 매핑
 *
 * 확장 가능한 구분자(괄호, 대괄호 등)의 크기별 글리프 정의
 */

/** 확장 글리프 구성 요소 */
export interface ExtensibleGlyph {
  /** 상단 글리프 */
  top: string;
  /** 중간 연장 글리프 (반복 가능) */
  ext: string;
  /** 하단 글리프 */
  bot: string;
  /** 중간 연결 글리프 (중괄호 등에 사용) */
  mid?: string;
}

/** 크기별 괄호 글리프 */
export interface DelimiterGlyphs {
  /** 기본 크기 (1em 이하) */
  small: string;
  /** 중간 크기 (1em ~ 2em) */
  medium?: string;
  /** 큰 크기 (2em ~ 3em) */
  large?: string;
  /** 매우 큰 크기 (3em 이상) - 조합형 */
  extensible?: ExtensibleGlyph;
}

/** 구분자 쌍 (열림/닫힘) */
export interface DelimiterPair {
  open: DelimiterGlyphs;
  close: DelimiterGlyphs;
}

/** 폰트별 글리프 매핑 */
export interface FontGlyphMapping {
  /** 폰트 패밀리 이름 */
  fontFamily: string;
  /** 소괄호 () */
  parenthesis: DelimiterPair;
  /** 대괄호 [] */
  bracket: DelimiterPair;
  /** 중괄호 {} */
  brace: DelimiterPair;
  /** 절댓값 || */
  absoluteValue: DelimiterPair;
  /** 바닥/천장 함수 */
  floor?: DelimiterPair;
  ceiling?: DelimiterPair;
}

/**
 * New Computer Modern Math 폰트 글리프 매핑
 *
 * Unicode Technical Note #28 (Math Typesetting)의 확장 괄호 문자 사용
 * https://unicode.org/notes/tn28/
 */
export const NEW_CM_MATH: FontGlyphMapping = {
  fontFamily: '"NewCMMath", "New Computer Modern Math", serif',

  // 참고: medium/large에 hook 글리프(\u239B 등)를 사용하면 괄호 일부만 보임
  // 단독 사용 시에는 일반 괄호를 스케일링하여 사용해야 함
  // extensible은 조립용으로 별도 구현 필요

  parenthesis: {
    open: {
      small: '(',
      // medium/large: 일반 괄호 사용 (스케일링으로 크기 조절)
      extensible: {
        top: '\u239B', // ⎛ LEFT PARENTHESIS UPPER HOOK
        ext: '\u239C', // ⎜ LEFT PARENTHESIS EXTENSION
        bot: '\u239D', // ⎝ LEFT PARENTHESIS LOWER HOOK
      },
    },
    close: {
      small: ')',
      extensible: {
        top: '\u239E', // ⎞ RIGHT PARENTHESIS UPPER HOOK
        ext: '\u239F', // ⎟ RIGHT PARENTHESIS EXTENSION
        bot: '\u23A0', // ⎠ RIGHT PARENTHESIS LOWER HOOK
      },
    },
  },

  bracket: {
    open: {
      small: '[',
      extensible: {
        top: '\u23A1', // ⎡ LEFT SQUARE BRACKET UPPER CORNER
        ext: '\u23A2', // ⎢ LEFT SQUARE BRACKET EXTENSION
        bot: '\u23A3', // ⎣ LEFT SQUARE BRACKET LOWER CORNER
      },
    },
    close: {
      small: ']',
      extensible: {
        top: '\u23A4', // ⎤ RIGHT SQUARE BRACKET UPPER CORNER
        ext: '\u23A5', // ⎥ RIGHT SQUARE BRACKET EXTENSION
        bot: '\u23A6', // ⎦ RIGHT SQUARE BRACKET LOWER CORNER
      },
    },
  },

  brace: {
    open: {
      small: '{',
      extensible: {
        top: '\u23A7', // ⎧ LEFT CURLY BRACKET UPPER HOOK
        ext: '\u23AA', // ⎪ CURLY BRACKET EXTENSION
        mid: '\u23A8', // ⎨ LEFT CURLY BRACKET MIDDLE PIECE
        bot: '\u23A9', // ⎩ LEFT CURLY BRACKET LOWER HOOK
      },
    },
    close: {
      small: '}',
      extensible: {
        top: '\u23AB', // ⎫ RIGHT CURLY BRACKET UPPER HOOK
        ext: '\u23AA', // ⎪ CURLY BRACKET EXTENSION
        mid: '\u23AC', // ⎬ RIGHT CURLY BRACKET MIDDLE PIECE
        bot: '\u23AD', // ⎭ RIGHT CURLY BRACKET LOWER HOOK
      },
    },
  },

  absoluteValue: {
    open: {
      small: '|',
      medium: '\u2223', // ∣ DIVIDES
      large: '\u2223',
      extensible: {
        top: '\u23D0', // ⏐ VERTICAL LINE EXTENSION (또는 |)
        ext: '\u23D0',
        bot: '\u23D0',
      },
    },
    close: {
      small: '|',
      medium: '\u2223',
      large: '\u2223',
      extensible: {
        top: '\u23D0',
        ext: '\u23D0',
        bot: '\u23D0',
      },
    },
  },

  floor: {
    open: {
      small: '\u230A', // ⌊ LEFT FLOOR
      extensible: {
        top: '\u23A2', // ⎢ LEFT SQUARE BRACKET EXTENSION
        ext: '\u23A2',
        bot: '\u23A3', // ⎣ LEFT SQUARE BRACKET LOWER CORNER
      },
    },
    close: {
      small: '\u230B', // ⌋ RIGHT FLOOR
      extensible: {
        top: '\u23A5', // ⎥ RIGHT SQUARE BRACKET EXTENSION
        ext: '\u23A5',
        bot: '\u23A6', // ⎦ RIGHT SQUARE BRACKET LOWER CORNER
      },
    },
  },

  ceiling: {
    open: {
      small: '\u2308', // ⌈ LEFT CEILING
      extensible: {
        top: '\u23A1', // ⎡ LEFT SQUARE BRACKET UPPER CORNER
        ext: '\u23A2',
        bot: '\u23A2', // ⎢ LEFT SQUARE BRACKET EXTENSION
      },
    },
    close: {
      small: '\u2309', // ⌉ RIGHT CEILING
      extensible: {
        top: '\u23A4', // ⎤ RIGHT SQUARE BRACKET UPPER CORNER
        ext: '\u23A5',
        bot: '\u23A5', // ⎥ RIGHT SQUARE BRACKET EXTENSION
      },
    },
  },
};

/**
 * 기본 폰트 (Times New Roman) 글리프 매핑
 * 확장 글리프 없이 스케일링만 사용
 */
export const DEFAULT_FONT: FontGlyphMapping = {
  fontFamily: '"Latin Modern Math", "Computer Modern", "Times New Roman", Times, serif',

  parenthesis: {
    open: { small: '(' },
    close: { small: ')' },
  },

  bracket: {
    open: { small: '[' },
    close: { small: ']' },
  },

  brace: {
    open: { small: '{' },
    close: { small: '}' },
  },

  absoluteValue: {
    open: { small: '|' },
    close: { small: '|' },
  },
};

/** 사용 가능한 폰트 매핑 */
export const FONT_MAPPINGS: Record<string, FontGlyphMapping> = {
  'newcm': NEW_CM_MATH,
  'default': DEFAULT_FONT,
};

/** 현재 활성 폰트 매핑 */
let currentMapping: FontGlyphMapping = NEW_CM_MATH;

/** 폰트 매핑 설정 */
export function setFontMapping(name: string): void {
  currentMapping = FONT_MAPPINGS[name] || DEFAULT_FONT;
}

/** 현재 폰트 매핑 가져오기 */
export function getFontMapping(): FontGlyphMapping {
  return currentMapping;
}

/** 현재 폰트 패밀리 가져오기 */
export function getFontFamily(): string {
  return currentMapping.fontFamily;
}

/**
 * 구분자 타입에 따른 글리프 쌍 가져오기
 */
export function getDelimiterGlyphs(
  type: '(' | '[' | '{' | '|'
): DelimiterPair {
  const mapping = getFontMapping();

  switch (type) {
    case '(':
      return mapping.parenthesis;
    case '[':
      return mapping.bracket;
    case '{':
      return mapping.brace;
    case '|':
      return mapping.absoluteValue;
    default:
      return mapping.parenthesis;
  }
}

/**
 * 높이에 따른 적절한 글리프 선택
 *
 * 현재는 단일 글리프(small)를 스케일링하여 사용
 * 확장형(extensible) 조립은 추후 구현 예정
 *
 * @param glyphs 크기별 글리프 정의
 * @param height 필요한 높이 (em 단위)
 * @returns 사용할 글리프 또는 확장 정보
 */
export function selectGlyphForHeight(
  glyphs: DelimiterGlyphs,
  height: number
): { type: 'single'; char: string } | { type: 'extensible'; parts: ExtensibleGlyph } {
  // 단일 글리프 사용 (스케일링으로 크기 조절)
  // medium/large 글리프는 hook만 있어서 단독 사용 불가
  return { type: 'single', char: glyphs.small };
}
