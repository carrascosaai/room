"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div>
        <p className="text-5xl">🫠</p>
        <h1 className="mt-4 font-display text-3xl font-extrabold">Algo se ha torcido</h1>
        <p className="mt-2 text-muted">No es tu culpa. Prueba otra vez.</p>
        <button onClick={reset} className="mt-6 inline-flex h-12 items-center rounded-full bg-lime px-6 font-semibold text-lime-ink">
          Reintentar
        </button>
      </div>
    </main>
  );
}
