import type { FizzexConfig } from '../../headless/types';

export interface MathInlineOptions {
  fizzexConfig?: FizzexConfig;
}

export interface MathBlockOptions {
  fizzexConfig?: FizzexConfig;
  editable?: boolean; // default true
}
