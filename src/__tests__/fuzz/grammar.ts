/**
 * LaTeX 수학 문법 생성 규칙 정의
 *
 * latex-commands.json에서 명령어를 로드하여 문법 규칙을 동적으로 구성.
 * KaTeX + MathJax 전체 명령어를 사용하므로 Fizzex 미지원 명령어도 포함됨.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';

// ──────── JSON 로드 ────────

interface CommandEntry {
  command: string;
  category: string;
  inFizzex: boolean;
  argCount: number;
}

interface CommandsData {
  commands: CommandEntry[];
}

function loadCommands(): CommandsData {
  const jsonPath = resolve(dirname(new URL(import.meta.url).pathname), 'latex-commands.json');
  return JSON.parse(readFileSync(jsonPath, 'utf-8'));
}

function byCategory(data: CommandsData, category: string): string[] {
  return data.commands
    .filter(c => c.category === category)
    .map(c => c.command);
}

// ──────── 명령어 로드 및 분류 ────────

const data = loadCommands();

const greekCmds = byCategory(data, 'greek');
const symbolCmds = byCategory(data, 'symbol');
const funcCmds = byCategory(data, 'function');
const opCmds = byCategory(data, 'operator');
const relCmds = byCategory(data, 'relation');
const arrowCmds = byCategory(data, 'arrow');
const negCmds = byCategory(data, 'negation');
const bigopCmds = byCategory(data, 'bigop');
const spacingCmds = byCategory(data, 'spacing').filter(c => /^\\[,;:!]$/.test(c) || /^\\(quad|qquad|enspace|thinspace|medspace|thickspace)$/.test(c));
const delimCmds = byCategory(data, 'delimiter');
const envCmds = byCategory(data, 'environment');

// 폰트 명령어: argCount=1인 것만 (적용 가능한 래핑 명령어)
const fontCmds = data.commands
  .filter(c => c.category === 'font' && c.argCount === 1)
  .map(c => c.command);

// 구조 명령어: argCount별 분류
const struct1Cmds = data.commands
  .filter(c => c.category === 'structure' && c.argCount === 1)
  .map(c => c.command);
const struct2Cmds = data.commands
  .filter(c => c.category === 'structure' && c.argCount === 2)
  .map(c => c.command);

// 악센트 명령어: argCount=1 (위에 놓는 장식)
const accentCmds = data.commands
  .filter(c => c.category === 'accent' && c.argCount === 1)
  .map(c => c.command);

// ──────── struct 프로덕션 생성 ────────

function buildStructProductions(): string[] {
  const prods: string[] = [];

  // 기본 구조 (항상 포함)
  prods.push('\\frac{expr}{expr}');
  prods.push('\\sqrt{expr}');
  prods.push('\\sqrt[number]{expr}');

  // argCount=2 구조: \cmd{expr}{expr}
  for (const cmd of struct2Cmds) {
    if (cmd === '\\frac') continue; // 이미 추가
    prods.push(`${cmd}{expr}{expr}`);
  }

  // argCount=1 구조: \cmd{expr}
  for (const cmd of struct1Cmds) {
    if (cmd === '\\sqrt') continue;
    prods.push(`${cmd}{expr}`);
  }

  // 악센트: \cmd{atom}
  for (const cmd of accentCmds) {
    prods.push(`${cmd}{atom}`);
  }

  return prods;
}

// ──────── delimited 프로덕션 생성 ────────

// 주요 구분자 쌍 (가장 일반적인 것들)
const DELIM_PAIRS: [string, string][] = [
  ['(', ')'],
  ['[', ']'],
  ['\\{', '\\}'],
  ['|', '|'],
  ['\\langle', '\\rangle'],
  ['\\lfloor', '\\rfloor'],
  ['\\lceil', '\\rceil'],
  ['\\lvert', '\\rvert'],
  ['\\lVert', '\\rVert'],
  // 편측 구분자
  ['(', '.'],
  ['.', ')'],
];

function buildDelimitedProductions(): string[] {
  return DELIM_PAIRS.map(([l, r]) => `\\left${l} expr \\right${r}`);
}

// ──────── bigop 프로덕션 생성 ────────

function buildBigopProductions(): string[] {
  const prods: string[] = [];
  for (const cmd of bigopCmds) {
    // 적분류: 상하한
    if (/int|oint/.test(cmd)) {
      prods.push(`${cmd}_{subscript}^{supscript}`);
      prods.push(`${cmd}_{subscript}`);
    }
    // lim류: 아래첨자만
    else if (/lim/.test(cmd)) {
      prods.push(`${cmd}_{subscript}`);
    }
    // 나머지: 상하한
    else {
      prods.push(`${cmd}_{subscript}^{supscript}`);
    }
  }
  return prods;
}

// ──────── environment 프로덕션 생성 ────────

function buildEnvironmentProductions(): string[] {
  const prods: string[] = [];

  for (const env of envCmds) {
    // \begin{name} 에서 이름 추출
    const match = env.match(/\\begin\{(.+)\}/);
    if (!match) continue;
    const name = match[1];

    // matrix 계열
    if (/matrix|Bmatrix|Vmatrix/.test(name)) {
      prods.push(`\\begin{${name}} matrix_content \\end{${name}}`);
    }
    // cases
    else if (name === 'cases' || name === 'rcases' || name === 'dcases') {
      prods.push(`\\begin{${name}} cases_content \\end{${name}}`);
    }
    // align/aligned/gather
    else if (/align|gather|split|multline/.test(name)) {
      prods.push(`\\begin{${name}} align_content \\end{${name}}`);
    }
    // array (특수 — column spec 필요)
    else if (name === 'array') {
      prods.push(`\\begin{array}{cc} matrix_content \\end{array}`);
    }
    // CD (commutative diagram)
    else if (name === 'CD') {
      prods.push(`\\begin{CD} expr @>>> expr \\\\\\\\ @VVV @AAA \\\\\\\\ expr @>>> expr \\end{CD}`);
    }
    // 나머지는 일반 align 콘텐츠
    else {
      prods.push(`\\begin{${name}} align_content \\end{${name}}`);
    }
  }

  return prods;
}

// ──────── font_wrap 프로덕션 생성 ────────

function buildFontWrapProductions(): string[] {
  const prods: string[] = [];
  for (const cmd of fontCmds) {
    if (cmd === '\\text' || cmd === '\\textrm' || cmd === '\\textbf' || cmd === '\\textit') {
      prods.push(`${cmd}{short_text}`);
    } else {
      prods.push(`${cmd}{atom}`);
    }
  }
  return prods;
}

// ──────── 문법 구성 ────────

export const GRAMMAR: Record<string, string[]> = {
  // 최상위
  formula: ['expr', 'expr op expr', 'expr rel expr', 'equation'],

  // 표현식
  expr: [
    'atom',
    'atom supscript',
    'atom subscript',
    'atom supscript subscript',
    'unary expr',
    'struct',
    'delimited',
    'func expr',
    'bigop expr',
    'font_wrap',
  ],

  // 원자
  atom: ['variable', 'number', 'greek', 'symbol'],

  // 변수
  variable: [
    'a', 'b', 'c', 'f', 'g', 'h', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'F', 'G', 'H', 'K', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  ],

  // 숫자
  number: ['0', '1', '2', '3', '4', '5', '10', '42', '100', '3.14'],

  // JSON 기반 터미널
  greek: greekCmds,
  symbol: symbolCmds,
  func: funcCmds,
  op: opCmds,
  rel: [...relCmds, ...arrowCmds],
  unary: ['-', ...negCmds.slice(0, 10)],  // 부정 연산자 일부를 단항으로
  spacing: spacingCmds,
  short_text: ['if', 'for', 'and', 'or', 'where', 'such that', 'otherwise'],

  // JSON 기반 구조적 규칙
  struct: buildStructProductions(),
  delimited: buildDelimitedProductions(),
  bigop: buildBigopProductions(),
  environment: buildEnvironmentProductions(),
  font_wrap: buildFontWrapProductions(),

  // 첨자
  supscript: ['^{expr}', '^atom', "^\\prime", '^{\\dagger}'],
  subscript: ['_{expr}', '_atom', '_{atom,atom}'],

  // 행렬/정렬 내용
  matrix_content: [
    'expr & expr \\\\\\\\ expr & expr',
    'expr & expr & expr \\\\\\\\ expr & expr & expr',
  ],
  cases_content: [
    'expr & \\text{if } expr \\\\\\\\ expr & \\text{otherwise}',
    'expr & expr \\\\\\\\ expr & expr \\\\\\\\ expr & expr',
  ],
  align_content: [
    'expr &= expr',
    'expr &= expr \\\\\\\\ expr &= expr',
  ],

  // 등식
  equation: [
    'expr = expr',
    'expr rel expr',
    'expr = expr = expr',
  ],
};

/** 터미널 심볼 (더 이상 확장하지 않는 것들) */
export const TERMINALS = new Set([
  'variable', 'number', 'greek', 'symbol', 'op', 'rel', 'unary',
  'func', 'spacing', 'short_text',
]);

/** 재귀를 야기하는 심볼 (깊이 제한 필요) */
export const RECURSIVE_RULES = new Set([
  'expr', 'struct', 'delimited', 'bigop', 'environment',
  'supscript', 'subscript', 'formula', 'equation', 'font_wrap',
]);

/** Fizzex 지원 여부 조회 (커버리지 태깅용) */
export function isInFizzex(command: string): boolean {
  const entry = data.commands.find(c => c.command === command);
  return entry?.inFizzex ?? false;
}

/** 전체 명령어 목록 (커버리지 분석용) */
export function getAllCommands(): CommandEntry[] {
  return data.commands;
}
