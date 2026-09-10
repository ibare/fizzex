/**
 * 로케일 레지스트리
 *
 * fizzex 는 열 개 언어를 지원하지만 **번들에는 한 언어도 싣지 않는다.**
 * 로케일 하나가 570KB 이고 열 개면 5.7MB 다 — 영어만 쓰는 호스트가 물 비용이 아니다.
 *
 * 대신 `loadLocale('ja')` 가 동적 import 로 그 언어만 가져온다. 경로가 템플릿이라
 * 번들러는 열 개를 각각 청크로 쪼개고 실행 시 하나만 내려받는다.
 *
 * ## 미로드 상태
 *
 * `getSemanticTexts()` 같은 조회는 **동기**다. 비동기 로딩과 어긋나므로,
 * 아직 아무 언어도 등록되지 않았으면 빈 텍스트를 낸다 — 설명이 비거나
 * 영문 식별자가 나오지만 크래시하지 않는다. React 호스트는
 * `<FizzexI18nProvider locale="ja">` 가 알아서 부르므로 이 상태를 겪지 않고,
 * headless 호스트만 직접 `await loadLocale(...)` 을 부르면 된다.
 */

import type { LocaleBundle, Locale } from './types.js';
import { DEFAULT_LOCALE, isLocale } from './types.js';

/**
 * 언어별 내려받기.
 *
 * 템플릿 경로(`import(\`./bundles/${locale}.js\`)`)로 적으면 번들러가 해석하지 못한다 —
 * 소스는 `.ts` 인데 TypeScript 는 `.js` 확장자를 요구해서 glob 이 어긋난다.
 * 하나씩 적으면 번들러가 열 개를 각각 청크로 만들고, 실행 시 부른 하나만 내려받는다.
 * `import()` 이므로 이 표가 있어도 번들에 언어가 실리지 않는다.
 */
const LOADERS: Record<Locale, () => Promise<{ default: LocaleBundle }>> = {
  ko: () => import('./bundles/ko.js'),
  en: () => import('./bundles/en.js'),
  ja: () => import('./bundles/ja.js'),
  zh: () => import('./bundles/zh.js'),
  ar: () => import('./bundles/ar.js'),
  es: () => import('./bundles/es.js'),
  fr: () => import('./bundles/fr.js'),
  hi: () => import('./bundles/hi.js'),
  id: () => import('./bundles/id.js'),
  pt: () => import('./bundles/pt.js'),
};

const bundles = new Map<Locale, LocaleBundle>();

let current: Locale = DEFAULT_LOCALE;

/** 미로드 경고는 한 번만 낸다 — 매 노드마다 부르는 경로가 있다 */
let warned = false;

/** 같은 언어를 두 번 부르지 않는다 */
const inFlight = new Map<Locale, Promise<void>>();

/**
 * 이미 손에 든 번들을 등록한다.
 *
 * 번들을 직접 import 해 온 호스트(빌드 시점에 언어가 정해진 경우)를 위한 문이다.
 * 언어를 고르게 하려면 `loadLocale` 을 쓴다.
 */
export function registerLocale(bundle: LocaleBundle): void {
  bundles.set(bundle.locale, bundle);
}

/**
 * 언어를 내려받아 등록한다.
 *
 * 이미 등록돼 있으면 아무것도 하지 않는다. 같은 언어를 동시에 여러 번 불러도
 * 내려받기는 한 번이다.
 */
export async function loadLocale(locale: Locale): Promise<void> {
  if (bundles.has(locale)) return;

  const pending = inFlight.get(locale);
  if (pending) return pending;

  const task = (async (): Promise<void> => {
    const mod = await LOADERS[locale]();
    registerLocale(mod.default);
  })().finally(() => {
    inFlight.delete(locale);
  });

  inFlight.set(locale, task);
  return task;
}

/**
 * 앞으로 쓸 언어를 정한다.
 *
 * 데이터를 내려받지는 않는다 — `loadLocale` 과 짝지어 쓴다.
 * 지원하지 않는 코드는 무시하고 기본 언어를 유지한다.
 */
export function setLocale(locale: string): void {
  if (!isLocale(locale)) return;
  current = locale;
}

/** 지금 쓰는 언어 */
export function getLocale(): Locale {
  return current;
}

/** 내려받아 둔 언어들 */
export function getLoadedLocales(): Locale[] {
  return [...bundles.keys()];
}

/**
 * 등록된 번들을 꺼낸다. 없으면 null.
 *
 * 요청한 언어가 없으면 기본 언어로 물러선다 — 한 언어만 받아 둔 호스트가
 * 다른 언어를 요청해도 화면이 비지 않게 한다.
 */
export function getBundle(locale: Locale = current): LocaleBundle | null {
  const found = peekBundle(locale);
  if (found) return found;

  if (!warned) {
    warned = true;
    console.warn(
      `[fizzex] No locale is loaded, so descriptions will be empty. ` +
        `Call await loadLocale('${locale}') before rendering, ` +
        `or wrap your tree in <FizzexI18nProvider locale="${locale}">.`
    );
  }
  return null;
}

/**
 * 등록된 번들을 조용히 꺼낸다 — 없어도 경고하지 않는다.
 *
 * UI 문구처럼 **자체 기본값이 있는** 소비처를 위한 문이다. 그쪽은 언어가 없어도
 * 영어로 멀쩡히 동작하므로, 경고를 내면 실제 문제(설명이 비는 것)와 섞여 묻힌다.
 */
export function peekBundle(locale: Locale = current): LocaleBundle | null {
  return bundles.get(locale) ?? bundles.get(DEFAULT_LOCALE) ?? null;
}

/** 테스트가 상태를 되돌릴 때 쓴다 */
export function resetLocales(): void {
  bundles.clear();
  inFlight.clear();
  current = DEFAULT_LOCALE;
  warned = false;
}
