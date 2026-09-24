// Idioma de la interfaz: español, inglés o francés según el navegador de quien
// entra (se puede cambiar a mano). Los textos se escriben en español en el
// código y se traducen con t("…"); en.ts y fr.ts tienen las traducciones.
import { useSyncExternalStore } from "react";
import { EN } from "./en";
import { FR } from "./fr";

export type UiLang = "es" | "en" | "fr";
export const UI_LANGS: { id: UiLang; label: string }[] = [
  { id: "es", label: "Español" },
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
];

const KEY = "craic:ui";
const DICTS: Record<UiLang, Record<string, string> | null> = { es: null, en: EN, fr: FR };

/** El primer idioma del navegador que tengamos; si no, inglés. */
export function detectUiLang(langs: readonly string[] = typeof navigator !== "undefined" ? (navigator.languages ?? [navigator.language]) : []): UiLang {
  for (const l of langs) {
    const b = (l ?? "").slice(0, 2).toLowerCase();
    if (b === "es" || b === "en" || b === "fr") return b;
  }
  return "en";
}

function initial(): UiLang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "es" || saved === "en" || saved === "fr") return saved;
  } catch {
    /* sin almacenamiento */
  }
  return detectUiLang();
}

let current: UiLang = typeof window !== "undefined" ? initial() : "es";
const listeners = new Set<() => void>();

function apply() {
  if (typeof document !== "undefined") document.documentElement.lang = current;
}
apply();

export function getUiLang(): UiLang {
  return current;
}

export function setUiLang(l: UiLang) {
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* nada */
  }
  apply();
  listeners.forEach((f) => f());
}

export function useUiLang(): UiLang {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => current,
    () => current,
  );
}

/** Traduce un texto escrito en español. {nombre} se sustituye por vars.nombre. */
export function t(s: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[current];
  let out = (dict && dict[s]) || s;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Locale para fechas y números. */
export const locale = () => ({ es: "es-ES", en: "en-GB", fr: "fr-FR" })[current];

/** Etiqueta visible de un tipo de error (los tipos se guardan en español). */
export function typeLabel(type: string): string {
  return t(type === "español" ? "palabra en tu idioma" : type);
}
