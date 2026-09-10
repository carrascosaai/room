"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { Button, Field, Screen, TextInput, TopBar } from "@/components/ui";
import { getLastNickname, rememberNickname, storePlayer } from "@/lib/player";

export function JoinForm({ code, onJoined }: { code: string; onJoined: () => void }) {
  const { t, lang } = useI18n();
  const [nickname, setNickname] = useState(getLastNickname());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const nn = nickname.trim();
    if (!nn) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: nn, lang }),
      }).then((r) => r.json());
      if (res.ok && res.playerId) {
        rememberNickname(nn);
        storePlayer(code, res.playerId, nn);
        onJoined();
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
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          {t("lobby.title")} {code}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{t("join.title")}</h1>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <Field label={t("join.yourNickname")}>
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
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <Button type="submit" disabled={busy || !nickname.trim()}>
            {busy ? t("join.joining") : t("join.joinButton").toUpperCase()}
          </Button>
        </form>
      </Screen>
    </>
  );
}
