/**
 * MathJax 소스에서 LaTeX 수식 문자열을 추출하는 스크립트
 *
 * 추출 전략:
 *   1. MathJax v4 빌드 JS 파일에서 LaTeX 패턴이 포함된 문자열 리터럴 추출
 *   2. mathjax-full v3.2.2 TS 소스에서 LaTeX 문자열 추출
 *   3. BaseMappings/AmsMappings 등 매핑 파일에서 TeX 커맨드 이름을 추출하여
 *      기본 사용 예시 자동 생성
 */

import * as fs from "fs";
import * as path from "path";

// ── 경로 설정 ──────────────────────────────────────────────
const MATHJAX_V4_DIR = "/Users/mintae/Documents/Develop/reference/MathJax";
const MATHJAX_V3_TEX_DIR =
  "/Users/mintae/Documents/Develop/side-projects/fizzex/website/node_modules/.pnpm/mathjax-full@3.2.2/node_modules/mathjax-full/ts/input/tex";
const OUTPUT_PATH =
  "/Users/mintae/Documents/Develop/side-projects/fizzex/src/__tests__/corpus/mathjax-formulas.json";

// ── 타입 ──────────────────────────────────────────────────
interface Formula {
  id: string;
  latex: string;
  source_file: string;
  category: string;
}

// ── 유틸리티 ──────────────────────────────────────────────
/** 디렉토리를 재귀 탐색하여 특정 확장자 파일 경로 수집 */
function collectFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

/** 상대 경로 반환 (source_file 필드용) */
function relPath(filePath: string): string {
  if (filePath.startsWith(MATHJAX_V4_DIR)) {
    return "MathJax-v4/" + path.relative(MATHJAX_V4_DIR, filePath);
  }
  if (filePath.includes("mathjax-full@3.2.2")) {
    const idx = filePath.indexOf("ts/input/tex");
    return "mathjax-full-v3.2.2/" + (idx >= 0 ? filePath.slice(idx) : path.basename(filePath));
  }
  return path.basename(filePath);
}

// ── 전략 1: JS/TS 파일에서 LaTeX 패턴 문자열 리터럴 추출 ────────
/**
 * 파일 내용에서 LaTeX 커맨드가 포함된 문자열 리터럴을 추출한다.
 * 백슬래시+영문자 조합(예: \frac, \alpha)이 포함된 문자열만 대상.
 */
function extractLatexStringsFromFile(
  content: string,
  filePath: string,
): { latex: string; source: string }[] {
  const results: { latex: string; source: string }[] = [];
  const relFile = relPath(filePath);

  // 작은따옴표/큰따옴표/백틱 문자열 리터럴에서 추출
  // 백슬래시+영문자 2글자 이상 패턴이 있는 문자열만
  const stringPatterns = [
    // 큰따옴표 문자열: "..."
    /"((?:[^"\\]|\\.)*)"/g,
    // 작은따옴표 문자열: '...'
    /'((?:[^'\\]|\\.)*)'/g,
    // 백틱 문자열 (한 줄): `...`
    /`((?:[^`\\]|\\.)*)`/g,
  ];

  for (const pattern of stringPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const str = match[1];
      // LaTeX 커맨드 패턴 확인: 백슬래시+영문자 2글자 이상
      if (/\\[a-zA-Z]{2,}/.test(str)) {
        // 기본 필터링
        const cleaned = str
          .replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'");

        results.push({ latex: cleaned, source: relFile });
      }
    }
  }

  return results;
}

// ── 전략 2: 매핑 파일에서 TeX 커맨드 이름 추출 + 사용 예시 생성 ──
/**
 * BaseMappings.ts, AmsMappings.ts 등에서 커맨드 이름을 추출하고
 * 각 커맨드에 대한 기본 사용 예시를 자동 생성한다.
 */

// 커맨드 카테고리별 사용 예시 템플릿
const COMMAND_TEMPLATES: Record<string, (cmd: string) => string> = {
  // 그리스 문자 (인자 불필요)
  greek_lower: (cmd) => `\\${cmd}`,
  greek_upper: (cmd) => `\\${cmd}`,

  // 이항 연산자 (인자 불필요, 양옆에 피연산자)
  binop: (cmd) => `a \\${cmd} b`,

  // 관계 연산자
  relation: (cmd) => `x \\${cmd} y`,

  // 화살표
  arrow: (cmd) => `A \\${cmd} B`,

  // 점
  dots: (cmd) => `a_1, a_2, \\${cmd}, a_n`,

  // 기호 (인자 불필요)
  symbol: (cmd) => `\\${cmd}`,

  // Named 함수
  named_fn: (cmd) => `\\${cmd}(x)`,

  // Named 연산자 (limits 가능)
  named_op: (cmd) => `\\${cmd}_{n \\to \\infty} a_n`,

  // 악센트 (인자 1개)
  accent: (cmd) => `\\${cmd}{a}`,

  // 폰트 (인자 1개)
  font: (cmd) => `\\${cmd}{ABC}`,

  // 크기 조절
  size: (cmd) => `{\\${cmd} x + y}`,

  // 분수/루트
  frac_like: (cmd) => `\\${cmd}{a}{b}`,
  sqrt_like: (cmd) => `\\${cmd}{x^2 + 1}`,

  // 위/아래
  overunder: (cmd) => `\\${cmd}{abc}`,

  // 구분자
  delimiter: (cmd) => `\\left\\${cmd} x \\right.`,

  // 행렬/배열
  matrix: (cmd) => `\\begin{${cmd}} a & b \\\\ c & d \\end{${cmd}}`,

  // 공백
  spacer: (cmd) => `a\\${cmd}b`,

  // 큰 구분자
  makebig: (cmd) => `\\${cmd}( \\${cmd})`,

  // TeXAtom
  texatom: (cmd) => `\\${cmd}{x+y}`,

  // Macro (매크로 정의 자체)
  macro_def: (cmd) => `\\${cmd}`,

  // 기본 (인자 없음)
  default: (cmd) => `\\${cmd}`,
};

// 커맨드 이름 → 카테고리 분류 규칙
const GREEK_LOWER = new Set([
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
  "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi", "rho",
  "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega",
  "varepsilon", "vartheta", "varpi", "varrho", "varsigma", "varphi",
]);

const GREEK_UPPER = new Set([
  "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma",
  "Upsilon", "Phi", "Psi", "Omega",
]);

const NAMED_FN = new Set([
  "arcsin", "arccos", "arctan", "arg", "cos", "cosh", "cot", "coth",
  "csc", "deg", "dim", "exp", "hom", "ker", "lg", "ln", "log", "sec",
  "sin", "sinh", "tan", "tanh",
]);

const NAMED_OP = new Set([
  "det", "gcd", "inf", "lim", "liminf", "limsup", "max", "min", "Pr", "sup",
]);

const ACCENTS = new Set([
  "acute", "grave", "ddot", "tilde", "bar", "breve", "check", "hat",
  "vec", "dot", "widetilde", "widehat",
]);

const FONTS = new Set([
  "mathrm", "mathup", "mathnormal", "mathbf", "mathbfup", "mathit",
  "mathbfit", "mathbb", "Bbb", "mathfrak", "mathbffrak", "mathscr",
  "mathbfscr", "mathsf", "mathsfup", "mathbfsf", "mathbfsfup",
  "mathsfit", "mathbfsfit", "mathtt", "mathcal", "mathbfcal",
  "textrm", "textup", "textnormal", "textit", "textbf", "textsf", "texttt",
  "rm", "mit", "oldstyle", "cal", "it", "bf", "bbFont", "scr", "frak", "sf", "tt",
]);

const SIZES = new Set([
  "tiny", "Tiny", "scriptsize", "small", "normalsize",
  "large", "Large", "LARGE", "huge", "Huge",
]);

const OVERUNDER = new Set([
  "overline", "underline", "overbrace", "underbrace", "overparen", "underparen",
  "overrightarrow", "underrightarrow", "overleftarrow", "underleftarrow",
  "overleftrightarrow", "underleftrightarrow",
  "overset", "underset", "overunderset",
]);

const MAKEBIG = new Set([
  "big", "Big", "bigg", "Bigg", "bigl", "Bigl", "biggl", "Biggl",
  "bigr", "Bigr", "biggr", "Biggr", "bigm", "Bigm", "biggm", "Biggm",
]);

const TEXATOM = new Set([
  "mathord", "mathop", "mathopen", "mathclose", "mathbin",
  "mathrel", "mathpunct", "mathinner",
]);

function classifyCommand(cmd: string): string {
  if (GREEK_LOWER.has(cmd)) return "greek_lower";
  if (GREEK_UPPER.has(cmd)) return "greek_upper";
  if (NAMED_FN.has(cmd)) return "named_fn";
  if (NAMED_OP.has(cmd)) return "named_op";
  if (ACCENTS.has(cmd)) return "accent";
  if (FONTS.has(cmd)) return "font";
  if (SIZES.has(cmd)) return "size";
  if (OVERUNDER.has(cmd)) return "overunder";
  if (MAKEBIG.has(cmd)) return "makebig";
  if (TEXATOM.has(cmd)) return "texatom";
  if (cmd === "frac" || cmd === "stackrel" || cmd === "stackbin") return "frac_like";
  if (cmd === "sqrt" || cmd === "root") return "sqrt_like";
  return "default";
}

/** 매핑 파일에서 커맨드 이름을 추출하여 사용 예시 생성 */
function extractCommandsFromMappingFiles(): Formula[] {
  const formulas: Formula[] = [];
  const seen = new Set<string>();

  // 매핑 파일 패턴: 'commandName': 또는 commandName: 형태
  const mappingFiles = [
    path.join(MATHJAX_V3_TEX_DIR, "base", "BaseMappings.ts"),
    path.join(MATHJAX_V3_TEX_DIR, "ams", "AmsMappings.ts"),
    path.join(MATHJAX_V3_TEX_DIR, "physics", "PhysicsMappings.ts"),
    path.join(MATHJAX_V3_TEX_DIR, "braket", "BraketMappings.ts"),
    path.join(MATHJAX_V3_TEX_DIR, "cancel", "CancelConfiguration.ts"),
    path.join(MATHJAX_V3_TEX_DIR, "mathtools", "MathtoolsMappings.ts"),
    path.join(MATHJAX_V3_TEX_DIR, "extpfeil", "ExtpfeilConfiguration.ts"),
  ];

  // 커맨드 이름 추출 정규식: 객체 리터럴의 키
  //   'frac':  또는  frac:  형태
  const keyPattern = /^\s+['"]?([a-zA-Z]+)['"]?\s*:/gm;

  // 특수 문자 키: ',', ':', '>', ';', '!' 등
  const specialKeyPattern = /^\s+'([^a-zA-Z])'\s*:/gm;

  // 환경 이름 추출: environment 맵의 키 (begin/end에 사용)
  const envPattern = /^\s+['"]?([a-zA-Z*]+)['"]?\s*:/gm;

  for (const filePath of mappingFiles) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf-8");
    const relFile = relPath(filePath);

    // CharacterMap, CommandMap 내부의 커맨드 이름 추출
    // 블록 단위로 파싱: new sm.XXXMap('name', ..., { ... });
    const mapBlockPattern =
      /new\s+sm\.\w+Map\(\s*'([^']+)',\s*(?:[^{]*),?\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\)/gs;

    let blockMatch: RegExpExecArray | null;
    while ((blockMatch = mapBlockPattern.exec(content)) !== null) {
      const mapName = blockMatch[1];
      const blockContent = blockMatch[2];

      // 각 블록에서 키 추출
      const localKeyPattern = /^\s*['"]?([a-zA-Z][a-zA-Z0-9]*|'\\\\[a-zA-Z]+')['"]?\s*:/gm;
      let keyMatch: RegExpExecArray | null;
      while ((keyMatch = localKeyPattern.exec(blockContent)) !== null) {
        let cmd = keyMatch[1].replace(/^'\\\\/, "").replace(/'$/, "");

        // 내부 키워드/메서드명은 건너뛰기
        if (
          cmd.length < 2 ||
          /^(texClass|movesupsub|movablelimits|largeop|mathvariant|variantForm|accent|stretchy)$/.test(cmd)
        ) {
          continue;
        }

        if (seen.has(cmd)) continue;
        seen.add(cmd);

        const category = classifyCommand(cmd);
        const template = COMMAND_TEMPLATES[category] || COMMAND_TEMPLATES.default;
        const latex = template(cmd);

        formulas.push({
          id: "", // 나중에 채움
          latex,
          source_file: relFile,
          category: mapName.includes("mathchar0mi")
            ? "identifier"
            : mapName.includes("mathchar0mo")
              ? "operator"
              : mapName.includes("mathchar7")
                ? "special_char"
                : mapName.includes("delimiter")
                  ? "delimiter"
                  : mapName.includes("macros") || mapName.includes("macro")
                    ? "macro"
                    : mapName.includes("environment")
                      ? "environment"
                      : "unknown",
        });
      }
    }

    // 환경 블록 추출: new sm.EnvironmentMap('environment', ..., { ... })
    const envBlockPattern =
      /new\s+sm\.EnvironmentMap\(\s*'([^']+)',\s*(?:[^{]*),?\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\)/gs;
    let envBlockMatch: RegExpExecArray | null;
    while ((envBlockMatch = envBlockPattern.exec(content)) !== null) {
      const blockContent = envBlockMatch[2];
      const envKeyPattern = /^\s*['"]?([a-zA-Z*][a-zA-Z0-9*]*)['"]?\s*:/gm;
      let ekm: RegExpExecArray | null;
      while ((ekm = envKeyPattern.exec(blockContent)) !== null) {
        const envName = ekm[1];
        if (seen.has("env:" + envName)) continue;
        seen.add("env:" + envName);

        // 환경 사용 예시 생성
        let latex: string;
        if (envName.includes("matrix") || envName.includes("array")) {
          latex = `\\begin{${envName}} a & b \\\\ c & d \\end{${envName}}`;
        } else if (envName.includes("align") || envName.includes("eqnarray") || envName.includes("gather")) {
          latex = `\\begin{${envName}} x &= y + z \\\\ a &= b \\end{${envName}}`;
        } else if (envName === "cases") {
          latex = `\\begin{cases} x & \\text{if } x > 0 \\\\ -x & \\text{otherwise} \\end{cases}`;
        } else if (envName === "equation" || envName === "equation*") {
          latex = `\\begin{${envName}} E = mc^2 \\end{${envName}}`;
        } else {
          latex = `\\begin{${envName}} x \\end{${envName}}`;
        }

        formulas.push({
          id: "",
          latex,
          source_file: relPath(filePath),
          category: "environment",
        });
      }
    }
  }

  return formulas;
}

// ── 전략 3: 구성 가능한 복합 수식 생성 ──────────────────────
/** 매핑에서 추출한 커맨드를 조합하여 실제 사용 패턴에 가까운 복합 수식 생성 */
function generateCompositeFormulas(): Formula[] {
  const formulas: Formula[] = [];

  const composites: { latex: string; category: string }[] = [
    // 분수와 제곱근 조합
    { latex: "\\frac{\\sqrt{a^2 + b^2}}{c}", category: "composite" },
    { latex: "\\frac{1}{\\sqrt{2\\pi\\sigma^2}}", category: "composite" },
    { latex: "\\sqrt[3]{\\frac{x+y}{z}}", category: "composite" },

    // 적분
    { latex: "\\int_0^\\infty e^{-x^2} dx", category: "calculus" },
    { latex: "\\int_{-\\infty}^{\\infty} f(x) \\, dx", category: "calculus" },
    { latex: "\\iint_D f(x,y) \\, dA", category: "calculus" },
    { latex: "\\iiint_V f(x,y,z) \\, dV", category: "calculus" },
    { latex: "\\oint_C \\vec{F} \\cdot d\\vec{r}", category: "calculus" },

    // 합과 곱
    { latex: "\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}", category: "series" },
    { latex: "\\prod_{i=1}^{n} x_i", category: "series" },
    { latex: "\\sum_{k=0}^{n} \\binom{n}{k} x^k y^{n-k}", category: "series" },

    // 극한
    { latex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1", category: "limit" },
    { latex: "\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e", category: "limit" },

    // 행렬
    {
      latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
      category: "matrix",
    },
    {
      latex: "\\begin{bmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{bmatrix}",
      category: "matrix",
    },
    {
      latex: "\\det \\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc",
      category: "matrix",
    },

    // 그리스 문자 조합
    { latex: "\\alpha + \\beta = \\gamma", category: "greek" },
    { latex: "\\Gamma(n) = (n-1)!", category: "greek" },
    { latex: "\\Delta x = x_2 - x_1", category: "greek" },

    // 집합론
    { latex: "A \\cup B = B \\cup A", category: "set_theory" },
    { latex: "A \\cap (B \\cup C) = (A \\cap B) \\cup (A \\cap C)", category: "set_theory" },
    { latex: "x \\in A \\setminus B", category: "set_theory" },
    { latex: "A \\subseteq B \\iff A \\cap B = A", category: "set_theory" },
    { latex: "\\forall x \\in \\mathbb{R}, \\exists y : x < y", category: "set_theory" },

    // 논리
    { latex: "p \\land q \\Rightarrow p", category: "logic" },
    { latex: "\\neg(p \\lor q) \\equiv \\neg p \\land \\neg q", category: "logic" },

    // 미분
    { latex: "\\frac{dy}{dx} = f'(x)", category: "calculus" },
    { latex: "\\frac{\\partial f}{\\partial x}", category: "calculus" },
    { latex: "\\nabla f = \\left(\\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y}\\right)", category: "calculus" },

    // 유명 공식
    { latex: "e^{i\\pi} + 1 = 0", category: "famous" },
    { latex: "a^2 + b^2 = c^2", category: "famous" },
    { latex: "E = mc^2", category: "famous" },
    { latex: "F = ma", category: "famous" },
    { latex: "(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k", category: "famous" },
    { latex: "\\frac{d}{dx} \\int_a^x f(t) \\, dt = f(x)", category: "famous" },

    // 큰 구분자
    { latex: "\\left( \\frac{a}{b} \\right)", category: "delimiter" },
    { latex: "\\left\\{ x \\in \\mathbb{R} \\mid x > 0 \\right\\}", category: "delimiter" },
    { latex: "\\left\\langle \\phi \\mid \\psi \\right\\rangle", category: "delimiter" },
    { latex: "\\left\\lfloor \\frac{n}{2} \\right\\rfloor", category: "delimiter" },

    // 악센트/데코레이션
    { latex: "\\hat{x} + \\bar{y} = \\vec{z}", category: "accent" },
    { latex: "\\widetilde{ABC}", category: "accent" },
    { latex: "\\dot{x} = v, \\quad \\ddot{x} = a", category: "accent" },
    { latex: "\\overrightarrow{AB}", category: "accent" },

    // 첨자 조합
    { latex: "x_1^2 + x_2^2 + \\cdots + x_n^2", category: "subscript_superscript" },
    { latex: "a_{i_j}^{k^l}", category: "subscript_superscript" },
    { latex: "{}^{14}_{6}\\text{C}", category: "subscript_superscript" },

    // 공백 제어
    { latex: "a \\, b \\: c \\; d \\! e \\quad f \\qquad g", category: "spacing" },

    // 텍스트 혼합
    { latex: "x = 0 \\text{ or } x = 1", category: "text" },
    { latex: "\\text{distance} = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}", category: "text" },

    // cases 환경
    {
      latex: "|x| = \\begin{cases} x & \\text{if } x \\geq 0 \\\\ -x & \\text{if } x < 0 \\end{cases}",
      category: "environment",
    },

    // aligned 환경
    {
      latex: "\\begin{aligned} f(x) &= (x+1)^2 \\\\ &= x^2 + 2x + 1 \\end{aligned}",
      category: "environment",
    },

    // 색상 (MathJax 확장)
    { latex: "\\color{red}{x^2} + \\color{blue}{y^2}", category: "color" },

    // cancel (MathJax 확장)
    { latex: "\\cancel{x} + \\bcancel{y} + \\xcancel{z}", category: "cancel" },

    // 상/하 장식
    { latex: "\\overbrace{a+b+c}^{\\text{sum}}", category: "overunder" },
    { latex: "\\underbrace{x_1 + x_2 + \\cdots + x_n}_{n \\text{ terms}}", category: "overunder" },

    // 화살표
    { latex: "A \\xrightarrow{f} B \\xrightarrow{g} C", category: "arrow" },
    { latex: "a \\xleftarrow[below]{above} b", category: "arrow" },

    // 복합 분수
    { latex: "\\cfrac{1}{1+\\cfrac{1}{1+\\cfrac{1}{x}}}", category: "continued_fraction" },
    { latex: "\\dfrac{a}{b} + \\tfrac{c}{d}", category: "fraction" },

    // 괄호 크기
    { latex: "\\bigl( \\Bigl( \\biggl( \\Biggl(", category: "big_delimiter" },
  ];

  for (const { latex, category } of composites) {
    formulas.push({
      id: "",
      latex,
      source_file: "generated/composite",
      category,
    });
  }

  return formulas;
}

// ── 필터링 ──────────────────────────────────────────────
/** LaTeX 수식으로 유효한지 판별 */
function isValidLatex(s: string): boolean {
  // 빈 문자열 제외
  if (!s || s.trim().length === 0) return false;

  // 너무 짧은 문자열 제외 (최소 2자 이상의 LaTeX 커맨드)
  if (s.length < 3) return false;

  // 너무 긴 문자열 제외 (비정상적으로 긴 건 코드 조각일 가능성)
  if (s.length > 500) return false;

  // LaTeX 커맨드가 반드시 포함되어야 함
  if (!/\\[a-zA-Z]{2,}/.test(s)) return false;

  // HTML 태그가 주를 이루는 문자열 제외
  if (/<[a-z]+[\s>]/i.test(s) && !/\\text/.test(s)) return false;

  // JavaScript/TypeScript 코드 패턴 제외
  if (/\b(function|return|const|let|var|import|export|require|module)\b/.test(s)) return false;
  if (/\b(this\.|prototype|constructor)\b/.test(s)) return false;
  if (/\b(null|undefined|true|false)\b/i.test(s) && !/\\text/.test(s)) return false;

  // URL 패턴 제외
  if (/https?:\/\//.test(s)) return false;

  // 파일 경로 패턴 제외
  if (/\.[jt]sx?$/.test(s) || /node_modules/.test(s)) return false;

  // 에러 메시지 패턴 제외
  if (/^(Missing|Extra|Unknown|Undefined|Unexpected|Duplicate)\s/.test(s)) return false;
  if (/^%\d/.test(s)) return false; // "%1 is not ..." 형태의 에러 메시지

  // 매핑 키워드만 있는 경우 제외 (예: "\\alpha" 단독은 유효)
  // 단, 순수 커맨드 정의 코드는 제외
  if (/^\\[a-zA-Z]+$/.test(s.trim())) {
    // 단독 커맨드는 유효 (예: "\\alpha", "\\infty")
    return true;
  }

  return true;
}

/** 추출된 LaTeX 문자열 정제 */
function cleanLatex(s: string): string {
  return s
    .replace(/\\\\(?=[a-zA-Z])/g, "\\") // 이중 백슬래시 정리 (JS 이스케이프)
    .replace(/\s+/g, " ") // 연속 공백 정리
    .trim();
}

// ── 메인 실행 ──────────────────────────────────────────
function main() {
  console.log("MathJax LaTeX 수식 추출 시작...\n");

  const allFormulas: Formula[] = [];
  const seenLatex = new Set<string>();

  /** 중복 없이 수식 추가 */
  function addFormula(f: Omit<Formula, "id">) {
    const normalized = f.latex.trim();
    if (seenLatex.has(normalized)) return;
    if (!isValidLatex(normalized)) return;
    seenLatex.add(normalized);
    allFormulas.push({ ...f, id: "" });
  }

  // ── 전략 1: MathJax v4 빌드 JS 파일에서 추출 ──
  console.log("[1/4] MathJax v4 빌드 JS 파일 스캔...");
  const v4JsFiles = collectFiles(MATHJAX_V4_DIR, ".js");
  let v4Count = 0;
  for (const filePath of v4JsFiles) {
    const content = fs.readFileSync(filePath, "utf-8");
    const extracted = extractLatexStringsFromFile(content, filePath);
    for (const { latex, source } of extracted) {
      const cleaned = cleanLatex(latex);
      addFormula({ latex: cleaned, source_file: source, category: "extracted_v4" });
      v4Count++;
    }
  }
  console.log(`  - ${v4JsFiles.length}개 파일 스캔, ${v4Count}개 후보 추출`);

  // ── 전략 2: mathjax-full v3.2.2 TS 소스에서 추출 ──
  console.log("[2/4] mathjax-full v3.2.2 TS 소스 스캔...");
  const v3TsFiles = collectFiles(MATHJAX_V3_TEX_DIR, ".ts");
  let v3Count = 0;
  for (const filePath of v3TsFiles) {
    const content = fs.readFileSync(filePath, "utf-8");
    const extracted = extractLatexStringsFromFile(content, filePath);
    for (const { latex, source } of extracted) {
      const cleaned = cleanLatex(latex);
      addFormula({ latex: cleaned, source_file: source, category: "extracted_v3" });
      v3Count++;
    }
  }
  console.log(`  - ${v3TsFiles.length}개 파일 스캔, ${v3Count}개 후보 추출`);

  // ── 전략 3: 매핑 파일에서 커맨드 추출 + 사용 예시 생성 ──
  console.log("[3/4] 매핑 파일에서 커맨드 추출 및 사용 예시 생성...");
  const mappingFormulas = extractCommandsFromMappingFiles();
  for (const f of mappingFormulas) {
    addFormula(f);
  }
  console.log(`  - ${mappingFormulas.length}개 커맨드 기반 수식 생성`);

  // ── 전략 4: 복합 수식 생성 ──
  console.log("[4/4] 복합 수식 생성...");
  const compositeFormulas = generateCompositeFormulas();
  for (const f of compositeFormulas) {
    addFormula(f);
  }
  console.log(`  - ${compositeFormulas.length}개 복합 수식 생성`);

  // ── ID 부여 및 정렬 ──
  allFormulas.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.latex.localeCompare(b.latex);
  });

  for (let i = 0; i < allFormulas.length; i++) {
    allFormulas[i].id = `mathjax-${String(i + 1).padStart(4, "0")}`;
  }

  // ── JSON 출력 ──
  const output = {
    source: "MathJax source",
    source_version: "4.1.1 / 3.2.2",
    license: "Apache-2.0",
    extracted_date: new Date().toISOString().split("T")[0],
    extraction_method: "regex extraction from source/build files",
    formulas: allFormulas,
    total: allFormulas.length,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n추출 완료: ${allFormulas.length}개 수식`);
  console.log(`출력 파일: ${OUTPUT_PATH}`);

  // ── 샘플 출력 ──
  console.log("\n── 샘플 (처음 5개) ──");
  for (const f of allFormulas.slice(0, 5)) {
    console.log(`  [${f.id}] (${f.category}) ${f.latex}`);
  }

  // ── 카테고리별 통계 ──
  const catStats: Record<string, number> = {};
  for (const f of allFormulas) {
    catStats[f.category] = (catStats[f.category] || 0) + 1;
  }
  console.log("\n── 카테고리별 통계 ──");
  for (const [cat, count] of Object.entries(catStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
}

main();
