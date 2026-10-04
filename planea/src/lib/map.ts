import { MAPBOX_TOKEN } from "./config";

export type BaseStyle = "calles" | "oscuro" | "satelite";

export interface TileDef {
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

/**
 * Estilos de mapa. Por defecto "Calles": el mapa estándar de OpenStreetMap (el mismo que
 * usa SEA Activity Intelligence), con todas las calles, nombres y portales.
 * "Oscuro" es ese mismo mapa con un filtro CSS. Sin claves de API.
 * Con NEXT_PUBLIC_MAPBOX_TOKEN se usan los estilos de Mapbox.
 */
export const BASE_STYLES: Record<BaseStyle, { label: string; tiles: TileDef }> = {
  calles: {
    label: "Calles",
    tiles: MAPBOX_TOKEN
      ? {
          url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
          attribution: `© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> ${OSM}`,
          tileSize: 512,
          zoomOffset: -1,
          maxNativeZoom: 22,
        }
      : { url: OSM_TILES, attribution: OSM, tileSize: 256, zoomOffset: 0, maxNativeZoom: 19 },
  },
  oscuro: {
    label: "Oscuro",
    tiles: { url: OSM_TILES, attribution: OSM, tileSize: 256, zoomOffset: 0, maxNativeZoom: 19, className: "map-tiles-dark" },
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
