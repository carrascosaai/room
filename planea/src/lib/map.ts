import { MAPBOX_TOKEN } from "./config";

export type BaseStyle = "calles" | "oscuro" | "satelite";

export interface TileDef {
  url: string;
  attribution: string;
  tileSize: number;
  zoomOffset: number;
  maxNativeZoom: number;
  /** Capa de nombres de calles encima (para el satélite). */
  labels?: string;
}

const OSM = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const CARTO = `${OSM} © <a href="https://carto.com/attributions">CARTO</a>`;

/**
 * Estilos de mapa. Por defecto "Calles" (CARTO Voyager): claro, con nombres de calles,
 * plazas y números de portal bien legibles. Sin coste y con atribución.
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
      : {
          url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          attribution: CARTO,
          tileSize: 256,
          zoomOffset: 0,
          maxNativeZoom: 20,
        },
  },
  oscuro: {
    label: "Oscuro",
    tiles: MAPBOX_TOKEN
      ? {
          url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
          attribution: `© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> ${OSM}`,
          tileSize: 512,
          zoomOffset: -1,
          maxNativeZoom: 22,
        }
      : {
          url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          attribution: CARTO,
          tileSize: 256,
          zoomOffset: 0,
          maxNativeZoom: 20,
        },
  },
  satelite: {
    label: "Satélite",
    tiles: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: `Imágenes © Esri, Maxar, Earthstar Geographics · ${CARTO}`,
      tileSize: 256,
      zoomOffset: 0,
      maxNativeZoom: 19,
      labels: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
    },
  },
};

export const DEFAULT_STYLE: BaseStyle = "calles";
export const STYLE_KEY = "planea:map-style";
