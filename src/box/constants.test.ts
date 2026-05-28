import { describe, it, expect } from 'vitest';
import { COMPLEX_NODE_SUFFIXES, isComplexNodeSlot } from './constants.js';

describe('Box Constants', () => {
  describe('COMPLEX_NODE_SUFFIXES', () => {
    it('필수 접미사들이 포함되어 있다', () => {
      expect(COMPLEX_NODE_SUFFIXES).toContain('_num');
      expect(COMPLEX_NODE_SUFFIXES).toContain('_den');
      expect(COMPLEX_NODE_SUFFIXES).toContain('_content');
      expect(COMPLEX_NODE_SUFFIXES).toContain('_exp');
      expect(COMPLEX_NODE_SUFFIXES).toContain('_sub');
    });
  });

  describe('isComplexNodeSlot', () => {
    it('복합 노드 접미사가 있으면 true를 반환한다', () => {
      expect(isComplexNodeSlot('frac_1_num')).toBe(true);
      expect(isComplexNodeSlot('frac_1_den')).toBe(true);
      expect(isComplexNodeSlot('sqrt_1_content')).toBe(true);
      expect(isComplexNodeSlot('sup_1_exp')).toBe(true);
    });

    it('셀 ID는 true를 반환한다', () => {
      expect(isComplexNodeSlot('matrix_1_cell_0_0')).toBe(true);
      expect(isComplexNodeSlot('array_1_cell_2_3')).toBe(true);
    });

    it('일반 노드 ID는 false를 반환한다', () => {
      expect(isComplexNodeSlot('latex_1')).toBe(false);
      expect(isComplexNodeSlot('node_42')).toBe(false);
      expect(isComplexNodeSlot('variable_x')).toBe(false);
    });

    it('undefined나 빈 문자열은 false를 반환한다', () => {
      expect(isComplexNodeSlot(undefined)).toBe(false);
      expect(isComplexNodeSlot('')).toBe(false);
    });
  });
});
