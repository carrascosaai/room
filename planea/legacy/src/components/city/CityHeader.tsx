"use client";

import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Avatar } from "@/components/ui/Avatar";
import { LogoMark } from "@/components/shell/Logo";
import type { City } from "@/lib/types";

/** Cabecera móvil de la ciudad: cambiar ciudad, buscar y perfil. */
export function CityHeader({ city }: { city: City }) {
  const { profile } = useApp();
  return (
    <header className="sticky top-0 z-40 -mx-4 flex items-center gap-3 bg-bg/80 px-4 py-3 backdrop-blur-xl lg:hidden">
      <LogoMark size={30} />
      <Link href="/ciudades" className="flex min-w-0 items-center gap-1 rounded-full py-1 pr-2 font-display text-lg font-bold active:scale-95">
        <span className="truncate">{city.name}</span>
        <ChevronDown size={18} className="shrink-0 text-muted" />
      </Link>
      <span className="flex-1" />
      <Link href={`/${city.slug}/descubre`} aria-label="Descubre y busca" className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink">
        <Search size={19} />
      </Link>
      <Link href="/perfil" aria-label="Perfil" className="shrink-0">
        {profile ? <Avatar emoji={profile.avatarEmoji} color={profile.avatarColor} size={38} /> : <Avatar emoji="👤" size={38} />}
      </Link>
    </header>
  );
}
