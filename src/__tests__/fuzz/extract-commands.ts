/**
 * KaTeX / MathJax / Fizzex 명령어 추출 및 통합
 *
 * 각 소스에서 LaTeX 명령어를 추출하고,
 * 카테고리 분류 + Fizzex 지원 여부 태깅하여 latex-commands.json으로 저장.
 *
 * 카테고리 판별 전략:
 * 1) KaTeX symbols.ts의 group 파라미터 (rel, bin, op, mathord 등)
 * 2) KaTeX functions/ 파일명 (accent.ts, arrow.ts 등)
 * 3) MathJax Map 이름 (mathchar0mi, mathchar0mo 등)
 * 4) 명령어 이름 기반 휴리스틱 폴백
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname, join, basename } from 'path';

const BASE_DIR = dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = resolve(BASE_DIR, '../../..');

// ──────── 타입 ────────

interface RawCommand {
  command: string;         // \\alpha 형태
  sourceHints: string[];   // 카테고리 판별 힌트: ['katex:accent.ts', 'mathjax:mathchar0mi']
}

interface CommandEntry {
  command: string;
  category: string;
  inKatex: boolean;
  inMathjax: boolean;
  inFizzex: boolean;
  argCount: number;
}

// ──────── 카테고리 매핑 ────────

/** KaTeX symbols.ts group → 카테고리 */
const KATEX_GROUP_MAP: Record<string, string> = {
  'rel': 'relation',
  'bin': 'operator',
  'op-token': 'bigop',
  'mathord': 'symbol',
  'textord': 'symbol',
  'open': 'delimiter',
  'close': 'delimiter',
  'inner': 'symbol',
  'punct': 'symbol',
  'spacing': 'spacing',
  'accent-token': 'accent',
};

/** KaTeX functions/ 파일명 → 카테고리 */
const KATEX_FILE_MAP: Record<string, string> = {
  'accent.ts': 'accent',
  'accentunder.ts': 'accent',
  'arrow.ts': 'accent',  // xArrow류
  'char.ts': 'symbol',
  'color.ts': 'structure',
  'delimsizing.ts': 'delimiter',
  'enclose.ts': 'structure',
  'environment.ts': 'environment',
  'font.ts': 'font',
  'genfrac.ts': 'structure',
  'hbox.ts': 'structure',
  'horizBrace.ts': 'accent',
  'href.ts': 'structure',
  'html.ts': 'structure',
  'kern.ts': 'spacing',
  'lap.ts': 'spacing',
  'math.ts': 'symbol',
  'mathchoice.ts': 'structure',
  'mclass.ts': 'structure',
  'op.ts': 'bigop',
  'operatorname.ts': 'function',
  'ordgroup.ts': 'structure',
  'overline.ts': 'accent',
  'phantom.ts': 'structure',
  'pmb.ts': 'font',
  'raisebox.ts': 'structure',
  'rule.ts': 'structure',
  'sizing.ts': 'font',
  'smash.ts': 'structure',
  'sqrt.ts': 'structure',
  'styling.ts': 'font',
  'supsub.ts': 'structure',
  'symbolsOp.ts': 'bigop',
  'symbolsOrd.ts': 'symbol',
  'symbolsSpacing.ts': 'spacing',
  'tag.ts': 'structure',
  'text.ts': 'font',
  'underline.ts': 'accent',
  'vcenter.ts': 'structure',
  'verb.ts': 'structure',
};

/** MathJax Map 이름 → 카테고리 */
const MATHJAX_MAP_NAME_CATEGORY: Record<string, string> = {
  'mathchar0mi': 'symbol',      // math identifiers (greek, etc.)
  'mathchar0mo': 'operator',    // math operators
  'mathchar7': 'symbol',        // calligraphic
  'delimiter': 'delimiter',
  'macros': 'structure',        // complex macros — 세부 분류 필요
  'environment': 'environment',
  'not_remap': 'negation',
  'AMSmath-mathchar0mo': 'operator',
  'AMSmath-macros': 'structure',
  'AMSmath-environment': 'environment',
  'AMSmath-delimiter': 'delimiter',
  'AMSsymbols-mathchar0mi': 'symbol',
  'AMSsymbols-mathchar0mo': 'relation', // AMS 심볼의 mo는 주로 관계 연산자
  'AMSsymbols-delimiter': 'delimiter',
  'AMSsymbols-macros': 'structure',
};

/** 이름 기반 카테고리 휴리스틱 (최종 폴백) */
const NAME_HEURISTICS: [RegExp, string][] = [
  // greek letters
  [/^\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|var(?:epsilon|theta|pi|rho|sigma|phi|kappa)|digamma)$/, 'greek'],
  // functions
  [/^\\(sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|arcctg|arctg|sinh|cosh|tanh|coth|cosec|cotg|ctg|cth|ch|sh|th|log|ln|exp|lim|limsup|liminf|max|min|sup|inf|det|gcd|dim|ker|hom|arg|deg|Pr|lg|sgn|mod|pmod|bmod|pod)$/, 'function'],
  // big operators
  [/^\\(sum|prod|coprod|int|iint|iiint|iiiint|oint|oiint|oiiint|bigcup|bigcap|bigsqcup|bigvee|bigwedge|bigodot|bigoplus|bigotimes|biguplus|intop|smallint|idotsint)$/, 'bigop'],
  // arrows (including wide/extensible)
  [/^\\.*[Aa]rrow/, 'arrow'],
  [/^\\(to|gets|implies|iff|impliedby|mapsto|longmapsto|hookrightarrow|hookleftarrow|nearrow|searrow|swarrow|nwarrow|rightsquigarrow|leftrightsquigarrow|upharpoonleft|upharpoonright|downharpoonleft|downharpoonright|upuparrows|downdownarrows|rightrightarrows|leftleftarrows|leftrightarrows|rightleftarrows|twoheadrightarrow|twoheadleftarrow|dashrightarrow|dashleftarrow|circlearrowleft|circlearrowright|curvearrowleft|curvearrowright|multimap|looparrowleft|looparrowright)$/, 'arrow'],
  // accents
  [/^\\(hat|bar|vec|dot|ddot|dddot|ddddot|tilde|breve|check|acute|grave|mathring|wide(?:hat|tilde|check)|over(?:rightarrow|leftarrow|leftrightarrow|group|brace|line|linesegment|leftharpoon|rightharpoon)|under(?:rightarrow|leftarrow|leftrightarrow|group|brace|line|linesegment))$/, 'accent'],
  // delimiters
  [/^\\(l(?:angle|floor|ceil|brace|vert|Vert|group|moustache)|r(?:angle|floor|ceil|brace|vert|Vert|group|moustache)|big[lrmg]?|Big[lrmg]?|bigg[lrmg]?|Bigg[lrmg]?|left|right|middle)$/, 'delimiter'],
  // font commands
  [/^\\(math(?:rm|bf|it|bb|cal|frak|scr|sf|tt|normal|up|bfit|bffrak|bfscr|bfsf|sfit|bfsfit|bfcal|bfsfup|sfup)|text(?:rm|bf|it|sf|tt|normal|up)|sym(?:rm|bf|it|bb|frak|scr|sf|tt|cal|bfup|bfit|bffrak|bfscr|bfsf|bfsfit|bfcal|bfsfup|sfup|normal|up)|boldsymbol|bm|bold|pmb|Bbb|rm|it|bf|sf|tt|cal|frak|scr|mit|oldstyle|emph)$/, 'font'],
  // sizing commands
  [/^\\(tiny|Tiny|scriptsize|small|normalsize|large|Large|LARGE|huge|Huge)$/, 'font'],
  // style commands
  [/^\\(displaystyle|textstyle|scriptstyle|scriptscriptstyle)$/, 'font'],
  // spacing (\ = backslash-space)
  [/^\\( |[,;:!]|quad|qquad|enspace|thinspace|medspace|thickspace|negthinspace|negmedspace|negthickspace|hspace|kern|mkern|mskip|hskip|hfil|hfill|nobreakspace|space|allowbreak)$/, 'spacing'],
  // structure (fractions, roots, etc.)
  [/^\\(frac|dfrac|tfrac|cfrac|binom|dbinom|tbinom|sqrt|overset|underset|stackrel|boxed|cancel|bcancel|xcancel|substack|operatorname|genfrac|phantom|vphantom|hphantom|smash|not|text|mbox|hbox|tag|notag|label|ref|eqref|above|atop|choose|over|color|textcolor|colorbox|fcolorbox|fbox|rule|href|url|raisebox|vcenter|verb|def|edef|gdef|xdef|let|futurelet|global|long|relax|includegraphics|enclose|html|htmlClass|htmlData|htmlId|htmlStyle)$/, 'structure'],
  // negation
  [/^\\n(?:less|gtr|leq|geq|eq|subset|supset|mid|parallel|prec|succ|cong|sim|vdash|vDash|Vdash|VDash|triangleleft|triangleright|trianglelefteq|trianglerighteq|shortmid|shortparallel|preceq|succeq|leftrightarrow|Leftarrow|Rightarrow|Leftrightarrow)$/, 'negation'],
  // relations — broad patterns
  [/^\\(leq|geq|le|ge|neq|ne|equiv|approx|sim|simeq|cong|propto|ll|gg|subset|supset|subseteq|supseteq|sqsubset|sqsupset|sqsubseteq|sqsupseteq|in|notin|ni|owns|mid|parallel|perp|models|vdash|dashv|Vdash|vDash|Vvdash|prec|succ|preceq|succeq|doteq|Doteq|circeq|eqcirc|triangleq|bumpeq|Bumpeq|between|bowtie|Join|smile|frown|asymp|pitchfork)$/, 'relation'],
  [/^\\(lesssim|gtrsim|lessapprox|gtrapprox|lessgtr|gtrless|lesseqgtr|gtreqless|lesseqqgtr|gtreqqless|eqslantless|eqslantgtr|curlyeqprec|curlyeqsucc|approxeq|backsim|backsimeq|Subset|Supset|sqsubset|sqsupset|leqq|geqq|leqslant|geqslant|lll|ggg|lvertneqq|gvertneqq|subsetneq|supsetneq|subsetneqq|supsetneqq|succnapprox|precnapprox|precneqq|succneqq|lneq|gneq|lneqq|gneqq|lnapprox|gnapprox|lnsim|gnsim|precnsim|succnsim|smallsmile|smallfrown|risingdotseq|fallingdotseq|doteqdot|eqsim|coloneq|eqcolon|Coloneq|Eqcolon)$/, 'relation'],
  // operators (binary)
  [/^\\(plus|minus|pm|mp|times|div|cdot|ast|star|circ|bullet|diamond|cap|cup|sqcap|sqcup|vee|lor|wedge|land|oplus|ominus|otimes|oslash|odot|setminus|smallsetminus|wr|amalg|dagger|ddagger|triangleleft|triangleright|bigtriangleup|bigtriangledown|ltimes|rtimes|leftthreetimes|rightthreetimes|circleddash|circledast|circledcirc|dotplus|doublebarwedge|divideontimes|centerdot|intercal|barwedge|veebar|curlywedge|curlyvee|boxminus|boxplus|boxtimes|boxdot|Cap|Cup|doublecap|doublecup|lhd|rhd|unlhd|unrhd|backslash)$/, 'operator'],
  // common symbols
  [/^\\(infty|emptyset|varnothing|forall|exists|nexists|partial|nabla|ell|hbar|imath|jmath|wp|Re|Im|aleph|beth|gimel|daleth|complement|Finv|Game|mho|eth|Bbbk|top|bot|angle|measuredangle|sphericalangle|triangle|triangledown|square|lozenge|blacksquare|blacklozenge|blacktriangle|blacktriangledown|blacktriangleleft|blacktriangleright|bigstar|bigcirc|clubsuit|diamondsuit|heartsuit|spadesuit|flat|natural|sharp|checkmark|maltese|circledR|circledS|yen|pound|euro|cent|degree|prime|backprime|dag|ddag|dots|cdots|ldots|ddots|vdots|dotsb|dotsc|dotsi|dotsm|dotso|colon|therefore|because|QED|Box|Diamond|S|P|AA|diagdown|diagup|ulcorner|urcorner|llcorner|lrcorner|backepsilon|restriction|upharpoonright|upharpoonleft)$/, 'symbol'],
];

function categorizeByName(cmd: string): string | null {
  for (const [pattern, category] of NAME_HEURISTICS) {
    if (pattern.test(cmd)) return category;
  }
  return null;
}

// ──────── argCount 추론 ────────

const ARG_COUNT_MAP: Record<string, number> = {
  frac: 2, dfrac: 2, tfrac: 2, cfrac: 2, genfrac: 6,
  binom: 2, dbinom: 2, tbinom: 2,
  sqrt: 1, overset: 2, underset: 2, stackrel: 2,
  overline: 1, underline: 1, overbrace: 1, underbrace: 1,
  hat: 1, bar: 1, vec: 1, dot: 1, ddot: 1, dddot: 1, ddddot: 1,
  tilde: 1, breve: 1, check: 1, acute: 1, grave: 1, mathring: 1,
  widehat: 1, widetilde: 1, widecheck: 1,
  overrightarrow: 1, overleftarrow: 1, overleftrightarrow: 1,
  underleftarrow: 1, underrightarrow: 1, underleftrightarrow: 1,
  boxed: 1, cancel: 1, bcancel: 1, xcancel: 1,
  xleftarrow: 1, xrightarrow: 1,
  mathrm: 1, mathbf: 1, mathit: 1, mathbb: 1, mathcal: 1,
  mathfrak: 1, mathscr: 1, mathsf: 1, mathtt: 1, mathnormal: 1,
  text: 1, textrm: 1, textbf: 1, textit: 1, textsf: 1, texttt: 1,
  boldsymbol: 1, bm: 1, bold: 1, pmb: 1,
  operatorname: 1, phantom: 1, vphantom: 1, hphantom: 1,
  not: 1, substack: 1, smash: 1,
  color: 2, textcolor: 2, colorbox: 2, fcolorbox: 3,
  hspace: 1, kern: 1, mkern: 1, mskip: 1, hskip: 1,
  href: 2, url: 1, fbox: 1, rule: 2, raisebox: 2,
  tag: 1, label: 1, ref: 1, eqref: 1,
};

function getArgCount(cmd: string): number {
  const name = cmd.startsWith('\\') ? cmd.slice(1) : cmd;
  return ARG_COUNT_MAP[name] ?? 0;
}

// ──────── KaTeX 추출 ────────

function extractKatexCommands(): Map<string, Set<string>> {
  /** command → Set<sourceHint> */
  const commands = new Map<string, Set<string>>();

  function addCmd(cmd: string, hint: string) {
    if (!cmd || cmd === '\\') return;
    if (!commands.has(cmd)) commands.set(cmd, new Set());
    commands.get(cmd)!.add(hint);
  }

  const katexSrc = join(PROJECT_ROOT, 'node_modules/katex/src');

  // 1. defineFunction의 names 배열 + 파일명 힌트
  const funcDir = join(katexSrc, 'functions');
  const funcFiles = readdirSync(funcDir).filter(f => f.endsWith('.ts') && !f.startsWith('utils'));

  for (const file of funcFiles) {
    const content = readFileSync(join(funcDir, file), 'utf-8');
    const hint = `katex:${file}`;

    // names: [...] 추출
    const namesRegex = /names:\s*\[([\s\S]*?)\]/g;
    let namesMatch;
    while ((namesMatch = namesRegex.exec(content)) !== null) {
      const block = namesMatch[1];
      // "\\cmdname" — 파일 내 이중 백슬래시를 매칭
      const cmdRegex = /["']\\\\([a-zA-Z*]+)["']/g;
      let cmdMatch;
      while ((cmdMatch = cmdRegex.exec(block)) !== null) {
        addCmd('\\' + cmdMatch[1], hint);
      }
      // 단일 문자 명령어: "\\'" 등
      const singleRegex = /["']\\\\([^a-zA-Z\s\\])["']/g;
      while ((cmdMatch = singleRegex.exec(block)) !== null) {
        addCmd('\\' + cmdMatch[1], hint);
      }
    }
  }

  // 2. defineSymbol 호출에서 group + name 추출
  const symbolsContent = readFileSync(join(katexSrc, 'symbols.ts'), 'utf-8');
  // defineSymbol(mode, font, group, replace, "\\name", ...)
  // group은 변수명으로 참조됨 (rel, bin, op 등)
  // 파일 내 이중 백슬래시: "\\\\equiv" 형태
  const defSymRegex = /defineSymbol\(\s*\w+\s*,\s*\w+\s*,\s*(\w+)\s*,\s*(?:"[^"]*"|'[^']*'|null|undefined)\s*,\s*"\\\\([a-zA-Z]+)"/g;
  let symMatch;
  while ((symMatch = defSymRegex.exec(symbolsContent)) !== null) {
    const group = symMatch[1];
    const name = '\\' + symMatch[2];
    addCmd(name, `katex:symbols:${group}`);
  }

  return commands;
}

// ──────── MathJax 추출 ────────

function extractMathjaxCommands(): Map<string, Set<string>> {
  const commands = new Map<string, Set<string>>();

  function addCmd(cmd: string, hint: string) {
    if (!cmd || cmd === '\\') return;
    if (!commands.has(cmd)) commands.set(cmd, new Set());
    commands.get(cmd)!.add(hint);
  }

  const mjTexDir = join(PROJECT_ROOT, 'node_modules/mathjax-full/ts/input/tex');

  // Mapping 파일 재귀 수집
  const mappingFiles: string[] = [];
  function findMappings(dir: string) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          findMappings(join(dir, entry.name));
        } else if (entry.name.endsWith('Mappings.ts')) {
          mappingFiles.push(join(dir, entry.name));
        }
      }
    } catch { /* 무시 */ }
  }
  findMappings(mjTexDir);

  for (const file of mappingFiles) {
    const content = readFileSync(file, 'utf-8');

    // Map 생성 구문 파싱: new sm.XxxMap('map-name', ..., { key: value, ... })
    // 또는: new sm.XxxMap('map-name', { key: value, ... }, handler)
    // 맵 이름과 객체 리터럴 키를 추출

    // 멀티라인 패턴: new sm.XXXMap('mapName', ... { ... })
    const mapRegex = /new\s+sm\.(\w+Map)\s*\(\s*'([^']+)'/g;
    let mapMatch;

    while ((mapMatch = mapRegex.exec(content)) !== null) {
      const mapType = mapMatch[1];
      const mapName = mapMatch[2];
      const startPos = mapMatch.index;

      // 이 Map 생성자 내의 객체 리터럴 찾기
      // 중괄호 매칭으로 추출
      let braceStart = content.indexOf('{', startPos + mapMatch[0].length);
      if (braceStart === -1) continue;

      let depth = 1;
      let pos = braceStart + 1;
      while (pos < content.length && depth > 0) {
        if (content[pos] === '{') depth++;
        else if (content[pos] === '}') depth--;
        pos++;
      }
      if (depth !== 0) continue;

      const objContent = content.substring(braceStart + 1, pos - 1);
      const hint = `mathjax:${mapName}`;

      // 키 추출: 일반 식별자
      const keyRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_*]*)\s*:/gm;
      let keyMatch;
      while ((keyMatch = keyRegex.exec(objContent)) !== null) {
        const key = keyMatch[1];
        // handler 이름 필터 (대문자로 시작하는 PascalCase는 의심)
        if (/^(Open|Close|Tilde|Superscript|Subscript|Space|Prime|Comment|Entry|Hash|ControlSequence|Other|Number|Nonscript|MoveRoot|MoveLeft|HandleRef|HandleNoTag|HandleLabel|HandleOperatorName|HandleShift)$/.test(key)) continue;

        if (mapType === 'EnvironmentMap') {
          addCmd('\\begin{' + key + '}', hint);
        } else {
          addCmd('\\' + key, hint);
        }
      }

      // 따옴표 키: 특수 문자
      const quotedRegex = /^\s*'([^']+)'\s*:/gm;
      while ((keyMatch = quotedRegex.exec(objContent)) !== null) {
        const key = keyMatch[1];
        // 특수 문자 / 이스케이프 시퀀스 건너뛰기
        if (/^[{}\^_~' %&#\t\r\n]$/.test(key)) continue;
        if (/^\\[nrt]$/.test(key)) continue;                   // \n, \r, \t
        if (/^\\u[0-9A-Fa-f]{4}$/.test(key)) continue;        // \u00A0 등
        if (key === '\u00A0' || key === '\u2019') continue;
        // 이미 백슬래시로 시작하면 중복 추가 방지
        const cmd = key.startsWith('\\') ? key : '\\' + key;
        if (mapType === 'EnvironmentMap') {
          addCmd('\\begin{' + key + '}', hint);
        } else {
          addCmd(cmd, hint);
        }
      }
    }
  }

  return commands;
}

// ──────── Fizzex 추출 ────────

function extractFizzexCommands(): Set<string> {
  const commands = new Set<string>();
  const commandsDir = join(PROJECT_ROOT, 'src/latex/commands');

  const files = readdirSync(commandsDir).filter(f =>
    f.endsWith('.ts') && !f.includes('types') && !f.includes('index')
  );

  for (const file of files) {
    const content = readFileSync(join(commandsDir, file), 'utf-8');
    const entryPattern = /\[\s*'([^']+)'\s*,/g;
    let match;
    while ((match = entryPattern.exec(content)) !== null) {
      commands.add('\\' + match[1]);
    }
  }

  // 환경 지원
  const parserContent = readFileSync(join(PROJECT_ROOT, 'src/latex/latex-parser.ts'), 'utf-8');
  const matrixEnvMatch = parserContent.match(/const\s+matrixEnvs\s*=\s*\[([^\]]+)\]/);
  if (matrixEnvMatch) {
    const envs = matrixEnvMatch[1].match(/'([^']+)'/g) || [];
    for (const env of envs) commands.add('\\begin{' + env.replace(/'/g, '') + '}');
  }
  const alignEnvMatch = parserContent.match(/const\s+alignEnvs\s*=\s*\[([^\]]+)\]/);
  if (alignEnvMatch) {
    const envs = alignEnvMatch[1].match(/'([^']+)'/g) || [];
    for (const env of envs) commands.add('\\begin{' + env.replace(/'/g, '') + '}');
  }
  if (parserContent.includes("envName === 'cases'")) {
    commands.add('\\begin{cases}');
  }

  return commands;
}

// ──────── 카테고리 결정 ────────

function resolveCategory(cmd: string, hints: string[]): string {
  // 1) 이름 기반 휴리스틱 (가장 정확)
  const nameCategory = categorizeByName(cmd);
  if (nameCategory) return nameCategory;

  // 2) KaTeX symbols.ts group 기반
  for (const hint of hints) {
    if (hint.startsWith('katex:symbols:')) {
      const group = hint.split(':')[2];
      if (KATEX_GROUP_MAP[group]) return KATEX_GROUP_MAP[group];
    }
  }

  // 3) KaTeX 파일명 기반
  for (const hint of hints) {
    if (hint.startsWith('katex:') && !hint.includes('symbols')) {
      const file = hint.split(':')[1];
      if (KATEX_FILE_MAP[file]) return KATEX_FILE_MAP[file];
    }
  }

  // 4) MathJax Map 이름 기반
  for (const hint of hints) {
    if (hint.startsWith('mathjax:')) {
      const mapName = hint.split(':')[1];
      if (MATHJAX_MAP_NAME_CATEGORY[mapName]) return MATHJAX_MAP_NAME_CATEGORY[mapName];
    }
  }

  return 'unknown';
}

// ──────── 필터링 ────────

function isValidCommand(cmd: string): boolean {
  // @-접두사 내부 명령어 제외
  if (cmd.includes('@')) return false;
  // 빈 명령어 / 줄바꿈(\\) 제외
  if (cmd === '\\' || cmd === '' || cmd === '\\\\') return false;
  // 단일 특수문자 중 수학 모드에서 무의미한 것 제외
  if (/^\\[(){}\[\]]$/.test(cmd)) return false;
  // begin/end 자체는 제외 (환경은 \begin{name}으로 처리)
  if (cmd === '\\begin' || cmd === '\\end') return false;
  // 텍스트 모드 전용 악센트 제외 (\', \`, \^, \~, \=, \., \" 등)
  if (/^\\[`'^~=."crvuHdt]$/.test(cmd)) return false;
  // MathJax 특수 문자 아티팩트 제외
  if (/^\\[nrt]$/.test(cmd)) return false;
  if (/^\\u[0-9A-Fa-f]{4}$/.test(cmd)) return false;
  // MathJax handler 이름이 명령어로 잘못 추출된 경우
  if (/^\\(SetStyle|SetFont|MathFont|HBox|SetSize|NamedFn|NamedOp|Macro|Array|Matrix|Braket|AMS|AMSmath|AMSsymbols|Genfrac|xArrow|Accent|Lap|LeftRight|Middle|Require|Not|Unicode|Label|FenCode|arrow)$/.test(cmd)) return false;

  return true;
}

// ──────── 메인 ────────

function main() {
  console.log('명령어 추출 시작...\n');

  const katexMap = extractKatexCommands();
  const mathjaxMap = extractMathjaxCommands();
  const fizzexSet = extractFizzexCommands();

  console.log(`KaTeX:   ${katexMap.size}개 명령어`);
  console.log(`MathJax: ${mathjaxMap.size}개 명령어`);
  console.log(`Fizzex:  ${fizzexSet.size}개 명령어`);

  // 합집합 + 힌트 병합
  const merged = new Map<string, string[]>();

  for (const [cmd, hints] of katexMap) {
    if (!isValidCommand(cmd)) continue;
    merged.set(cmd, [...(merged.get(cmd) || []), ...hints]);
  }
  for (const [cmd, hints] of mathjaxMap) {
    if (!isValidCommand(cmd)) continue;
    merged.set(cmd, [...(merged.get(cmd) || []), ...hints]);
  }
  // Fizzex 전용 명령어도 추가
  for (const cmd of fizzexSet) {
    if (!isValidCommand(cmd)) continue;
    if (!merged.has(cmd)) merged.set(cmd, []);
  }

  // CommandEntry 배열 생성
  const commands: CommandEntry[] = [];
  for (const [cmd, hints] of merged) {
    const isEnv = cmd.startsWith('\\begin{');
    const category = isEnv ? 'environment' : resolveCategory(cmd, hints);
    commands.push({
      command: cmd,
      category,
      inKatex: katexMap.has(cmd),
      inMathjax: mathjaxMap.has(cmd),
      inFizzex: fizzexSet.has(cmd),
      argCount: isEnv ? 0 : getArgCount(cmd),
    });
  }

  // 통계
  const inFizzex = commands.filter(c => c.inFizzex).length;
  const missingInFizzex = commands.filter(c => !c.inFizzex).length;

  const result = {
    extracted_date: new Date().toISOString().split('T')[0],
    sources: {
      katex: { version: '0.16.43', count: katexMap.size },
      mathjax: { version: '3.2.2', count: mathjaxMap.size },
    },
    coverage: {
      total: commands.length,
      in_fizzex: inFizzex,
      missing_in_fizzex: missingInFizzex,
    },
    commands: commands.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.command.localeCompare(b.command);
    }),
  };

  const outPath = resolve(BASE_DIR, 'latex-commands.json');
  writeFileSync(outPath, JSON.stringify(result, null, 2));

  // 요약
  console.log(`\n=== 통합 명령어 목록 ===`);
  console.log(`총 명령어: ${commands.length}`);
  console.log(`Fizzex 지원: ${inFizzex} (${((inFizzex / commands.length) * 100).toFixed(1)}%)`);
  console.log(`미지원: ${missingInFizzex} (${((missingInFizzex / commands.length) * 100).toFixed(1)}%)`);

  const byCat: Record<string, { total: number; fizzex: number }> = {};
  for (const cmd of commands) {
    if (!byCat[cmd.category]) byCat[cmd.category] = { total: 0, fizzex: 0 };
    byCat[cmd.category].total++;
    if (cmd.inFizzex) byCat[cmd.category].fizzex++;
  }
  console.log('\n카테고리별:');
  for (const [cat, stats] of Object.entries(byCat).sort(([, a], [, b]) => b.total - a.total)) {
    const pct = stats.total > 0 ? ((stats.fizzex / stats.total) * 100).toFixed(0) : '0';
    console.log(`  ${cat.padEnd(14)} ${String(stats.total).padStart(4)}개 (Fizzex: ${String(stats.fizzex).padStart(3)}, ${pct}%)`);
  }

  console.log(`\n저장: ${outPath}`);
}

main();
