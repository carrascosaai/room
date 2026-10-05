"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-extrabold">Algo ha fallado</h1>
      <p className="mt-2 text-muted">Inténtalo de nuevo en unos segundos.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-full bg-lime px-5 py-3 font-semibold text-lime-ink">
        Reintentar
      </button>
    </main>
  );
}
