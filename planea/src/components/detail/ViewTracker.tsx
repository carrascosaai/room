"use client";

import { useEffect } from "react";
import { useApp } from "@/components/providers/AppProvider";
import type { TargetRef } from "@/lib/types";

/** Cuenta una visita anónima (alimenta el ranking de tendencias). */
export function ViewTracker({ target }: { target: TargetRef }) {
  const { backend } = useApp();
  useEffect(() => backend.trackView(target), [backend, target.type, target.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
