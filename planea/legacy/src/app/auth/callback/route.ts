import { NextResponse } from "next/server";
import { IS_DEMO } from "@/lib/config";
import { getServerSupabase } from "@/lib/supabase/server";

/** Vuelta de OAuth (Google) y de los emails de confirmación de Supabase. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/perfil";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/perfil";
  if (!IS_DEMO && code) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
