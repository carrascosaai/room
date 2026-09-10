"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useI18n } from "@/i18n";
import { Button, Field, Screen, TextInput, TopBar } from "@/components/ui";
import { normalizeRoomCode } from "@/lib/id";

function JoinInner() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(normalizeRoomCode(params.get("code") ?? ""));

  return (
    <>
      <TopBar />
      <Screen>
        <h1 className="text-2xl font-bold tracking-tight">{t("join.title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("landing.joinSub")}</p>

        <form
          className="mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const c = normalizeRoomCode(code);
            if (c.length >= 3) router.push(`/room/${c}`);
          }}
        >
          <Field label={t("join.roomCode")} hint={t("join.scanQr")}>
            <TextInput
              value={code}
              onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
              placeholder={t("join.codePlaceholder")}
              maxLength={6}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              className="text-center font-mono text-2xl tracking-[0.4em]"
              enterKeyHint="go"
            />
          </Field>
          <Button type="submit" disabled={normalizeRoomCode(code).length < 3}>
            {t("join.joinButton").toUpperCase()}
          </Button>
        </form>
      </Screen>
    </>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInner />
    </Suspense>
  );
}
