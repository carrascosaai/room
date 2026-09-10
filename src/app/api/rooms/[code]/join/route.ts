import { joinRoom } from "@/server/actions";
import { cleanLang, cleanNickname, code as clean, json, readBody } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await readBody(req);
  const nickname = cleanNickname(body.nickname);
  if (!nickname) return json({ ok: false, error: "nickname_required" });
  const result = await joinRoom({
    code: clean(code),
    nickname,
    lang: cleanLang(body.lang),
    playerId: typeof body.playerId === "string" ? body.playerId : undefined,
  });
  return json(result);
}
