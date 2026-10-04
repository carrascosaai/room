import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AuthPage } from "@/components/auth/AuthPage";
import { CITY_COOKIE, getCity } from "@/lib/cities";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const city = (await cookies()).get(CITY_COOKIE)?.value;
  // Solo rutas internas: evita redirecciones abiertas.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/perfil";
  return <AuthPage mode="register" next={safeNext} defaultCity={city && getCity(city) ? city : undefined} />;
}
