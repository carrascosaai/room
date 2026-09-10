import { setRoomLanguage } from "@/server/actions";
import { cleanLang, code as clean, json, readBody } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await readBody(req);
  if (typeof body.playerId !== "string") return json({ ok: false, error: "playerId_required" });
  const result = await setRoomLanguage(clean(code), body.playerId, cleanLang(body.lang));
  return json(result);
}
