"use client";

import { useSyncExternalStore } from "react";

/**
 * Ubicación del usuario: SOLO en memoria del dispositivo (sessionStorage).
 * Nunca se envía al servidor ni se comparte con nadie. Se usa para
 * calcular distancias y detectar la ciudad.
 */
export interface Coords {
  lat: number;
  lng: number;
}

const KEY = "planea.coords";
const listeners = new Set<() => void>();
let coords: Coords | null | undefined;

function load(): Coords | null {
  if (coords !== undefined) return coords;
  try {
    const raw = sessionStorage.getItem(KEY);
    coords = raw ? (JSON.parse(raw) as Coords) : null;
  } catch {
    coords = null;
  }
  return coords;
}

function set(c: Coords | null) {
  coords = c;
  try {
    if (c) sessionStorage.setItem(KEY, JSON.stringify(c));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento: queda en memoria */
  }
  listeners.forEach((l) => l());
}

export function useCoords(): Coords | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    load,
    () => null,
  );
}

export function requestCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Tu navegador no permite obtener la ubicación."));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Redondeamos (~100 m): suficiente para distancias, menos preciso = más privado.
        const c = { lat: +pos.coords.latitude.toFixed(3), lng: +pos.coords.longitude.toFixed(3) };
        set(c);
        resolve(c);
      },
      (err) =>
        reject(
          new Error(err.code === err.PERMISSION_DENIED ? "Has denegado el permiso de ubicación." : "No hemos podido obtener tu ubicación."),
        ),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  });
}
