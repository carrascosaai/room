"use client";

import { useEffect, useRef, useState } from "react";
import { Ban, Flag, MoreHorizontal, Trash2 } from "lucide-react";

/** Menú ⋯ de cualquier contenido: denunciar, bloquear, borrar el propio. */
export function ContentMenu({
  isMine,
  onReport,
  onBlock,
  onDelete,
}: {
  isMine?: boolean;
  onReport: () => void;
  onBlock?: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);
  const item = "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-surface-3";
  return (
    <div ref={ref} className="relative">
      <button aria-label="Más opciones" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="grid size-8 place-items-center rounded-full text-dim hover:bg-surface-2 hover:text-ink">
        <MoreHorizontal size={18} />
      </button>
      {open ? (
        <div className="absolute right-0 top-9 z-20 w-52 animate-fade-in overflow-hidden rounded-2xl border border-line-strong bg-surface-2 py-1 shadow-2xl shadow-black/60">
          {isMine && onDelete ? (
            <button className={`${item} text-danger`} onClick={() => (setOpen(false), onDelete())}>
              <Trash2 size={16} /> Eliminar
            </button>
          ) : (
            <>
              <button className={item} onClick={() => (setOpen(false), onReport())}>
                <Flag size={16} /> Denunciar
              </button>
              {onBlock ? (
                <button className={item} onClick={() => (setOpen(false), onBlock())}>
                  <Ban size={16} /> Bloquear al autor
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
