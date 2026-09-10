"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { normalizeRoomCode } from "@/lib/id";
import { getStoredPlayer } from "@/lib/player";
import { useRoom } from "@/lib/useRoom";
import { LanguageToggle, LinkButton, Logo } from "@/components/ui";
import { JoinForm } from "@/components/room/JoinForm";
import {
  AiMoment,
  AnswerScreen,
  Lobby,
  RevealScreen,
  RoundIntro,
} from "@/components/room/screens";
import { Results } from "@/components/room/Results";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeRoomCode(params.code ?? "");
  const { t, lang, setLang } = useI18n();
  const room = useRoom(code);
  const { view, status } = room;

  const [hasIdentity, setHasIdentity] = useState<boolean | null>(null);
  useEffect(() => {
    setHasIdentity(!!getStoredPlayer(code));
  }, [code, view?.version]);

  // keep server-side player language in sync with the toggle
  useEffect(() => {
    if (view?.me) room.setServerLang(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, view?.me?.id]);

  if (status === "gone") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
        <Logo size="text-2xl" />
        <p className="text-[var(--muted)]">{t("errors.room_not_found")}</p>
        <div className="w-full max-w-xs space-y-2">
          <LinkButton href="/create">{t("common.create").toUpperCase()}</LinkButton>
          <LinkButton href="/join" variant="ghost">{t("common.join")}</LinkButton>
        </div>
      </div>
    );
  }

  if (hasIdentity === null || (!view && status === "connecting")) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="flex items-center gap-2 text-sm text-[var(--muted)]">{t("common.loading")}</p>
      </div>
    );
  }

  const joined = !!view?.me;
  if (!joined) {
    return <JoinForm code={code} onJoined={() => { setHasIdentity(true); room.refresh(); }} />;
  }

  return (
    <>
      <header className="flex items-center justify-between px-5 py-3">
        <Logo size="text-base" />
        <div className="flex items-center gap-3">
          {status === "error" ? (
            <span className="text-[10px] uppercase tracking-widest text-[var(--danger)]">
              {t("common.reconnecting")}
            </span>
          ) : null}
          <LanguageToggle onChange={(l) => setLang(l)} />
        </div>
      </header>

      <Stage view={view!} room={room} />
    </>
  );
}

function Stage({ view, room }: { view: NonNullable<ReturnType<typeof useRoom>["view"]>; room: ReturnType<typeof useRoom> }) {
  switch (view.phase) {
    case "LOBBY":
      return <Lobby view={view} room={room} />;
    case "ROUND_INTRO":
      return <RoundIntro view={view} />;
    case "ANSWERING":
      return <AnswerScreen view={view} room={room} />;
    case "REVEAL":
    case "ROUND_RESULT":
      return <RevealScreen view={view} room={room} />;
    case "AI_OBSERVATION":
    case "AI_THEORY":
    case "AI_INTERVENTION":
      return <AiMoment view={view} room={room} />;
    case "FINAL_RESULTS":
      return <Results view={view} room={room} />;
    default:
      return null;
  }
}
