/**
 * KaTeX 내부 API 타입 확장
 *
 * __parse는 KaTeX ESM 빌드에서 named export로 제공되지만
 * @types/katex에는 포함되지 않은 내부 함수.
 * dist/katex.mjs line 16495에서 export 확인.
 */
import type { KatexOptions } from 'katex';

declare module 'katex' {
  export function __parse(tex: string, options?: KatexOptions): unknown[];
}
