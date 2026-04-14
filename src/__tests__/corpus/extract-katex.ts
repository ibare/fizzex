/**
 * KaTeX 테스트 스위트에서 LaTeX 수식을 추출하는 스크립트
 *
 * 추출 대상:
 *   1. ss_data.yaml — 스크린샷 테스트 케이스 (문자열 또는 tex 필드)
 *   2. katex-spec.ts — expect` ` 태그 리터럴 + r` ` 태그 리터럴 + expect("...") 패턴
 *   3. mathml-spec.ts — getMathML("...") 패턴
 *   4. mathml-spec.ts.snap — <annotation> 태그 안의 원본 LaTeX
 *   5. katex-spec.ts.snap — "input" 필드의 이스케이프된 LaTeX
 *
 * 실행: npx tsx src/__tests__/corpus/extract-katex.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ESM 환경에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── 경로 설정 ──
const KATEX_ROOT = "/Users/mintae/Documents/Develop/reference/KaTeX";
const OUTPUT_PATH = path.resolve(
  __dirname,
  "katex-formulas.json",
);

const FILES = {
  ssData: path.join(KATEX_ROOT, "test/screenshotter/ss_data.yaml"),
  katexSpec: path.join(KATEX_ROOT, "test/katex-spec.ts"),
  mathmlSpec: path.join(KATEX_ROOT, "test/mathml-spec.ts"),
  mathmlSnap: path.join(
    KATEX_ROOT,
    "test/__snapshots__/mathml-spec.ts.snap",
  ),
  katexSnap: path.join(
    KATEX_ROOT,
    "test/__snapshots__/katex-spec.ts.snap",
  ),
};

// ── 결과 수집용 ──
interface FormulaEntry {
  id: string;
  latex: string;
  source_file: string;
  category: string;
}

const formulaSet = new Map<string, { source_file: string }>();

/** 수식을 Set에 추가 (중복 방지) */
function addFormula(latex: string, sourceFile: string): void {
  const trimmed = latex.trim();
  if (!trimmed) return;
  // 이미 등록되어 있으면 건너뛰기
  if (!formulaSet.has(trimmed)) {
    formulaSet.set(trimmed, {
      source_file: path.relative(KATEX_ROOT, sourceFile),
    });
  }
}

// ══════════════════════════════════════════════════════════════
// 1. ss_data.yaml 파싱 (js-yaml 없이 수동 파싱)
// ══════════════════════════════════════════════════════════════
function extractFromSsData(): void {
  const content = fs.readFileSync(FILES.ssData, "utf-8");
  const lines = content.split("\n");

  let currentKey = "";
  let inBlockScalar = false;
  let blockLines: string[] = [];
  let inTexField = false;
  let texBlockLines: string[] = [];
  let blockIndent = 0;

  function flushBlock(): void {
    if (blockLines.length > 0) {
      const tex = blockLines.join("\n").trim();
      addFormula(tex, FILES.ssData);
      blockLines = [];
    }
    if (texBlockLines.length > 0) {
      const tex = texBlockLines.join("\n").trim();
      addFormula(tex, FILES.ssData);
      texBlockLines = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 주석 줄은 건너뛰기
    if (line.trimStart().startsWith("#")) continue;

    // 최상위 키 (들여쓰기 없는 줄, 빈 줄 아닌 것)
    const topLevelMatch = line.match(/^([A-Za-z]\w*):\s*(.*)/);
    if (topLevelMatch) {
      // 이전 블록 플러시
      flushBlock();
      inBlockScalar = false;
      inTexField = false;
      currentKey = topLevelMatch[1];
      const value = topLevelMatch[2].trim();

      if (value === "|" || value === ">") {
        // 블록 스칼라 시작 — 다음 줄부터 수집
        inBlockScalar = true;
        blockIndent = 0;
        blockLines = [];
      } else if (value && value !== "" && !value.startsWith("{")) {
        // 인라인 문자열 값 — 따옴표 제거
        const cleaned = value.replace(/^['"]|['"]$/g, "");
        addFormula(cleaned, FILES.ssData);
      }
      continue;
    }

    // tex 필드 (하위 키)
    const texFieldMatch = line.match(/^\s+tex:\s*(.*)/);
    if (texFieldMatch) {
      flushBlock();
      inBlockScalar = false;
      inTexField = false;
      const value = texFieldMatch[1].trim();

      if (value === "|" || value === ">") {
        inTexField = true;
        texBlockLines = [];
        blockIndent = 0;
      } else if (value) {
        const cleaned = value.replace(/^['"]|['"]$/g, "");
        addFormula(cleaned, FILES.ssData);
      }
      continue;
    }

    // nolatex, noThrow, errorColor, display, pre, post, styles, macros 등 메타 필드는 건너뛰기
    const metaFieldMatch = line.match(
      /^\s+(nolatex|noThrow|errorColor|display|pre|post|styles|macros|startExp|endExp):/,
    );
    if (metaFieldMatch) {
      // 블록 스칼라 종료
      if (inBlockScalar) {
        flushBlock();
        inBlockScalar = false;
      }
      if (inTexField) {
        flushBlock();
        inTexField = false;
      }
      continue;
    }

    // 블록 스칼라 연속
    if (inBlockScalar && line.match(/^\s+/)) {
      if (blockIndent === 0) {
        const m = line.match(/^(\s+)/);
        if (m) blockIndent = m[1].length;
      }
      blockLines.push(line.slice(blockIndent));
      continue;
    }

    // tex 필드 블록 연속
    if (inTexField && line.match(/^\s{4,}/)) {
      if (blockIndent === 0) {
        const m = line.match(/^(\s+)/);
        if (m) blockIndent = m[1].length;
      }
      texBlockLines.push(line.slice(blockIndent));
      continue;
    }

    // 빈 줄이면 블록 종료
    if (line.trim() === "") {
      if (inBlockScalar || inTexField) {
        flushBlock();
        inBlockScalar = false;
        inTexField = false;
      }
    }
  }
  // 마지막 블록 플러시
  flushBlock();
}

// ══════════════════════════════════════════════════════════════
// 2. katex-spec.ts에서 수식 추출
// ══════════════════════════════════════════════════════════════
function extractFromKatexSpec(): void {
  const content = fs.readFileSync(FILES.katexSpec, "utf-8");

  // 패턴 1: expect`...`.to... (태그 리터럴)
  const expectBacktickRe = /expect`([^`]+)`\./g;
  let match;
  while ((match = expectBacktickRe.exec(content)) !== null) {
    addFormula(match[1], FILES.katexSpec);
  }

  // 패턴 2: .toParseLike`...` (태그 리터럴)
  const parseLikeBacktickRe = /\.toParseLike`([^`]+)`/g;
  while ((match = parseLikeBacktickRe.exec(content)) !== null) {
    addFormula(match[1], FILES.katexSpec);
  }

  // 패턴 3: r`...` (raw 문자열 태그 리터럴)
  const rBacktickRe = /\br`([^`]+)`/g;
  while ((match = rBacktickRe.exec(content)) !== null) {
    addFormula(match[1], FILES.katexSpec);
  }

  // 패턴 4: expect("...").toParse / .toBuild / .not / .toParseLike
  // 일반 문자열로 전달된 수식
  const expectStringRe = /expect\("([^"]+)"\)\./g;
  while ((match = expectStringRe.exec(content)) !== null) {
    // 이스케이프된 백슬래시 복원
    const latex = match[1].replace(/\\\\/g, "\\");
    addFormula(latex, FILES.katexSpec);
  }

  // 패턴 5: .toParseLike("...", ...)
  const parseLikeStringRe = /\.toParseLike\("([^"]+)"/g;
  while ((match = parseLikeStringRe.exec(content)) !== null) {
    const latex = match[1].replace(/\\\\/g, "\\");
    addFormula(latex, FILES.katexSpec);
  }

  // 패턴 6: const expression = "..." (변수 선언된 수식)
  const constExprRe =
    /const\s+\w+(?:Expression|expression)?\s*=\s*"([^"]+)"/g;
  while ((match = constExprRe.exec(content)) !== null) {
    const latex = match[1].replace(/\\\\/g, "\\");
    addFormula(latex, FILES.katexSpec);
  }
}

// ══════════════════════════════════════════════════════════════
// 3. mathml-spec.ts에서 수식 추출
// ══════════════════════════════════════════════════════════════
function extractFromMathmlSpec(): void {
  const content = fs.readFileSync(FILES.mathmlSpec, "utf-8");

  // getMathML("...") 패턴
  const getMathMLRe = /getMathML\("([^"]+)"/g;
  let match;
  while ((match = getMathMLRe.exec(content)) !== null) {
    const latex = match[1].replace(/\\\\/g, "\\");
    addFormula(latex, FILES.mathmlSpec);
  }

  // getMathML("..." + "...") 이어붙이기 패턴 — 개별 조각도 추출
  const getMathMLConcatRe = /getMathML\(([^)]+)\)/g;
  while ((match = getMathMLConcatRe.exec(content)) !== null) {
    const full = match[1];
    // 문자열 리터럴을 모두 추출해서 합치기
    const strParts: string[] = [];
    const strRe = /"([^"]*)"/g;
    let strMatch;
    while ((strMatch = strRe.exec(full)) !== null) {
      strParts.push(strMatch[1]);
    }
    if (strParts.length > 1) {
      const combined = strParts.join("").replace(/\\\\/g, "\\");
      addFormula(combined, FILES.mathmlSpec);
    }
  }
}

// ══════════════════════════════════════════════════════════════
// 4. mathml-spec.ts.snap에서 <annotation> 태그 수식 추출
// ══════════════════════════════════════════════════════════════
function extractFromMathmlSnap(): void {
  const content = fs.readFileSync(FILES.mathmlSnap, "utf-8");

  // <annotation encoding="application/x-tex"> 다음 줄의 LaTeX
  const annotationRe =
    /<annotation encoding="application\/x-tex">\s*\n\s*([\s\S]*?)\s*\n\s*<\/annotation>/g;
  let match;
  while ((match = annotationRe.exec(content)) !== null) {
    // 이스케이프 복원: 스냅샷에서는 \\ → \
    let latex = match[1].trim();
    latex = latex.replace(/\\\\/g, "\\");
    addFormula(latex, FILES.mathmlSnap);
  }
}

// ══════════════════════════════════════════════════════════════
// 5. katex-spec.ts.snap에서 "input" 필드 수식 추출
// ══════════════════════════════════════════════════════════════
function extractFromKatexSnap(): void {
  const content = fs.readFileSync(FILES.katexSnap, "utf-8");

  // "input": "\\\\escaped\\\\latex" 패턴
  const inputRe = /"input":\s*"([^"]+)"/g;
  let match;
  while ((match = inputRe.exec(content)) !== null) {
    // 스냅샷은 이중 이스케이프: \\\\ → \\  → \
    let latex = match[1].replace(/\\\\/g, "\\");
    addFormula(latex, FILES.katexSnap);
  }
}

// ══════════════════════════════════════════════════════════════
// 필터링: 유의미한 LaTeX 수식만 남기기
// ══════════════════════════════════════════════════════════════
function isValidFormula(latex: string): boolean {
  // 빈 문자열 제외
  if (!latex || latex.trim().length === 0) return false;

  // 1자 이하 제외
  if (latex.trim().length <= 1) return false;

  // 순수 텍스트 (백슬래시, ^, _, {, } 없음) 제외
  if (!/[\\^_{}]/.test(latex)) return false;

  return true;
}

// ══════════════════════════════════════════════════════════════
// 메인 실행
// ══════════════════════════════════════════════════════════════
function main(): void {
  console.log("KaTeX 테스트 스위트에서 LaTeX 수식 추출 시작...\n");

  // 파일 존재 확인
  for (const [name, filePath] of Object.entries(FILES)) {
    if (!fs.existsSync(filePath)) {
      console.error(`파일 없음: ${name} → ${filePath}`);
      process.exit(1);
    }
    console.log(`  [확인] ${name}: ${path.relative(KATEX_ROOT, filePath)}`);
  }
  console.log();

  // 각 소스에서 추출
  const countBefore = () => formulaSet.size;

  extractFromSsData();
  const afterSsData = formulaSet.size;
  console.log(`  ss_data.yaml: ${afterSsData}개 추출`);

  extractFromKatexSpec();
  const afterKatexSpec = formulaSet.size;
  console.log(
    `  katex-spec.ts: ${afterKatexSpec - afterSsData}개 추출 (누적 ${afterKatexSpec})`,
  );

  extractFromMathmlSpec();
  const afterMathmlSpec = formulaSet.size;
  console.log(
    `  mathml-spec.ts: ${afterMathmlSpec - afterKatexSpec}개 추출 (누적 ${afterMathmlSpec})`,
  );

  extractFromMathmlSnap();
  const afterMathmlSnap = formulaSet.size;
  console.log(
    `  mathml-spec.ts.snap: ${afterMathmlSnap - afterMathmlSpec}개 추출 (누적 ${afterMathmlSnap})`,
  );

  extractFromKatexSnap();
  const afterKatexSnap = formulaSet.size;
  console.log(
    `  katex-spec.ts.snap: ${afterKatexSnap - afterMathmlSnap}개 추출 (누적 ${afterKatexSnap})`,
  );

  console.log(`\n  총 추출 (중복 제거 후): ${formulaSet.size}개`);

  // 필터링
  const formulas: FormulaEntry[] = [];
  let idx = 1;
  for (const [latex, meta] of formulaSet) {
    if (!isValidFormula(latex)) continue;
    formulas.push({
      id: `katex-${String(idx).padStart(4, "0")}`,
      latex,
      source_file: meta.source_file,
      category: "unknown",
    });
    idx++;
  }

  console.log(`  필터링 후: ${formulas.length}개\n`);

  // JSON 출력
  const output = {
    source: "KaTeX test suite",
    source_version: "0.16.45",
    license: "MIT",
    extracted_date: new Date().toISOString().split("T")[0],
    extraction_method: "YAML parsing + regex extraction from test files",
    formulas,
    total: formulas.length,
  };

  // 출력 디렉토리 확인
  const outDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`  저장 완료: ${OUTPUT_PATH}`);
  console.log(`  총 수식 수: ${output.total}\n`);

  // 샘플 5개 출력
  console.log("── 샘플 수식 (처음 5개) ──");
  for (const f of formulas.slice(0, 5)) {
    console.log(`  ${f.id}: ${f.latex.slice(0, 80)}${f.latex.length > 80 ? "..." : ""}`);
    console.log(`          출처: ${f.source_file}`);
  }
}

main();
