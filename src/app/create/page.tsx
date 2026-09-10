"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n";
import { Button, Field, Screen, TextInput, TopBar } from "@/components/ui";
import { getLastNickname, rememberNickname, storePlayer } from "@/lib/player";

export default function CreatePage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [nickname, setNickname] = useState(getLastNickname());
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
        body: JSON.stringify({ nickname: nn, lang }),
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

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          <Button type="submit" disabled={busy || nickname.trim().length < 1}>
            {busy ? t("create.creating") : t("create.createButton").toUpperCase()}
          </Button>
        </form>
      </Screen>
    </>
  );
}
