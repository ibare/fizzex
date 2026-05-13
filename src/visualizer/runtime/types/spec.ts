/**
 * 최상위 VisualizerSpec (설계 §2).
 *
 * 세 계층 합성:
 *   1. `catalog` 참조 → 수식 정체성·parameters·derivedValues
 *   2. spec 고유 → scenes · localFormulas · state · root · interaction · overlay
 *   3. `displayOptions` → 호스트 opt-in
 */

import type { ElementNode } from './element';
import type { I18nText } from './i18n';
import type { LocalFormula } from './formula';
import type { SceneSpec } from './scene';
import type { StateDecl, AnimationSpec } from './state';
import type { InteractionSpec } from './interaction';
import type { OverlaySpec } from './overlay';
import type { ViewportSpec } from './viewport';
import type { ThemeSpec } from './theme';
import type { DisplayOptionId } from './display-options';
import type { CameraSpec } from './camera';
import type { UserBindingSpec } from './user-binding';

export type RendererKind = '2d' | '3d';

export interface VisualizerSpec {
  $schema: `fizzex-visualizer/${string}`;
  id: string;
  /** `"<category>/<id>"` 슬래시 참조 (설계 §14.1). 버전 훅 금지. */
  catalog: string;
  name: I18nText;
  description: I18nText;
  renderer: RendererKind;

  displayOptions?: DisplayOptionId[];

  /**
   * 사용자 LaTeX 수식 변수 → 카탈로그 슬롯 매핑 (설계 §14.5, V1).
   * 각 항목은 scenes[].params 의 키 하나에 대응한다.
   */
  userBindings?: UserBindingSpec[];

  scenes: SceneSpec[];

  localFormulas?: LocalFormula[];

  state?: StateDecl[];

  animation?: AnimationSpec;

  viewports: Record<string, ViewportSpec>;

  /** renderer === '3d' 일 때 필수. §12.1 */
  camera?: CameraSpec;

  root: ElementNode;

  overlay?: OverlaySpec;

  interaction?: InteractionSpec;

  theme?: ThemeSpec;
}
