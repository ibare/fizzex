/**
 * ID 생성 유틸리티
 *
 * AST 노드 및 Box에 고유 ID를 부여하기 위한 통합 유틸리티
 */

/** ID 생성기 클래스 */
class IdGenerator {
  private counter: number = 0;
  private prefix: string;

  constructor(prefix: string = 'node') {
    this.prefix = prefix;
  }

  /** 새로운 고유 ID 생성 */
  generate(): string {
    return `${this.prefix}_${++this.counter}`;
  }

  /** 카운터 리셋 */
  reset(): void {
    this.counter = 0;
  }

  /** 현재 카운터 값 조회 (디버깅용) */
  getCounter(): number {
    return this.counter;
  }

  /** prefix 변경 */
  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }
}

/**
 * 파생 ID 생성
 *
 * 부모 노드의 ID에서 자식 노드의 ID를 파생
 * 예: deriveId('frac_1', '_num') => 'frac_1_num'
 */
export function deriveId(parentId: string, suffix: string): string {
  return `${parentId}${suffix}`;
}

/**
 * 셀 ID 생성
 *
 * 행렬, 배열 등에서 셀 ID 생성
 * 예: deriveCellId('matrix_1', 0, 2) => 'matrix_1_cell_0_2'
 */
export function deriveCellId(parentId: string, row: number, col: number): string {
  return `${parentId}_cell_${row}_${col}`;
}

// 전역 ID 생성기 인스턴스 (에디터용)
const editorIdGenerator = new IdGenerator('node');

// LaTeX 파서용 ID 생성기 인스턴스
const latexIdGenerator = new IdGenerator('latex');

/**
 * 에디터 노드 ID 생성
 */
export function generateEditorId(): string {
  return editorIdGenerator.generate();
}

/**
 * LaTeX 파서 노드 ID 생성
 */
export function generateLatexId(): string {
  return latexIdGenerator.generate();
}

/**
 * LaTeX 파서 ID 카운터 리셋
 *
 * 새로운 LaTeX 문자열 파싱 시작 전에 호출
 */
export function resetLatexIdCounter(): void {
  latexIdGenerator.reset();
}

/**
 * 에디터 ID 카운터 리셋
 *
 * 새 에디터 세션 시작 시 호출
 */
export function resetEditorIdCounter(): void {
  editorIdGenerator.reset();
}

/**
 * 모든 ID 카운터 리셋 (테스트용)
 */
export function resetAllIdCounters(): void {
  editorIdGenerator.reset();
  latexIdGenerator.reset();
}

// 하위 호환성을 위한 기본 내보내기
export { IdGenerator };
