"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Avatar } from "@/components/ui/Avatar";
import { getCity } from "@/lib/cities";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { useCurrentCity } from "./useCurrentCity";

export function DesktopHeader() {
  const pathname = usePathname();
  const city = useCurrentCity();
  const { profile } = useApp();
  const links = [
    { href: `/${city}`, label: "Inicio" },
    { href: `/${city}/descubre`, label: "Descubre" },
    { href: `/${city}/mapa`, label: "Mapa" },
    { href: `/${city}/tendencias`, label: "Tendencias" },
  ];
  return (
    <header className="sticky top-0 z-50 hidden border-b border-line bg-bg/80 backdrop-blur-xl lg:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
        <Logo href={`/${city}`} />
        <Link href="/ciudades" className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-ink">
          📍 {getCity(city)?.name}
        </Link>
        <nav className="flex flex-1 gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                pathname === l.href ? "bg-surface-2 text-ink" : "text-muted hover:text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/crear" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-lime px-4 text-sm font-semibold text-lime-ink hover:bg-[#d6ff6a]">
          <Plus size={18} strokeWidth={2.6} /> Crear plan
        </Link>
        <Link href="/perfil" aria-label="Perfil">
          {profile ? (
            <Avatar emoji={profile.avatarEmoji} color={profile.avatarColor} size={38} />
          ) : (
            <span className="text-sm font-medium text-muted hover:text-ink">Entrar</span>
          )}
        </Link>
      </div>
    </header>
  );
}
