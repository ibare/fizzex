import type { I18nText } from './i18n';

/**
 * Scene — spec이 소유. 같은 수식의 시각적 해석 묶음 (설계 §2.5).
 */
export interface SceneSpec {
  /** `scene.id`로 참조. Element 트리의 `match on scene.id`에서 분기 */
  id: string;
  name: I18nText;
  description?: I18nText;
  /** 테마·Element 트리에서 `scene.style.*`로 접근 */
  style?: SceneStyle;
  /** 카탈로그 파라미터의 Scene별 초깃값. 미지정 시 카탈로그 default */
  params?: Record<string, number>;
}

export interface SceneStyle {
  color?: string;
  icon?: string;
  [extra: string]: string | undefined;
}
