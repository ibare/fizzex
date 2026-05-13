/**
 * User Binding Bridge — 사용자 LaTeX 변수 값을 visualizer state 로 흘리는 일급 경로 (설계 통합 V2).
 *
 * 책임 분리:
 *   - 사용자 수식 평가: `evaluator` (단일 진리)
 *   - 시각화 런타임 DSL: jsep (`expr/*`)
 *
 * bridge 는 spec.userBindings 의 각 항목에 대해 evaluator 의 `evaluate` 를 호출하고
 * 결과를 `store.setParam(name, value, 'external')` 로 단방향 주입한다. AST 변이는 없다.
 *
 * V2 는 `outputKind === 'scalar'` 만 처리한다. `matrix`/`complex` 는 V3 에서 dispatch 확장.
 */

import { evaluate } from '../../evaluator';
import type { Bindings, EvalStatus } from '../../evaluator';
import type { VariableNode } from '../../types';
import type { VisualizerSpec } from './types/spec';
import type { StateStore } from './state';

export interface AppliedBinding {
  name: string;
  value: number;
}

export type SkipReason =
  | 'unsupported-output-kind'
  | 'unbound'
  | 'domain'
  | 'divergent'
  | 'unsupported'
  | 'eval-failed';

export interface SkippedBinding {
  name: string;
  reason: SkipReason;
  required: boolean;
  detail?: string;
}

export interface ApplyUserBindingsResult {
  applied: AppliedBinding[];
  skipped: SkippedBinding[];
}

/**
 * spec.userBindings 의 각 binding 을 evaluator 로 평가하고 store 에 주입한다.
 *
 * - `required: true` binding 이 unbound 면 skipped 에 기록 (silent — V5 에서 invalid 시각화 연결)
 * - `required: false` 면 silent skip
 * - 카탈로그/scene 기본값은 store 가 이미 보유 — 주입 실패 시 그 값이 유지된다
 */
export function applyUserBindings(
  spec: VisualizerSpec,
  bindings: Bindings,
  store: StateStore,
): ApplyUserBindingsResult {
  const applied: AppliedBinding[] = [];
  const skipped: SkippedBinding[] = [];
  const userBindings = spec.userBindings ?? [];

  for (const binding of userBindings) {
    if (binding.outputKind !== 'scalar') {
      skipped.push({
        name: binding.name,
        reason: 'unsupported-output-kind',
        required: binding.required,
        detail: binding.outputKind,
      });
      continue;
    }

    const node: VariableNode = {
      id: bridgeNodeId(binding.name),
      type: 'variable',
      name: binding.name,
    };
    const result = evaluate(node, bindings);

    if (result.ok) {
      store.setParam(binding.name, result.value, 'external');
      applied.push({ name: binding.name, value: result.value });
      continue;
    }

    skipped.push({
      name: binding.name,
      reason: mapStatus(result.status),
      required: binding.required,
      detail: result.detail?.reason ?? result.detail?.variable,
    });
  }

  return { applied, skipped };
}

/** bridge 합성 노드 id — 편집기/LaTeX id 공간과 분리된 sentinel 네임스페이스 (C1). */
function bridgeNodeId(name: string): string {
  return `__bridge:userBinding:${name}`;
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
