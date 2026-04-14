/**
 * LaTeX 명령어 분류 세트
 *
 * 파서가 아직 구현하지 않았지만 표준 LaTeX에 존재하는 명령어와
 * 알려진 패키지 명령어를 분류한다.
 * parseCommand fallback에서 에러/경고 심각도 결정에 사용된다.
 */

/**
 * 표준 LaTeX / amsmath 명령어 중 미구현 목록
 *
 * 이 세트에 속하면 severity: 'error' (파서가 지원해야 하는 명령어)
 * 파서에 핸들러가 추가되면 이 세트에서 제거한다.
 */
export const STANDARD_UNIMPLEMENTED: ReadonlySet<string> = new Set([
  // 수학 연산자 정의 (미구현)
  'operatorname*',

  // 표준 심볼 (미구현)
  'coloneqq', 'eqqcolon',

  // 표준 공간 (미구현)
  'hfill', 'vfill', 'hskip', 'vskip', 'kern',
  'medspace', 'thickspace', 'negthinspace', 'negmedspace', 'negthickspace',

  // 색상 (미구현)
  'colorbox',

  // 기타 표준 (미구현)
  'smash', 'rlap', 'llap', 'clap',
  'choose', 'atop', 'above',
  'strut', 'mathstrut',
  'rule',
]);

/**
 * 알려진 패키지 명령어
 *
 * 이 맵에 속하면 severity: 'warning' + 패키지 정보 포함
 * 파서 범위 밖이지만 인식 가능한 명령어
 */
export const KNOWN_PACKAGE_COMMANDS: ReadonlyMap<string, string> = new Map([
  // physics 패키지
  ['norm', 'physics'], ['abs', 'physics'], ['dd', 'physics'],
  ['dv', 'physics'], ['pdv', 'physics'], ['eval', 'physics'],
  ['order', 'physics'], ['comm', 'physics'], ['acomm', 'physics'],
  ['qty', 'physics'], ['pqty', 'physics'], ['bqty', 'physics'],
  ['vqty', 'physics'], ['Bqty', 'physics'],
  ['ket', 'physics'], ['bra', 'physics'], ['braket', 'physics'],
  ['ketbra', 'physics'], ['expval', 'physics'], ['mel', 'physics'],

  // bm 패키지
  ['bm', 'bm'],

  // siunitx 패키지
  ['si', 'siunitx'], ['SI', 'siunitx'], ['num', 'siunitx'],
  ['unit', 'siunitx'], ['qty', 'siunitx'],

  // tikz / pgf
  ['draw', 'tikz'], ['node', 'tikz'], ['fill', 'tikz'],
  ['path', 'tikz'], ['coordinate', 'tikz'], ['clip', 'tikz'],
  ['foreach', 'tikz'], ['tikzstyle', 'tikz'],

  // xymatrix
  ['ar', 'xy'], ['xymatrix', 'xy'],

  // mathtools
  ['DeclarePairedDelimiter', 'mathtools'],
  ['DeclareMathOperator', 'mathtools'],
  ['coloneqq', 'mathtools'], ['eqqcolon', 'mathtools'],

  // amsthm
  ['qed', 'amsthm'], ['qedhere', 'amsthm'],

  // hyperref
  ['href', 'hyperref'], ['url', 'hyperref'],
]);

/**
 * 명령어가 표준 미구현 명령어인지 확인
 */
export function isStandardUnimplemented(cmdName: string): boolean {
  return STANDARD_UNIMPLEMENTED.has(cmdName);
}

/**
 * 명령어가 알려진 패키지 명령어인지 확인, 패키지명 반환
 */
export function getPackageName(cmdName: string): string | undefined {
  return KNOWN_PACKAGE_COMMANDS.get(cmdName);
}
