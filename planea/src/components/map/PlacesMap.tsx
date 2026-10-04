"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import { KINDS } from "@/lib/kinds";
import { TILES } from "@/lib/map";
import type { Kind } from "@/lib/types";

export interface MapPoint {
  id: string;
  city: string;
  name: string;
  kind: Kind;
  lat: number;
  lng: number;
  top: boolean;
  going: number;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function iconFor(p: MapPoint, selected: boolean) {
  const k = KINDS[p.kind];
  const size = selected ? 46 : p.top || p.going > 0 ? 36 : 28;
  const ring = selected ? "#ffffff" : p.going > 0 ? "#3dffa0" : k.color;
  const badge =
    p.going > 0
      ? `<span style="position:absolute;top:-6px;right:-8px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#3dffa0;color:#06130c;font:700 11px/18px Inter,sans-serif;text-align:center">${p.going}</span>`
      : "";
  return L.divIcon({
    className: "planea-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:9999px;background:#15151c;border:2.5px solid ${ring};display:grid;place-items:center;font-size:${Math.round(size * 0.5)}px;box-shadow:0 4px 14px rgba(0,0,0,.6)">${k.emoji}${badge}</div>`,
  });
}

function clusterIcon(cluster: L.MarkerCluster) {
  const n = cluster.getChildCount();
  const size = n < 10 ? 34 : n < 100 ? 42 : 52;
  return L.divIcon({
    className: "planea-marker",
    iconSize: [size, size],
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:rgba(200,255,61,.92);color:#10140a;display:grid;place-items:center;font:800 ${size < 40 ? 13 : 15}px Inter,sans-serif;box-shadow:0 0 0 6px rgba(200,255,61,.22),0 6px 18px rgba(0,0,0,.5)">${n}</div>`,
  });
}

export default function PlacesMap({
  points,
  center,
  zoom,
  fit,
  selected,
  onSelect,
}: {
  points: MapPoint[];
  center: [number, number];
  zoom: number;
  /** Ajustar el encuadre a los puntos al cargarlos. */
  fit?: boolean;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const cluster = useRef<L.MarkerClusterGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const fitted = useRef(false);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true, preferCanvas: true }).setView(center, zoom);
    L.tileLayer(TILES.url, { attribution: TILES.attribution, tileSize: TILES.tileSize, zoomOffset: TILES.zoomOffset, maxZoom: 19 }).addTo(m);
    m.on("click", () => onSelectRef.current(null));
    cluster.current = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      disableClusteringAtZoom: 16,
      iconCreateFunction: clusterIcon,
    }).addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      cluster.current = null;
    };
    // El mapa se crea una sola vez; el centro inicial no cambia después.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = cluster.current;
    const m = map.current;
    if (!g || !m) return;
    g.clearLayers();
    const markers = points.map((p) => {
      const marker = L.marker([p.lat, p.lng], {
        icon: iconFor(p, p.id === selected),
        title: p.name,
        zIndexOffset: p.id === selected ? 1000 : p.going > 0 ? 500 : p.top ? 100 : 0,
        keyboard: true,
      });
      marker.bindTooltip(escapeHtml(p.name), { direction: "top", offset: [0, -14] });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current(p.id);
      });
      return marker;
    });
    g.addLayers(markers);
    if (fit && !fitted.current && points.length > 0) {
      fitted.current = true;
      m.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])).pad(0.1), { maxZoom: 15 });
    }
  }, [points, selected, fit]);

  useEffect(() => {
    const m = map.current;
    const sel = points.find((p) => p.id === selected);
    if (m && sel) m.setView([sel.lat, sel.lng], Math.max(m.getZoom(), 16), { animate: true });
    // Solo al cambiar la selección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return <div ref={el} className="absolute inset-0" aria-label="Mapa de sitios" />;
}
