"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n";
import { Button, Field, Screen, TextInput, TopBar } from "@/components/ui";
import { getLastNickname, rememberNickname, storePlayer } from "@/lib/player";
import type { GameMode } from "@/game/types";

export default function CreatePage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [nickname, setNickname] = useState(getLastNickname());
  const [mode, setMode] = useState<GameMode>("director");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const nn = nickname.trim();
    if (nn.length < 1) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: nn, lang, mode }),
      }).then((r) => r.json());
      if (res.ok && res.code && res.playerId) {
        rememberNickname(nn);
        storePlayer(res.code, res.playerId, nn);
        router.push(`/room/${res.code}`);
      } else {
        setError(t(`errors.${res.error ?? "generic"}`));
        setBusy(false);
      }
    } catch {
      setError(t("errors.generic"));
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar />
      <Screen>
        <h1 className="text-2xl font-bold tracking-tight">{t("create.title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("landing.createSub")}</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <Field label={t("create.yourNickname")}>
            <TextInput
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t("create.nicknamePlaceholder")}
              maxLength={20}
              autoFocus
              autoComplete="off"
              enterKeyHint="go"
            />
          </Field>

          <Field label={t("create.modeLabel")}>
            <div className="space-y-2.5">
              <ModeOption
                selected={mode === "director"}
                onClick={() => setMode("director")}
                title={t("create.modeDirectorTitle")}
                desc={t("create.modeDirectorDesc")}
              />
              <ModeOption
                selected={mode === "classic"}
                onClick={() => setMode("classic")}
                title={t("create.modeClassicTitle")}
                desc={t("create.modeClassicDesc")}
              />
            </div>
          </Field>

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          <Button type="submit" disabled={busy || nickname.trim().length < 1}>
            {busy ? t("create.creating") : t("create.createButton").toUpperCase()}
          </Button>
        </form>
      </Screen>
    </>
  );
}

function ModeOption({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-[var(--accent)] bg-[var(--accent)]/5"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--muted)]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
            selected ? "border-[var(--accent)]" : "border-[var(--muted)]"
          }`}
        >
          {selected ? <span className="h-2 w-2 rounded-full bg-[var(--accent)]" /> : null}
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-1.5 pl-6 text-xs leading-relaxed text-[var(--muted)]">{desc}</p>
    </button>
  );
}
