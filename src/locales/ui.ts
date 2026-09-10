/**
 * UI 문구 조회
 *
 * 의미 데이터(570KB)와 달리 UI 문구는 마흔 개 남짓이라 영어본만 번들에 싣는다.
 * 아무 언어도 내려받지 않은 호스트에서도 버튼과 힌트는 제대로 나와야 하기 때문이다
 * (`src/i18n/default-labels.ts` 가 영어 기본값을 두는 것과 같은 이유다).
 * 나머지 아홉 언어는 로케일 번들을 통해 들어온다.
 */

import type { UiTexts } from './types.js';
import { peekBundle } from './registry.js';
import enUi from './data/ui/en.json' with { type: 'json' };

const DEFAULT_UI = enUi as UiTexts;

/** 지금 언어의 UI 문구. 내려받은 것이 없으면 영어. */
export function getUiTexts(): UiTexts {
  return peekBundle()?.ui ?? DEFAULT_UI;
}

/**
 * 문구의 `{자리}` 를 값으로 채운다.
 *
 * 값이 없는 자리는 그대로 둔다 — 번역이 자리 이름을 잘못 적었을 때
 * 빈칸이 되어 사라지는 것보다 눈에 띄는 편이 낫다.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole
  );
}
