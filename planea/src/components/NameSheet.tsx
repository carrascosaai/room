"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/** Pregunta (una sola vez) si la persona quiere aparecer con su nombre. Es opcional. */
export function NameSheet({
  placeName,
  initial,
  onConfirm,
  onClose,
}: {
  placeName: string;
  initial: string;
  onConfirm: (name: string | null) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-sheet-title"
        className="w-full max-w-md animate-sheet-up rounded-t-3xl border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(name.trim() || null);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="name-sheet-title" className="font-display text-xl font-bold">
            Vas a {placeName} 🎉
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-1 text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">
          ¿Quieres que salga tu nombre? Es opcional: si lo dejas vacío solo sumarás al contador. No pedimos email ni cuenta.
        </p>
        <label className="mt-4 block text-xs font-medium text-dim" htmlFor="going-name">
          Tu nombre o apodo (opcional)
        </label>
        <input
          id="going-name"
          ref={input}
          className="field mt-1"
          maxLength={24}
          autoComplete="nickname"
          placeholder="Ej.: Lucía"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onConfirm(null)} className="h-12 rounded-full border border-line-strong text-sm font-semibold text-ink hover:bg-surface-2">
            Voy sin nombre
          </button>
          <button type="submit" className="h-12 rounded-full bg-lime text-sm font-bold text-lime-ink hover:bg-[#d6ff6a]">
            {name.trim() ? `Voy como ${name.trim().slice(0, 12)}` : "Voy"}
          </button>
        </div>
      </form>
    </div>
  );
}
