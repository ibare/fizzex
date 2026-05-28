import { z } from 'zod';
import type { VisualizerSpec } from '../types/spec.js';
import { visualizerSpecSchema } from './schema.js';

export class VisualizerSpecValidationError extends Error {
  constructor(public readonly issues: z.core.$ZodIssue[]) {
    super(
      `VisualizerSpec validation failed:\n` +
        issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n'),
    );
    this.name = 'VisualizerSpecValidationError';
  }
}

/**
 * 알 수 없는 입력을 VisualizerSpec으로 검증·반환.
 * 실패 시 VisualizerSpecValidationError throw — JSON pointer 경로 포함.
 */
export function validateSpec(input: unknown): VisualizerSpec {
  const result = visualizerSpecSchema.safeParse(input);
  if (!result.success) {
    throw new VisualizerSpecValidationError(result.error.issues);
  }
  return result.data as VisualizerSpec;
}

export { visualizerSpecSchema } from './schema.js';
