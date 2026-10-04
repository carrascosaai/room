"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { DEMO_MOD_EMAIL, DEMO_MOD_PASSWORD } from "@/lib/backend/demo";
import { CITIES, DEFAULT_CITY } from "@/lib/cities";
import { storedCity } from "@/lib/client/city";
import { GOOGLE_AUTH_ENABLED, IS_DEMO } from "@/lib/config";
import { fieldErrors, loginSchema, registerSchema } from "@/lib/validation";

export function AuthForm({
  initialMode = "register",
  next,
  defaultCity,
  onDone,
}: {
  initialMode?: "login" | "register";
  next?: string;
  defaultCity?: string;
  onDone?: () => void;
}) {
  const { backend, toast } = useApp();
  const [mode, setMode] = useState(initialMode);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [city] = useState(() => defaultCity ?? (typeof window !== "undefined" ? storedCity() : null) ?? DEFAULT_CITY);

  async function submit(form: FormData) {
    setErrors({});
    const raw = Object.fromEntries(form.entries());
    if (mode === "login") {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return setErrors(fieldErrors(parsed.error));
      setBusy(true);
      const res = await backend.signIn(parsed.data);
      setBusy(false);
      if (!res.ok) return setErrors({ _: res.error });
      toast({ message: "¡Bienvenido de vuelta!" });
      onDone?.();
      return;
    }
    const parsed = registerSchema.safeParse({ ...raw, accept: raw.accept === "on" });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setBusy(true);
    const res = await backend.signUp(parsed.data);
    setBusy(false);
    if (!res.ok) return setErrors({ _: res.error });
    if (res.data.needsConfirmation) {
      setSentTo(parsed.data.email);
      return;
    }
    toast({ message: "Cuenta creada. ¡A planear!" });
    onDone?.();
  }

  async function google() {
    const res = await backend.signInWithGoogle(next ?? window.location.pathname);
    if (!res.ok) toast({ message: res.error, tone: "error" });
  }

  async function demoModerator() {
    setBusy(true);
    const res = await backend.signIn({ email: DEMO_MOD_EMAIL, password: DEMO_MOD_PASSWORD });
    setBusy(false);
    if (!res.ok) return setErrors({ _: res.error });
    toast({ message: "Sesión de moderación demo iniciada" });
    onDone?.();
  }

  if (sentTo) {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-surface-2 text-3xl">📬</div>
        <h3 className="font-display text-lg font-bold">Revisa tu email</h3>
        <p className="mt-1 text-sm text-muted">
          Te hemos enviado un enlace a <strong className="text-ink">{sentTo}</strong> para confirmar tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 rounded-full bg-surface-2 p-1 text-sm font-semibold">
        {(["register", "login"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setErrors({});
            }}
            className={`h-9 rounded-full transition-colors ${mode === m ? "bg-ink text-bg" : "text-muted"}`}
          >
            {m === "register" ? "Crear cuenta" : "Entrar"}
          </button>
        ))}
      </div>

      {GOOGLE_AUTH_ENABLED ? (
        <>
          <Button type="button" variant="secondary" className="w-full" onClick={() => void google()}>
            <GoogleIcon /> Continuar con Google
          </Button>
          <div className="my-4 flex items-center gap-3 text-xs text-dim">
            <span className="h-px flex-1 bg-line" /> o con email <span className="h-px flex-1 bg-line" />
          </div>
        </>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(new FormData(e.currentTarget));
        }}
        className="space-y-3"
        noValidate
      >
        {mode === "register" ? (
          <Field label="¿Cómo te llamamos?" error={errors.displayName}>
            <input name="displayName" autoComplete="nickname" placeholder="Tu nombre o apodo" className="field" maxLength={40} />
          </Field>
        ) : null}
        <Field label="Email" error={errors.email}>
          <input name="email" type="email" autoComplete="email" inputMode="email" placeholder="tu@email.com" className="field" />
        </Field>
        <Field label="Contraseña" error={errors.password}>
          <input
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "login" ? "Tu contraseña" : "Mínimo 8 caracteres"}
            className="field"
          />
        </Field>
        {mode === "register" ? (
          <>
            <Field label="Tu ciudad" error={errors.citySlug}>
              <select name="citySlug" defaultValue={city} className="field appearance-none">
                {CITIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-start gap-3 pt-1 text-sm text-muted">
              <input name="accept" type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[#c8ff3d]" />
              <span>
                Acepto las{" "}
                <Link href="/normas" className="text-ink underline underline-offset-2" target="_blank">
                  normas de la comunidad
                </Link>{" "}
                y tengo 16 años o más.
              </span>
            </label>
            {errors.accept ? <p className="text-sm text-danger">{errors.accept}</p> : null}
          </>
        ) : null}
        {errors._ ? <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{errors._}</p> : null}
        <Button type="submit" className="mt-2 w-full" size="lg" loading={busy}>
          {mode === "register" ? "Crear cuenta gratis" : "Entrar"}
        </Button>
      </form>

      {IS_DEMO ? (
        <div className="mt-5 rounded-2xl border border-line bg-surface-2/60 p-3 text-xs text-muted">
          <p>
            <strong className="text-ink">Modo demo:</strong> las cuentas se guardan solo en este navegador. Conecta Supabase para cuentas reales.
          </p>
          <button type="button" onClick={() => void demoModerator()} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-lime">
            <ShieldCheck size={14} /> Entrar como moderador demo
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-danger">{error}</span> : null}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
