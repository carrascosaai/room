"use client";

import { Sheet } from "@/components/ui/Sheet";
import { AuthForm } from "./AuthForm";

/** Se abre cuando alguien sin sesión intenta interactuar. Explorar nunca requiere cuenta. */
export function AuthSheet({ reason, onClose, onDone }: { reason: string | null; onClose: () => void; onDone: () => void }) {
  return (
    <Sheet open={reason !== null} onClose={onClose} title={reason ?? ""}>
      <p className="-mt-2 mb-5 text-sm text-muted">Es gratis y tardas 20 segundos. Nadie verá nunca tu ubicación.</p>
      <AuthForm onDone={onDone} />
    </Sheet>
  );
}
