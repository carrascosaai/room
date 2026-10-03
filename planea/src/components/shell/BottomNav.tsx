"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Home, Map, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentCity } from "./useCurrentCity";

export function BottomNav() {
  const pathname = usePathname();
  const city = useCurrentCity();
  const items = [
    { href: `/${city}`, label: "Inicio", icon: Home, active: pathname === `/${city}` },
    { href: `/${city}/mapa`, label: "Mapa", icon: Map, active: pathname.endsWith("/mapa") },
    { href: "/crear", label: "Crear", icon: Plus, active: pathname === "/crear", primary: true },
    { href: `/${city}/tendencias`, label: "Tendencia", icon: Flame, active: pathname.endsWith("/tendencias") },
    { href: "/perfil", label: "Perfil", icon: User, active: pathname === "/perfil" || pathname === "/moderacion" },
  ];
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {items.map(({ href, label, icon: Icon, active, primary }) => (
          <li key={label} className="flex-1">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors active:scale-95",
                active ? "text-ink" : "text-dim hover:text-muted",
              )}
            >
              {primary ? (
                <span className="-mt-5 grid size-14 place-items-center rounded-full bg-lime text-lime-ink shadow-[0_8px_30px_-6px_rgba(200,255,61,0.55)] ring-4 ring-bg transition-transform active:scale-90">
                  <Icon size={26} strokeWidth={2.6} />
                </span>
              ) : (
                <Icon size={22} strokeWidth={active ? 2.4 : 1.9} className={active ? "text-lime" : undefined} />
              )}
              <span className={primary ? "sr-only" : undefined}>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
