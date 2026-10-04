"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { AuthForm } from "./AuthForm";

export function AuthPage({ mode, next, defaultCity }: { mode: "login" | "register"; next: string; defaultCity?: string }) {
  const { profile } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (profile) router.replace(next);
  }, [profile, next, router]);
  return (
    <main className="mx-auto max-w-md px-4 pt-8 lg:pt-14">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{mode === "login" ? "Hola de nuevo" : "Únete a PLANEA"}</h1>
      <p className="mb-6 mt-1 text-muted">{mode === "login" ? "Entra para apuntarte, votar y entrar en el salseo." : "Gratis. Explorar no necesita cuenta; interactuar, sí."}</p>
      <AuthForm initialMode={mode} next={next} defaultCity={defaultCity} onDone={() => router.replace(next)} />
    </main>
  );
}
