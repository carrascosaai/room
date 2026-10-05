"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { DEFAULT_CITY, getCity } from "@/lib/cities";
import { storedCity } from "@/lib/client/city";

/** Ciudad activa: la de la URL si la hay; si no, la última visitada. */
export function useCurrentCity(): string {
  const pathname = usePathname();
  const fromPath = pathname.split("/")[1] ?? "";
  const stored = useSyncExternalStore(
    () => () => {},
    () => storedCity(),
    () => null,
  );
  if (getCity(fromPath)) return fromPath;
  return stored && getCity(stored) ? stored : DEFAULT_CITY;
}
