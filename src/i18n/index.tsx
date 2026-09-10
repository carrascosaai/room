"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import en from "./en.json";
import es from "./es.json";
import type { Lang, Localized } from "@/game/types";

type Dict = typeof en;

const DICTS: Record<Lang, Dict> = { en, es: es as Dict };

const STORAGE_KEY = "room.lang";

export function detectDefaultLang(): Lang {
  if (typeof navigator !== "undefined") {
    const n = navigator.language?.toLowerCase() ?? "";
    if (n.startsWith("es")) return "es";
  }
  return "en";
}

function lookup(dict: Dict, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** resolve a Localized object from game content to the active language */
  loc: (l: Localized | undefined) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang ?? "en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === "en" || stored === "es") {
        setLangState(stored);
        return;
      }
    } catch {
      /* ignore */
    }
    setLangState(detectDefaultLang());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    try {
      document.documentElement.lang = l;
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict = DICTS[lang];
      const fallback = DICTS.en;
      const raw = lookup(dict, key) ?? lookup(fallback, key) ?? key;
      return interpolate(raw, params);
    },
    [lang],
  );

  const loc = useCallback(
    (l: Localized | undefined) => {
      if (!l) return "";
      return l[lang] ?? l.en ?? "";
    },
    [lang],
  );

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t, loc }), [lang, setLang, t, loc]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
