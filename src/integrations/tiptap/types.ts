import type { FizzexConfig } from '../../headless/types.js';

export interface MathInlineOptions {
  fizzexConfig?: FizzexConfig;
}

export interface MathBlockOptions {
  fizzexConfig?: FizzexConfig;
  editable?: boolean; // default true
}
