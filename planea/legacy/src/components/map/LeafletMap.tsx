"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { TILES } from "@/lib/map";

export interface MapMarker {
  key: string;
  lat: number;
  lng: number;
  emoji: string;
  live: boolean;
  hot: boolean;
  label: string;
}

function iconFor(m: MapMarker, selected: boolean) {
  const size = selected ? 52 : 40;
  const ring = selected ? "#c8ff3d" : m.hot ? "#ff4d7e" : m.live ? "#3dffa0" : "rgba(255,255,255,0.25)";
  return L.divIcon({
    className: "planea-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:#15151c;border:2.5px solid ${ring};display:grid;place-items:center;font-size:${size * 0.48}px;box-shadow:0 6px 20px rgba(0,0,0,.55)${m.live || selected ? `,0 0 0 4px ${ring}33` : ""};transition:all .2s">${m.emoji}</div>`,
  });
}

export default function LeafletMap({
  center,
  markers,
  selected,
  onSelect,
  user,
}: {
  center: { lat: number; lng: number };
  markers: MapMarker[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  user: { lat: number; lng: number } | null;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const userLayer = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([center.lat, center.lng], 14);
    L.tileLayer(TILES.url, { attribution: TILES.attribution, tileSize: TILES.tileSize, zoomOffset: TILES.zoomOffset, maxZoom: 19, detectRetina: false }).addTo(m);
    m.on("click", () => onSelectRef.current(null));
    layer.current = L.layerGroup().addTo(m);
    userLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, [center.lat, center.lng]);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    for (const mk of markers) {
      const marker = L.marker([mk.lat, mk.lng], { icon: iconFor(mk, mk.key === selected), title: mk.label, zIndexOffset: mk.key === selected ? 1000 : mk.live ? 100 : 0, keyboard: true });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current(mk.key);
      });
      marker.addTo(g);
    }
  }, [markers, selected]);

  useEffect(() => {
    const m = map.current;
    const sel = markers.find((x) => x.key === selected);
    if (m && sel) m.panTo([sel.lat - 0.002, sel.lng], { animate: true });
  }, [selected, markers]);

  useEffect(() => {
    const g = userLayer.current;
    if (!g) return;
    g.clearLayers();
    if (user) {
      L.circleMarker([user.lat, user.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#5ce1e6", fillOpacity: 1 }).addTo(g);
      map.current?.panTo([user.lat, user.lng]);
    }
  }, [user]);

  return <div ref={el} className="absolute inset-0" aria-label="Mapa" />;
}
