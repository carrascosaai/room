import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-5xl">🪩</p>
      <h1 className="mt-4 font-display text-3xl font-extrabold">Aquí no hay fiesta</h1>
      <p className="mt-2 text-muted">No encontramos esta página. Busca tu ciudad o mira el mapa.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="rounded-full bg-lime px-5 py-3 font-semibold text-lime-ink">Inicio</Link>
        <Link href="/mapa" className="rounded-full border border-line-strong px-5 py-3 font-semibold">Mapa</Link>
      </div>
    </main>
  );
}
