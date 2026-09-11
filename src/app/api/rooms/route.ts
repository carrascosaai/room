import { createRoom } from "@/server/actions";
import { cleanLang, cleanNickname, json, readBody } from "@/server/http";
import type { GameMode } from "@/game/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readBody(req);
  const nickname = cleanNickname(body.nickname);
  if (!nickname) return json({ ok: false, error: "nickname_required" });
  const mode: GameMode = body.mode === "classic" ? "classic" : "director";
  const result = await createRoom({ nickname, lang: cleanLang(body.lang), mode });
  return json(result);
}
