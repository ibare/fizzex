import { describe, it, expect } from 'vitest';
import { MathBlock } from './math-block';

describe('MathBlock Extension', () => {
  it('MathBlock이 정의되어 있다', () => {
    expect(MathBlock).toBeDefined();
  });

  it('name이 mathBlock이다', () => {
    expect(MathBlock.name).toBe('mathBlock');
  });

  it('group이 block이다', () => {
    expect(MathBlock.config.group).toBe('block');
  });

  it('atom이 true이다', () => {
    expect(MathBlock.config.atom).toBe(true);
  });

  it('기본 옵션에 editable이 true이다', () => {
    expect(MathBlock.options.editable).toBe(true);
  });
});
