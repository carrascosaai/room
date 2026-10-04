"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** Hoja inferior en móvil, modal centrado en escritorio. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button aria-label="Cerrar" className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className={cn(
          "relative max-h-[92dvh] w-full animate-sheet-up overflow-y-auto rounded-t-[1.75rem] border border-line bg-surface px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 outline-none sm:max-w-md sm:animate-fade-up sm:rounded-[1.75rem] sm:pb-6",
          className,
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-4">
          {title ? <h2 className="font-display text-xl font-bold leading-tight">{title}</h2> : <span />}
          <button onClick={onClose} aria-label="Cerrar" className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
