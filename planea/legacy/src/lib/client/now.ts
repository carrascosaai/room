"use client";

import { useSyncExternalStore } from "react";

/** Hora actual redondeada al minuto, solo en cliente (null durante el render del servidor). */
function subscribe(cb: () => void) {
  const id = setInterval(cb, 30_000);
  return () => clearInterval(id);
}
const snapshot = () => Math.floor(Date.now() / 60_000);

export function useNowMinute(): Date | null {
  const m = useSyncExternalStore(subscribe, snapshot, () => null);
  return m === null ? null : new Date(m * 60_000);
}
