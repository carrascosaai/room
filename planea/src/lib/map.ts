import { MAPBOX_TOKEN } from "./config";

/**
 * Proveedor de teselas. Sin token: CARTO "Dark Matter" sobre OpenStreetMap (gratuito,
 * con atribución, apto para tráfico moderado). Con NEXT_PUBLIC_MAPBOX_TOKEN: Mapbox.
 * Para Google Maps bastaría con sustituir LeafletMap por un componente equivalente.
 */
export const TILES = MAPBOX_TOKEN
  ? {
      url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
      attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      tileSize: 512,
      zoomOffset: -1,
    }
  : {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      tileSize: 256,
      zoomOffset: 0,
    };
