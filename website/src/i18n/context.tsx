import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadLocale, setLocale } from 'fizzex';
import type { Dictionary, Lang } from './types';
import { en } from './en';
import { ko } from './ko';

const dicts: Record<Lang, Dictionary> = { en, ko };

interface LangContextValue {
  lang: Lang;
  t: Dictionary;
}

const LangContext = createContext<LangContextValue>({ lang: 'en', t: en });

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  // fizzex 의 설명 데이터는 번들에 없다. 사이트 언어에 맞춰 받아 둬야
  // 수식 탐색 패널의 역할·설명이 채워진다 — 받기 전에는 비어 나온다.
  const [, bumpLocale] = useState(0);
  useEffect(() => {
    let alive = true;
    setLocale(lang);
    void loadLocale(lang).then(() => {
      if (alive) bumpLocale((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [lang]);

  const value = useMemo(() => ({ lang, t: dicts[lang] ?? en }), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
