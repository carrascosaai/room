import { challengeHypothesisAction } from "@/server/actions";
import { code as clean, json, readBody } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readBody(req);
  if (typeof body.playerId !== "string") return json({ ok: false, error: "playerId_required" });
  const result = await challengeHypothesisAction({ code: clean(code), playerId: body.playerId });
  return json(result);
}
