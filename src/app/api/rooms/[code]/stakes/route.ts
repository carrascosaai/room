import { submitStakesAction } from "@/server/actions";
import { code as clean, json, readBody } from "@/server/http";
import type { Stakes } from "@/game/testContent";

export const dynamic = "force-dynamic";

const STAKES: Stakes[] = ["low", "medium", "high"];

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readBody(req);
  if (typeof body.playerId !== "string" || typeof body.stakes !== "string" || !STAKES.includes(body.stakes as Stakes)) {
    return json({ ok: false, error: "bad_request" });
  }
  const result = await submitStakesAction({ code: clean(code), playerId: body.playerId, stakes: body.stakes as Stakes });
  return json(result);
}
