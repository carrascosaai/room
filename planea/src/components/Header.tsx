import Link from "next/link";
import { Map, MapPin } from "lucide-react";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-[900] border-b border-line bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Logo href="/" />
        <nav className="ml-auto flex items-center gap-1 text-sm font-medium">
          <Link href="/ciudades" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-muted hover:text-ink">
            <MapPin size={16} /> Ciudades
          </Link>
          <Link href="/mapa" className="inline-flex items-center gap-1.5 rounded-full bg-lime px-3.5 py-2 font-semibold text-lime-ink hover:bg-[#d6ff6a]">
            <Map size={16} /> Mapa
          </Link>
        </nav>
      </div>
    </header>
  );
}
