/** Configuración pública (segura para el cliente). */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Sin Supabase configurado la app usa un catálogo de ejemplo y los "Voy" se quedan en el navegador. */
export const HAS_BACKEND = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "PLANEA";

/** Máximo de sitios que un mismo dispositivo puede marcar por noche (lo aplica también la base de datos). */
export const MAX_GOING_PER_NIGHT = 8;
