"use client";

import { CITY_COOKIE } from "../cities";

/** Recuerda la última ciudad (cookie de preferencia, sin datos personales). */
export function rememberCity(slug: string) {
  document.cookie = `${CITY_COOKIE}=${slug}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  try {
    localStorage.setItem(CITY_COOKIE, slug);
  } catch {
    /* noop */
  }
}

export function storedCity(): string | null {
  try {
    return localStorage.getItem(CITY_COOKIE);
  } catch {
    return null;
  }
}
