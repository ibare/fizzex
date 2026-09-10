/**
 * 첨자 노드의 슬롯 → 의미 어휘 매핑.
 *
 * 노드 모델에서 거듭제곱(power)과 아래첨자(subscript)는 하나의 `scripts` 노드로 합쳐졌지만,
 * 의미 계층의 어휘는 그대로 둔다. 이유는 **카탈로그 데이터와 그 검증 자산을 보존하기 위해서**다 —
 * `data/catalog/index.json` 의 시그니처 토큰 127건, `data/layer1/ko.json` 의 역할 텍스트,
 * `data/layer2/ko.json` 의 경로 규칙이 전부 옛 이름을 키로 쓴다.
 *
 * 이것이 shim 이 아닌 이유: 여기서 나가는 `'power'` 는 `MathNode` 로 되돌아가지 않는다.
 * `Layer1RuleDef.parentType`, layer2 경로 키, 카탈로그 시그니처 토큰이라는 별도 네임스페이스의
 * **값**이고, 그 네임스페이스는 자기 계약(catalog-matcher.test.ts, precision 래칫)으로 검증된다.
 * 노드 타입 유니온에는 옛 이름으로 도달할 경로가 남지 않는다.
 *
 * 주의: 이 모듈은 `analyzer/semantic/` 안에서만 쓴다. `ast-walker` 나 `canonical/from-ast` 는
 * compute 클로저 안이라 여기를 import 하면 subpath-isolation 테스트가 깨진다.
 */

import type { ScriptSlot, ScriptsNode } from '../../types.js';

/** 의미 계층이 쓰는 (부모 종류, 자식 위치) 쌍 */
export interface ScriptRole {
  parentType: string;
  childPosition: string;
}

/**
 * 첨자 노드의 한 슬롯이 의미 계층에서 갖는 역할.
 *
 * 밑(base)은 어느 첨자가 붙었느냐에 따라 역할이 달라진다 — x^2 의 x 는 거듭제곱의 밑이고,
 * x_i 의 x 는 아래첨자의 밑이다.
 */
export function scriptRole(node: ScriptsNode, slot: ScriptSlot): ScriptRole {
  switch (slot) {
    case 'superscript':
      return { parentType: 'power', childPosition: 'exponent' };
    case 'subscript':
      return { parentType: 'subscript', childPosition: 'subscript' };
    case 'leftSuperscript':
      return { parentType: 'scripts', childPosition: 'leftSuperscript' };
    case 'leftSubscript':
      return { parentType: 'scripts', childPosition: 'leftSubscript' };
    case 'base':
      // 첨자가 중첩 구조였을 때 밑의 직접 부모는 안쪽, 즉 아래첨자였다
      // (x_i^2 는 power(subscript(x, i), 2) 였고 x 의 부모는 subscript).
      // 아래첨자를 우선해야 의미 어휘와 카탈로그 시그니처가 그대로 유지된다.
      return node.subscript
        ? { parentType: 'subscript', childPosition: 'base' }
        : { parentType: 'power', childPosition: 'base' };
  }
}

/** 첨자 노드가 의미 계층에서 내는 부모 종류들 (시그니처·카운트용) */
export function scriptParentTypes(node: ScriptsNode): string[] {
  const types: string[] = [];
  if (node.superscript) types.push('power');
  if (node.subscript) types.push('subscript');
  if (types.length === 0) types.push('scripts');
  return types;
}
