/**
 * 최상위 VisualizerSpec (설계 §2).
 *
 * 세 계층 합성:
 *   1. `catalog` 참조 → 수식 정체성·parameters·derivedValues
 *   2. spec 고유 → scenes · localFormulas · state · root · interaction · overlay
 *   3. `displayOptions` → 호스트 opt-in
 */

import type { ElementNode } from './element.js';
import type { I18nText } from './i18n.js';
import type { LocalFormula } from './formula.js';
import type { SceneSpec } from './scene.js';
import type { StateDecl, AnimationSpec } from './state.js';
import type { InteractionSpec } from './interaction.js';
import type { OverlaySpec } from './overlay.js';
import type { ViewportSpec } from './viewport.js';
import type { ThemeSpec } from './theme.js';
import type { DisplayOptionId } from './display-options.js';
import type { CameraSpec } from './camera.js';
import type { UserBindingSpec } from './user-binding.js';
import type { DerivativeSpec } from './derivative.js';

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

  /**
   * 사용자 수식의 도함수 슬롯 (V4). bridge 가 `differentiateAt` 으로 평가해
   * StateStore 의 bindings 에 결과를 주입한다.
   */
  derivatives?: DerivativeSpec[];

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
