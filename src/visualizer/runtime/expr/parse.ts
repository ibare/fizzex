/**
 * Expression 문자열 → jsep AST 파서 (설계 §3.5).
 *
 * LaTeX-like 식별자 지원:
 *   - backslash `\` 를 식별자 문자로 등록해 `\omega`, `\varphi` 같은 단일 식별자 파싱.
 *
 * 연산자 추가:
 *   - `**` 거듭제곱 (우결합, precedence 13, JS와 동일).
 */

import jsep from 'jsep';
import jsepObject from '@jsep-plugin/object';

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  jsep.plugins.register(jsepObject);
  jsep.addIdentifierChar('\\');
  jsep.addBinaryOp('**', 13, true);
  configured = true;
}

export type ExprAst = jsep.Expression;

export class ExprParseError extends Error {
  constructor(
    message: string,
    public readonly source: string,
  ) {
    super(`parse error in "${source}": ${message}`);
    this.name = 'ExprParseError';
  }
}

export function parseExpr(source: string): ExprAst {
  ensureConfigured();
  try {
    return jsep(source);
  } catch (e) {
    throw new ExprParseError((e as Error).message, source);
  }
}
