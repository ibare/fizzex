/**
 * User Binding Bridge — 사용자 LaTeX 변수 값을 visualizer state 로 흘리는 일급 경로
 * (설계 통합 V3: Output Kind 어댑터).
 *
 * 책임 분리:
 *   - 사용자 수식 평가: `evaluator` (단일 진리)
 *   - 시각화 런타임 DSL: jsep (`expr/*`)
 *
 * ## 입력 모델
 *
 * 호스트는 spec.userBindings 의 각 슬롯 이름에 사용자가 입력한 LaTeX 식을
 * `MathNode` AST 로 전달한다. 호스트가 즉시값(number) 만 보유한 경우 union 타입
 * `number` 을 그대로 줘도 되며, bridge 내부에서 NumberNode 로 wrap 한다.
 *
 *   inputs = { "A": numberOrAst, "M": parseLatex("\\begin{pmatrix}...\\end{pmatrix}"), ... }
 *
 * ## outputKind 별 분기 평가
 *
 *   - scalar  → evaluate(node)         → number     → store.setParam('external')
 *   - matrix  → evaluateMatrix(node)   → MatrixValue → store.setBinding
 *   - complex → evaluateComplex(node)  → Complex    → store.setBinding
 *
 * 카탈로그 spec 의 expr 평가는 mount 의 buildFrameContext (V3-S2) 에서
 * `...snap.bindings` 를 params 위에 머지하므로, 추가 호스트 함수 없이
 * `M.data[i][j]` / `z.re` / `z.im` 같은 객체 member 접근만으로 소비된다.
 *
 * 실패한 binding 은 `skipped` 에 누적되며 EvalStatus 는 `mapStatus` 로
 * SkipReason 으로 좁혀진다 (exhaustive switch + never check). matrix/complex
 * 의 경우 이전 binding 값이 남는 것을 막기 위해 명시적 `clearBinding`.
 */

import { evaluate, evaluateMatrix, evaluateComplex } from '../../evaluator';
import type { EvalStatus, Matrix, MatrixValue, Complex } from '../../evaluator';
import type { MathNode, NumberNode } from '../../types';
import type { VisualizerSpec } from './types/spec';
import type { StateStore } from './state';
import type { OutputKind } from './types/user-binding';

/**
 * 호스트가 binding 하나당 줄 수 있는 입력 형태:
 *   - MathNode: 사용자가 LaTeX 편집기에 입력한 식의 파싱 결과 AST (일반 경로)
 *   - number  : 호스트가 이미 평가된 즉시값을 가진 경우의 편의 입력 — 내부에서 NumberNode 로 wrap
 */
export type UserBindingInput = MathNode | number;

/**
 * spec.userBindings 의 name → input AST/number 매핑.
 * 누락된 name 은 unbound 로 skip 된다 (required: true 면 SkipReason 동일하게 표시).
 */
export type UserBindingInputs = Readonly<Record<string, UserBindingInput>>;

/**
 * 어댑터별 결과값. outputKind 에 따라 좁혀진다:
 *   - scalar : number       (slider 와 동일 채널, params 슬롯)
 *   - matrix : Matrix | number (스칼라 행렬도 합법)
 *   - complex: { re, im }
 */
export type AppliedBindingValue = number | Matrix | Complex;

export interface AppliedBinding {
  name: string;
  outputKind: OutputKind;
  value: AppliedBindingValue;
}

export type SkipReason =
  | 'unbound'
  | 'domain'
  | 'divergent'
  | 'unsupported'
  | 'eval-failed';

export interface SkippedBinding {
  name: string;
  outputKind: OutputKind;
  reason: SkipReason;
  required: boolean;
  detail?: string;
}

export interface ApplyUserBindingsResult {
  applied: AppliedBinding[];
  skipped: SkippedBinding[];
}

/**
 * spec.userBindings 의 각 binding 을 evaluator 로 평가하고 outputKind 에 따라
 * store 의 적절한 슬롯에 주입한다.
 *
 * - scalar 의 setParam 은 source='external' — UI 슬라이더와 동일 채널, listener 전파
 * - matrix/complex 는 setBinding (params 와 독립 슬롯), listener 비전파
 * - 평가 실패 시 matrix/complex 슬롯에 이전 값이 남지 않도록 clearBinding 호출
 */
export function applyUserBindings(
  spec: VisualizerSpec,
  inputs: UserBindingInputs,
  store: StateStore,
): ApplyUserBindingsResult {
  const applied: AppliedBinding[] = [];
  const skipped: SkippedBinding[] = [];
  const userBindings = spec.userBindings ?? [];

  for (const binding of userBindings) {
    const raw = inputs[binding.name];
    if (raw === undefined) {
      if (binding.outputKind !== 'scalar') store.clearBinding(binding.name);
      skipped.push({
        name: binding.name,
        outputKind: binding.outputKind,
        reason: 'unbound',
        required: binding.required,
        detail: binding.name,
      });
      continue;
    }

    const node = toNode(binding.name, raw);

    switch (binding.outputKind) {
      case 'scalar': {
        const result = evaluate(node, {});
        if (result.ok) {
          store.setParam(binding.name, result.value, 'external');
          applied.push({ name: binding.name, outputKind: 'scalar', value: result.value });
        } else {
          skipped.push({
            name: binding.name,
            outputKind: 'scalar',
            reason: mapStatus(result.status),
            required: binding.required,
            detail: result.detail?.reason ?? result.detail?.variable,
          });
        }
        break;
      }
      case 'matrix': {
        const result = evaluateMatrix(node, {});
        if (result.ok) {
          const value: MatrixValue = result.value;
          store.setBinding(binding.name, value);
          applied.push({ name: binding.name, outputKind: 'matrix', value });
        } else {
          store.clearBinding(binding.name);
          skipped.push({
            name: binding.name,
            outputKind: 'matrix',
            reason: mapStatus(result.status),
            required: binding.required,
            detail: result.detail?.reason ?? result.detail?.variable,
          });
        }
        break;
      }
      case 'complex': {
        const result = evaluateComplex(node, {});
        if (result.ok) {
          store.setBinding(binding.name, result.value);
          applied.push({ name: binding.name, outputKind: 'complex', value: result.value });
        } else {
          store.clearBinding(binding.name);
          skipped.push({
            name: binding.name,
            outputKind: 'complex',
            reason: mapStatus(result.status),
            required: binding.required,
            detail: result.detail?.reason ?? result.detail?.variable,
          });
        }
        break;
      }
      default: {
        const never: never = binding.outputKind;
        void never;
        skipped.push({
          name: binding.name,
          outputKind: binding.outputKind,
          reason: 'unsupported',
          required: binding.required,
          detail: String(binding.outputKind),
        });
      }
    }
  }

  return { applied, skipped };
}

/**
 * 호스트가 즉시값(number) 입력을 준 경우 트랜지언트 NumberNode 로 wrap.
 * AST 가 이미 들어오면 그대로 사용한다. wrap 노드는 evaluator 입력 전용이며
 * 편집기 / LaTeX 노드 카운터 공간과는 분리된 sentinel id 를 사용 (C1).
 */
function toNode(name: string, input: UserBindingInput): MathNode {
  if (typeof input === 'number') {
    const lit: NumberNode = {
      id: bridgeNodeId(`${name}#literal`),
      type: 'number',
      value: String(input),
    };
    return lit;
  }
  return input;
}

/** bridge 합성 노드 id — 편집기/LaTeX id 공간과 분리된 sentinel 네임스페이스 (C1). */
function bridgeNodeId(suffix: string): string {
  return `__bridge:userBinding:${suffix}`;
}

function mapStatus(status: EvalStatus): SkipReason {
  switch (status) {
    case 'unbound':
      return 'unbound';
    case 'domain':
      return 'domain';
    case 'divergent':
      return 'divergent';
    case 'unsupported':
      return 'unsupported';
    default: {
      const never: never = status;
      void never;
      return 'eval-failed';
    }
  }
}
