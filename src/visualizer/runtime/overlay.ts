/**
 * HTML overlay 렌더러 (설계 §11, 결정 D3).
 *
 * host 요소 내부에 `<div class="fizzex-overlay">` 컨테이너를 만들고
 * OverlayLine 개수만큼 `<span>`을 생성. 매 프레임 `renderFrame(rc)`로 갱신.
 *
 * line.value가 있으면 Expression 평가 → `format` 옵션이 있으면 `builtins.format`과
 * 동일 문법으로 포맷 (이 모듈에선 단순 Number.toFixed 근사 — 자릿수 포맷만).
 * 고급 포맷(sci/percent 등)은 Expression 내 `format()` 호출을 권장.
 */

import { evalExpr, type EvalContext } from './expr/eval-context';
import { resolveI18n } from './types/i18n';
import type { OverlaySpec, OverlayLine } from './types/overlay';

export interface OverlayController {
  renderFrame(rc: EvalContext): void;
  detach(): void;
}

interface LineBinding {
  root: HTMLSpanElement;
  label: HTMLSpanElement;
  value: HTMLSpanElement;
  spec: OverlayLine;
}

export function attachOverlay(
  host: HTMLElement,
  spec: OverlaySpec | undefined,
  locale: string,
): OverlayController {
  const container = host.ownerDocument.createElement('div');
  container.className = 'fizzex-overlay';
  host.appendChild(container);

  const bindings: LineBinding[] = [];
  if (spec?.lines) {
    for (const line of spec.lines) {
      const root = host.ownerDocument.createElement('span');
      root.className = 'fizzex-overlay-line';
      const label = host.ownerDocument.createElement('span');
      label.className = 'fizzex-overlay-label';
      if (line.label) label.textContent = resolveI18n(line.label, locale);
      const value = host.ownerDocument.createElement('span');
      value.className = 'fizzex-overlay-value';
      root.appendChild(label);
      root.appendChild(value);
      container.appendChild(root);
      bindings.push({ root, label, value, spec: line });
    }
  }

  return {
    renderFrame(rc) {
      for (const b of bindings) {
        if (b.spec.visible !== undefined) {
          const show = evalExpr(b.spec.visible, rc);
          b.root.style.display = show ? '' : 'none';
          if (!show) continue;
        }
        if (b.spec.value !== undefined) {
          const raw = evalExpr(b.spec.value, rc);
          b.value.textContent = formatValue(raw, b.spec.format);
        }
        const styleExpr = b.spec.style?.color;
        if (styleExpr !== undefined) {
          const c = evalExpr(styleExpr, rc);
          if (typeof c === 'string') b.value.style.color = c;
        }
      }
    },
    detach() {
      container.remove();
    },
  };
}

function formatValue(raw: unknown, fmt: string | undefined): string {
  if (typeof raw === 'number') {
    const digits = parseDigits(fmt);
    return digits === undefined ? String(raw) : raw.toFixed(digits);
  }
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'boolean') return raw ? 'true' : 'false';
  return String(raw);
}

function parseDigits(fmt: string | undefined): number | undefined {
  if (!fmt) return undefined;
  const m = /^\.(\d+)f$/.exec(fmt);
  if (!m) return undefined;
  return Number(m[1]);
}
