/**
 * 편집 모드 기준 스냅샷 (설계 §13.1).
 *
 * 현재 활성 Scene의 `params` 프리셋을 1순위, 카탈로그 `parameterConfig.default`를 보완으로 머지한다.
 * formulas는 카탈로그가 파생값을 제공하는 대로 그대로 보존한다 (§14.1 · §13.1).
 *
 * 호출부는 Scene 전환·파라미터 편집 시점에 새 스냅샷을 만들어 RenderContext에 `baseline` 네임스페이스로 주입한다.
 */

export interface BaselineSnapshot {
  params: Record<string, number>;
  formulas: Record<string, unknown>;
}

export function createBaselineSnapshot(
  sceneParamsPreset: Readonly<Record<string, number>>,
  catalogDefaults: Readonly<Record<string, number>>,
  catalogFormulas: Readonly<Record<string, unknown>>,
): BaselineSnapshot {
  return {
    params: { ...catalogDefaults, ...sceneParamsPreset },
    formulas: { ...catalogFormulas },
  };
}
