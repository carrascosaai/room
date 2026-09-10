"use client";

import { useI18n } from "@/i18n";
import { LanguageToggle, LinkButton, Logo } from "@/components/ui";

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <main className="flex flex-1 flex-col px-6 pb-10 pt-6">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>

      <div className="mt-14 flex flex-col items-start">
        <Logo size="text-5xl" />
        <p className="mt-5 max-w-[15ch] text-2xl font-semibold leading-tight tracking-tight">
          {t("tagline")}
        </p>
      </div>

      <div className="mt-8 space-y-1.5 text-[15px] text-[var(--muted)]">
        <p>{t("landing.line1")}</p>
        <p>{t("landing.line2")}</p>
        <p className="text-[var(--text)]">{t("landing.line3")}</p>
        <p className="text-[var(--text)]">{t("landing.line4")}</p>
      </div>

      <div className="mt-10 space-y-3">
        <LinkButton href="/create" variant="primary">
          {t("common.create").toUpperCase()}
        </LinkButton>
        <LinkButton href="/join" variant="surface">
          {t("common.join").toUpperCase()}
        </LinkButton>
      </div>

      <div className="mt-14 border-t border-[var(--border)] pt-8">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-[var(--muted)]">
          {t("landing.howItWorks")}
        </h2>
        <ol className="space-y-5">
          {[1, 2, 3].map((n) => (
            <li key={n} className="flex gap-4">
              <span className="mt-0.5 font-mono text-sm text-[var(--accent)]">0{n}</span>
              <div>
                <p className="font-semibold">{t(`landing.step${n}Title`)}</p>
                <p className="text-sm text-[var(--muted)]">{t(`landing.step${n}Body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-auto pt-12 text-center text-xs text-[var(--muted)]">
        {t("landing.footer")}
      </p>
      <p className="mt-2 text-center text-[11px] font-mono uppercase tracking-[0.3em] text-[var(--border)]">
        {t("shortPhrase")}
      </p>
    </main>
  );
}
