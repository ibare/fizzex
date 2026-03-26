import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateEditorId,
  generateLatexId,
  resetLatexIdCounter,
  deriveId,
  deriveCellId,
} from './id-generator';

describe('ID Generator', () => {
  beforeEach(() => {
    resetLatexIdCounter();
  });

  describe('generateEditorId', () => {
    it('순차적인 ID를 생성한다', () => {
      const id1 = generateEditorId();
      const id2 = generateEditorId();

      expect(id1).toMatch(/^node_\d+$/);
      expect(id2).toMatch(/^node_\d+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateLatexId', () => {
    it('latex_ 접두사로 순차적인 ID를 생성한다', () => {
      const id1 = generateLatexId();
      const id2 = generateLatexId();

      expect(id1).toBe('latex_1');
      expect(id2).toBe('latex_2');
    });

    it('resetLatexIdCounter로 카운터를 초기화할 수 있다', () => {
      generateLatexId();
      generateLatexId();

      resetLatexIdCounter();

      const id = generateLatexId();
      expect(id).toBe('latex_1');
    });
  });

  describe('deriveId', () => {
    it('부모 ID와 접미사를 조합한다', () => {
      const derived = deriveId('frac_1', '_num');
      expect(derived).toBe('frac_1_num');
    });

    it('빈 부모 ID도 처리한다', () => {
      const derived = deriveId('', '_suffix');
      expect(derived).toBe('_suffix');
    });
  });

  describe('deriveCellId', () => {
    it('행과 열 인덱스를 포함한 셀 ID를 생성한다', () => {
      const cellId = deriveCellId('array_1', 0, 0);
      expect(cellId).toBe('array_1_cell_0_0');
    });

    it('다양한 행/열 인덱스를 처리한다', () => {
      const cellId = deriveCellId('matrix_2', 3, 5);
      expect(cellId).toBe('matrix_2_cell_3_5');
    });
  });
});
