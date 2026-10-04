"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { placeHref } from "@/lib/slug";
import type { Place } from "@/lib/types";
import { useGoingMap } from "../GoingProvider";

const PlacesMap = dynamic(() => import("./PlacesMap"), { ssr: false, loading: () => <div className="skeleton absolute inset-0" /> });

/** Mapa pequeño de la ficha: el sitio y lo que tiene alrededor. */
export function PlaceMap({ place, nearby }: { place: Place; nearby: Place[] }) {
  const router = useRouter();
  const going = useGoingMap();
  const all = useMemo(() => [place, ...nearby], [place, nearby]);
  const points = useMemo(
    () => all.map((p) => ({ id: p.id, city: p.city, name: p.name, kind: p.kind, lat: p.lat, lng: p.lng, top: p.top, going: going[p.id]?.total ?? 0 })),
    [all, going],
  );
  return (
    <PlacesMap
      points={points}
      center={[place.lat, place.lng]}
      zoom={16}
      selected={place.id}
      onSelect={(id) => {
        const p = all.find((x) => x.id === id);
        if (p && p.id !== place.id) router.push(placeHref(p));
      }}
    />
  );
}
