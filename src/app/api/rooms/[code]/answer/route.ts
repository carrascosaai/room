import { answer } from "@/server/actions";
import { code as clean, json, readBody } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await readBody(req);
  if (typeof body.playerId !== "string" || typeof body.optionId !== "string") {
    return json({ ok: false, error: "bad_request" });
  }
  const result = await answer({
    code: clean(code),
    playerId: body.playerId,
    optionId: body.optionId,
    targetId: typeof body.targetId === "string" ? body.targetId : undefined,
  });
  return json(result);
}
