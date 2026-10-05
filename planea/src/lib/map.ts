export type BaseStyle = "calles" | "oscuro" | "satelite";

export interface TileDef {
  /** Estilo vectorial (MapLibre). Si existe, se usa en lugar de `url`. */
  vector?: string;
  url: string;
  attribution: string;
  tileSize: number;
  zoomOffset: number;
  maxNativeZoom: number;
  /** Capas de calles y nombres encima (para el satélite). */
  labels?: string[];
  /** Clase CSS de las teselas (p. ej. el filtro del modo oscuro). */
  className?: string;
}

const OSM = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
/** OpenFreeMap: mapas de OpenStreetMap gratis, sin clave ni límite de visitas. */
const OFM = "https://tiles.openfreemap.org/styles";
const OFM_ATTR = `<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> ${OSM}`;

/**
 * Estilos de mapa. "Calles" y "Oscuro" son mapas vectoriales de OpenFreeMap (datos de
 * OpenStreetMap): nítidos en el móvil, con todas las calles y nombres, gratis, sin clave
 * de API y sin límite de visitas. "Satélite" son fotos de Esri con calles encima.
 */
export const BASE_STYLES: Record<BaseStyle, { label: string; tiles: TileDef }> = {
  calles: {
    label: "Calles",
    tiles: { vector: `${OFM}/liberty`, url: OSM_TILES, attribution: OFM_ATTR, tileSize: 256, zoomOffset: 0, maxNativeZoom: 19 },
  },
  oscuro: {
    label: "Oscuro",
    tiles: { vector: `${OFM}/dark`, url: OSM_TILES, attribution: OFM_ATTR, tileSize: 256, zoomOffset: 0, maxNativeZoom: 19 },
  },
  satelite: {
    label: "Satélite",
    tiles: {
      url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
      attribution: "Imágenes © Esri, Maxar, Earthstar Geographics",
      tileSize: 256,
      zoomOffset: 0,
      maxNativeZoom: 19,
      labels: [`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`, `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`],
    },
  },
};

export const DEFAULT_STYLE: BaseStyle = "calles";
export const STYLE_KEY = "planea:map-style";
