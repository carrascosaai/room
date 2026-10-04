import Link from "next/link";
import { LogoMark } from "@/components/shell/Logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <LogoMark size={48} className="mx-auto" />
        <h1 className="mt-6 font-display text-4xl font-extrabold">Aquí no hay plan</h1>
        <p className="mt-2 text-muted">La página que buscas no existe o ya ha terminado.</p>
        <Link href="/ciudades" className="mt-6 inline-flex h-12 items-center rounded-full bg-lime px-6 font-semibold text-lime-ink">
          Ver qué hay hoy
        </Link>
      </div>
    </main>
  );
}
