"use client";

import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { REPORT_REASONS } from "@/lib/moderation";
import type { ReportReason, ReportTargetType } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
  preview: string;
}

export function ReportSheet({ target, onClose, onReported }: { target: ReportTarget | null; onClose: () => void; onReported: (id: string) => void }) {
  const { backend, toast } = useApp();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!target || !reason) return;
    setBusy(true);
    const res = await backend.report({ targetType: target.type, targetId: target.id, reason, details, preview: target.preview });
    setBusy(false);
    if (!res.ok) return toast({ message: res.error, tone: "error" });
    toast({ message: "Gracias. Lo hemos ocultado para ti y lo revisará moderación." });
    onReported(target.id);
    setReason(null);
    setDetails("");
    onClose();
  }

  return (
    <Sheet open={target !== null} onClose={onClose} title="Denunciar contenido">
      <p className="-mt-2 mb-4 text-sm text-muted">Tu denuncia es anónima. Con 3 denuncias, el contenido se oculta automáticamente hasta que moderación lo revise.</p>
      <div className="space-y-2" role="radiogroup">
        {REPORT_REASONS.map((r) => (
          <button
            key={r.id}
            role="radio"
            aria-checked={reason === r.id}
            onClick={() => setReason(r.id)}
            className={cn(
              "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors",
              reason === r.id ? "border-lime bg-lime/10" : "border-line bg-surface-2 hover:bg-surface-3",
            )}
          >
            <span className={cn("mt-0.5 size-4 shrink-0 rounded-full border-2", reason === r.id ? "border-lime bg-lime" : "border-dim")} />
            <span>
              <span className="block text-sm font-semibold">{r.label}</span>
              <span className="block text-xs text-muted">{r.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Detalles (opcional)"
        className="field mt-3 resize-none"
      />
      <Button className="mt-4 w-full" size="lg" variant="hot" disabled={!reason} loading={busy} onClick={() => void submit()}>
        Enviar denuncia
      </Button>
    </Sheet>
  );
}
