import { describe, it, expect } from 'vitest';
import { MathInline } from './math-inline';

describe('MathInline Extension', () => {
  it('MathInline이 정의되어 있다', () => {
    expect(MathInline).toBeDefined();
  });

  it('name이 mathInline이다', () => {
    expect(MathInline.name).toBe('mathInline');
  });

  it('group이 inline이다', () => {
    expect(MathInline.config.group).toBe('inline');
  });

  it('inline이 true이다', () => {
    expect(MathInline.config.inline).toBe(true);
  });

  it('atom이 true이다', () => {
    expect(MathInline.config.atom).toBe(true);
  });
});
