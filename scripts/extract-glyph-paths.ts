/**
 * New Computer Modern Math 폰트에서 괄호 글리프 경로를 추출하는 빌드 스크립트.
 *
 * - opentype.js: 글리프 윤곽선(path) 추출
 * - DataView: MATH 테이블 파싱 (크기 변형 글리프 ID, extensible 파트)
 * - 출력: src/fonts/delimiter-paths.ts (정적 타입스크립트 데이터)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FONT_PATH = resolve(ROOT, 'fonts/NewCMMath-Regular.otf');
const OUTPUT_PATH = resolve(ROOT, 'src/fonts/delimiter-paths.ts');

// 추출 대상: ( ) [ ] √ ‖
const TARGET_CHARS: Record<string, number> = {
  '(': 0x0028,
  ')': 0x0029,
  '[': 0x005B,
  ']': 0x005D,
  '√': 0x221A,
  '‖': 0x2016,
};

// ─── OTF 바이너리 유틸 ───────────────────────────────────────

function readTag(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

function findTableOffset(view: DataView, tag: string): { offset: number; length: number } | null {
  const numTables = view.getUint16(4);
  for (let i = 0; i < numTables; i++) {
    const base = 12 + i * 16;
    if (readTag(view, base) === tag) {
      return {
        offset: view.getUint32(base + 8),
        length: view.getUint32(base + 12),
      };
    }
  }
  return null;
}

// Coverage 테이블 파싱 — Format 1 (글리프 목록) 또는 Format 2 (범위)
function parseCoverage(view: DataView, offset: number): number[] {
  const format = view.getUint16(offset);
  const glyphs: number[] = [];

  if (format === 1) {
    const count = view.getUint16(offset + 2);
    for (let i = 0; i < count; i++) {
      glyphs.push(view.getUint16(offset + 4 + i * 2));
    }
  } else if (format === 2) {
    const rangeCount = view.getUint16(offset + 2);
    for (let i = 0; i < rangeCount; i++) {
      const base = offset + 4 + i * 6;
      const startGlyph = view.getUint16(base);
      const endGlyph = view.getUint16(base + 2);
      // const startCoverageIndex = view.getUint16(base + 4);
      for (let g = startGlyph; g <= endGlyph; g++) {
        glyphs.push(g);
      }
    }
  }

  return glyphs;
}

// ─── MATH 테이블에서 크기 변형 및 extensible 파트 추출 ───────

interface MathVariantInfo {
  variantGlyphIds: number[];
  assembly?: {
    parts: Array<{
      glyphId: number;
      isExtender: boolean;
      startConnectorLength: number;
      endConnectorLength: number;
      fullAdvance: number;
    }>;
  };
}

function parseMathVariants(view: DataView, mathTableOffset: number, targetGlyphIds: number[]): Map<number, MathVariantInfo> {
  const result = new Map<number, MathVariantInfo>();

  // MATH 헤더: version(4) + MathConstants(2) + MathGlyphInfo(2) + MathVariants(2)
  const mathVariantsOffset = view.getUint16(mathTableOffset + 8);
  const V = mathTableOffset + mathVariantsOffset;

  // MathVariants: MinConnectorOverlap(2) + VertGlyphCoverage(2) + HorizGlyphCoverage(2) + VertGlyphCount(2) + HorizGlyphCount(2)
  const vertCoverageOffset = view.getUint16(V + 2);
  const vertGlyphCount = view.getUint16(V + 6);

  // Coverage 파싱
  const coverageGlyphs = parseCoverage(view, V + vertCoverageOffset);

  // 각 대상 글리프에 대해 Construction 정보 추출
  for (const targetGlyphId of targetGlyphIds) {
    const coverageIndex = coverageGlyphs.indexOf(targetGlyphId);
    if (coverageIndex === -1 || coverageIndex >= vertGlyphCount) continue;

    // Construction 오프셋 배열: V + 10 에서 시작
    const constructionRelOffset = view.getUint16(V + 10 + coverageIndex * 2);
    const C = V + constructionRelOffset;

    const info: MathVariantInfo = { variantGlyphIds: [] };

    // GlyphConstruction: GlyphAssemblyOffset(2) + VariantCount(2) + MathGlyphVariantRecord[](4 * count)
    const assemblyOffset = view.getUint16(C);
    const variantCount = view.getUint16(C + 2);

    for (let i = 0; i < variantCount; i++) {
      const variantGlyphId = view.getUint16(C + 4 + i * 4);
      info.variantGlyphIds.push(variantGlyphId);
    }

    // GlyphAssembly 파싱
    if (assemblyOffset !== 0) {
      const A = C + assemblyOffset;
      // ItalicsCorrection(4) + PartCount(2)
      const partCount = view.getUint16(A + 4);
      const parts: MathVariantInfo['assembly'] extends undefined ? never : NonNullable<MathVariantInfo['assembly']>['parts'] = [];

      for (let i = 0; i < partCount; i++) {
        const base = A + 6 + i * 10;
        parts.push({
          glyphId: view.getUint16(base),
          startConnectorLength: view.getUint16(base + 2),
          endConnectorLength: view.getUint16(base + 4),
          fullAdvance: view.getUint16(base + 6),
          isExtender: (view.getUint16(base + 8) & 0x0001) !== 0,
        });
      }

      info.assembly = { parts };
    }

    result.set(targetGlyphId, info);
  }

  return result;
}

// ─── 글리프 경로 추출 ────────────────────────────────────────

interface PathCommand {
  type: 'M' | 'L' | 'Q' | 'C' | 'Z';
  args: number[];
}

interface GlyphPathData {
  commands: PathCommand[];
  advanceWidth: number;
  ascent: number;
  descent: number;
}

function extractGlyphPath(font: opentype.Font, glyphId: number): GlyphPathData | null {
  const glyph = font.glyphs.get(glyphId);
  if (!glyph) return null;

  const unitsPerEm = font.unitsPerEm;
  const path = glyph.getPath(0, 0, unitsPerEm);
  const commands: PathCommand[] = [];

  let minY = Infinity;
  let maxY = -Infinity;

  // opentype.js getPath()는 이미 Canvas 방향 Y를 반환 (양수=아래)
  // 별도 Y 반전 불필요 — 그대로 정규화만 수행
  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        commands.push({ type: 'M', args: [cmd.x / unitsPerEm, cmd.y / unitsPerEm] });
        minY = Math.min(minY, cmd.y / unitsPerEm);
        maxY = Math.max(maxY, cmd.y / unitsPerEm);
        break;
      case 'L':
        commands.push({ type: 'L', args: [cmd.x / unitsPerEm, cmd.y / unitsPerEm] });
        minY = Math.min(minY, cmd.y / unitsPerEm);
        maxY = Math.max(maxY, cmd.y / unitsPerEm);
        break;
      case 'Q':
        commands.push({ type: 'Q', args: [cmd.x1 / unitsPerEm, cmd.y1 / unitsPerEm, cmd.x / unitsPerEm, cmd.y / unitsPerEm] });
        minY = Math.min(minY, cmd.y / unitsPerEm, cmd.y1 / unitsPerEm);
        maxY = Math.max(maxY, cmd.y / unitsPerEm, cmd.y1 / unitsPerEm);
        break;
      case 'C':
        commands.push({ type: 'C', args: [cmd.x1 / unitsPerEm, cmd.y1 / unitsPerEm, cmd.x2 / unitsPerEm, cmd.y2 / unitsPerEm, cmd.x / unitsPerEm, cmd.y / unitsPerEm] });
        minY = Math.min(minY, cmd.y / unitsPerEm, cmd.y1 / unitsPerEm, cmd.y2 / unitsPerEm);
        maxY = Math.max(maxY, cmd.y / unitsPerEm, cmd.y1 / unitsPerEm, cmd.y2 / unitsPerEm);
        break;
      case 'Z':
        commands.push({ type: 'Z', args: [] });
        break;
    }
  }

  // Canvas 방향: 기준선 = y=0, 위 = 음수, 아래 = 양수
  // ascent = 기준선 위 높이 (음수 Y의 절대값)
  // descent = 기준선 아래 깊이 (양수 Y의 최대값)
  const ascent = Math.abs(Math.min(0, minY));
  const descent = Math.max(0, maxY);

  return {
    commands,
    advanceWidth: (glyph.advanceWidth ?? 0) / unitsPerEm,
    ascent,
    descent,
  };
}

// ─── 메인 ────────────────────────────────────────────────────

function main() {
  console.log('폰트 로드 중:', FONT_PATH);
  const buffer = readFileSync(FONT_PATH);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const font = opentype.parse(arrayBuffer);
  const view = new DataView(arrayBuffer);

  console.log(`unitsPerEm: ${font.unitsPerEm}`);

  // MATH 테이블 찾기
  const mathTable = findTableOffset(view, 'MATH');
  if (!mathTable) {
    throw new Error('MATH 테이블을 찾을 수 없습니다.');
  }
  console.log(`MATH 테이블: offset=${mathTable.offset}, length=${mathTable.length}`);

  // 대상 글리프 ID 수집
  const charToGlyphId = new Map<string, number>();
  for (const [char, codePoint] of Object.entries(TARGET_CHARS)) {
    const glyphId = font.charToGlyphIndex(String.fromCodePoint(codePoint));
    if (glyphId === 0) {
      console.warn(`글리프를 찾을 수 없음: ${char} (U+${codePoint.toString(16).padStart(4, '0')})`);
      continue;
    }
    charToGlyphId.set(char, glyphId);
    console.log(`${char} → glyphId=${glyphId}`);
  }

  // MATH 변형 정보 추출
  const targetGlyphIds = [...charToGlyphId.values()];
  const mathVariants = parseMathVariants(view, mathTable.offset, targetGlyphIds);

  // 모든 글리프 경로 추출
  const entries: string[] = [];

  for (const [char, baseGlyphId] of charToGlyphId) {
    const basePath = extractGlyphPath(font, baseGlyphId);
    if (!basePath) {
      console.warn(`기본 글리프 경로 추출 실패: ${char}`);
      continue;
    }

    const variantInfo = mathVariants.get(baseGlyphId);

    // 크기 변형 경로 추출
    const variants: GlyphPathData[] = [];
    if (variantInfo) {
      for (const varGlyphId of variantInfo.variantGlyphIds) {
        const varPath = extractGlyphPath(font, varGlyphId);
        if (varPath) variants.push(varPath);
      }
      console.log(`${char}: ${variants.length}개 크기 변형 추출`);
    }

    // Extensible 파트 추출
    let extensible: { top: GlyphPathData; ext: GlyphPathData; bottom: GlyphPathData } | undefined;
    if (variantInfo?.assembly) {
      const parts = variantInfo.assembly.parts;
      const topPart = parts.find((p) => !p.isExtender && parts.indexOf(p) === 0);
      const extPart = parts.find((p) => p.isExtender);
      const bottomPart = parts.find((p) => !p.isExtender && parts.indexOf(p) === parts.length - 1);

      if (topPart && extPart && bottomPart) {
        const topPath = extractGlyphPath(font, topPart.glyphId);
        const extPath = extractGlyphPath(font, extPart.glyphId);
        const bottomPath = extractGlyphPath(font, bottomPart.glyphId);

        if (topPath && extPath && bottomPath) {
          extensible = { top: topPath, ext: extPath, bottom: bottomPath };
          console.log(`${char}: extensible 파트 추출 완료`);
        }
      }
    }

    entries.push(formatEntry(char, basePath, variants, extensible));
  }

  // TypeScript 파일 생성
  const output = generateOutput(entries);
  writeFileSync(OUTPUT_PATH, output, 'utf-8');
  console.log(`\n출력: ${OUTPUT_PATH}`);
  console.log('완료!');
}

// ─── 코드 생성 ───────────────────────────────────────────────

function formatPathData(data: GlyphPathData): string {
  const cmds = data.commands
    .map((c) => {
      const args = c.args.map((a) => round(a)).join(', ');
      return args ? `{ type: '${c.type}', args: [${args}] }` : `{ type: '${c.type}', args: [] }`;
    })
    .join(',\n      ');

  return `{
    commands: [
      ${cmds},
    ],
    advanceWidth: ${round(data.advanceWidth)},
    ascent: ${round(data.ascent)},
    descent: ${round(data.descent)},
  }`;
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function formatEntry(
  char: string,
  base: GlyphPathData,
  variants: GlyphPathData[],
  extensible?: { top: GlyphPathData; ext: GlyphPathData; bottom: GlyphPathData },
): string {
  let result = `  '${char}': {\n    base: ${formatPathData(base)},\n`;

  if (variants.length > 0) {
    const varStrs = variants.map((v) => `    ${formatPathData(v)}`).join(',\n');
    result += `    variants: [\n${varStrs},\n    ],\n`;
  }

  if (extensible) {
    result += `    extensible: {\n`;
    result += `      top: ${formatPathData(extensible.top)},\n`;
    result += `      ext: ${formatPathData(extensible.ext)},\n`;
    result += `      bottom: ${formatPathData(extensible.bottom)},\n`;
    result += `    },\n`;
  }

  result += `  }`;
  return result;
}

function generateOutput(entries: string[]): string {
  return `// 자동 생성 파일 — scripts/extract-glyph-paths.ts 에서 생성
// New Computer Modern Math 폰트에서 추출한 글리프 경로 데이터
// 좌표: unitsPerEm 정규화, Y축 반전 (Canvas 방향: 양수=아래)

export interface PathCommand {
  type: 'M' | 'L' | 'Q' | 'C' | 'Z';
  args: number[];
}

export interface GlyphPathData {
  commands: PathCommand[];
  advanceWidth: number;
  ascent: number;
  descent: number;
}

export interface DelimiterPathEntry {
  base: GlyphPathData;
  variants?: GlyphPathData[];
  extensible?: {
    top: GlyphPathData;
    ext: GlyphPathData;
    bottom: GlyphPathData;
  };
}

export const DELIMITER_PATHS: Record<string, DelimiterPathEntry> = {
${entries.join(',\n')},
};
`;
}

main();
