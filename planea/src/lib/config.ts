/** Configuración pública (segura para el cliente). */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Sin Supabase configurado la app funciona en modo demo. */
export const IS_DEMO = !(SUPABASE_URL && SUPABASE_ANON_KEY);

export const GOOGLE_AUTH_ENABLED = !IS_DEMO && process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1";

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "PLANEA";
