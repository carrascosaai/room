import { IS_DEMO } from "@/lib/config";

/** Aviso permanente y discreto mientras la app use datos de ejemplo. */
export function DemoBanner() {
  if (!IS_DEMO) return null;
  return (
    <div className="border-b border-line bg-surface/60 px-4 py-1.5 text-center text-[11px] text-dim">
      Versión demo · locales, eventos y opiniones son <strong className="text-muted">ficticios</strong>
    </div>
  );
}
