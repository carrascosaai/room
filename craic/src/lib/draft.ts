import type { Msg } from "../conversation";

// Conversación en curso guardada tras cada turno: si el móvil cierra la
// pestaña, al volver se puede continuar donde se quedó.

export interface Draft {
  characterId: string;
  scenarioId: string;
  level: string;
  startedAt: number;
  updatedAt: number;
  messages: Msg[];
}

const KEY = "craic:draft";
const MAX_AGE = 24 * 60 * 60 * 1000;

export function saveDraft(d: Draft) {
  try {
    const messages = d.messages
      .filter((m) => m.text && !m.streaming)
      .map((m) => ({ ...m, correctionState: m.correctionState === "pending" ? ("error" as const) : m.correctionState }));
    localStorage.setItem(KEY, JSON.stringify({ ...d, messages }));
  } catch {
    /* sin almacenamiento */
  }
}

export function loadDraft(): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? "null") as Draft | null;
    if (!d || !Array.isArray(d.messages) || Date.now() - d.updatedAt > MAX_AGE) return null;
    if (!d.messages.some((m) => m.role === "user")) return null;
    return d;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada */
  }
}
