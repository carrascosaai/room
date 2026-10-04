export type Kind = "discoteca" | "bar" | "sala" | "zona";

export interface City {
  slug: string;
  name: string;
  region: string | null;
  lat: number;
  lng: number;
  /** Número de sitios de la ciudad. */
  n: number;
  /** Ciudad con selección investigada a mano (zonas de ambiente y recomendados). */
  curated: boolean;
}

export interface Place {
  id: string;
  city: string;
  name: string;
  kind: Kind;
  lat: number;
  lng: number;
  address: string | null;
  /** Resumen de opiniones y redes sociales. */
  note: string | null;
  /** Recomendado según la investigación (opiniones, TikTok, rankings). */
  top: boolean;
  website: string | null;
}

/** Recuento de "Voy" de esta noche para un sitio. */
export interface Going {
  total: number;
  names: string[];
}

export type GoingMap = Record<string, Going>;

export interface SpainGoingRow {
  venue_id: string;
  city: string;
  total: number;
  name: string | null;
  kind: Kind | null;
  city_name: string | null;
}
