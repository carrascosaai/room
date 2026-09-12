import { submitHypothesisAction } from "@/server/actions";
import { code as clean, json, readBody } from "@/server/http";
import type { HypothesisCategory } from "@/game/types";

export const dynamic = "force-dynamic";

const CATEGORIES: HypothesisCategory[] = ["loyalty", "trust", "money", "social", "competition", "relationships", "spicy"];

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await readBody(req);
  if (
    typeof body.playerId !== "string" ||
    typeof body.targetId !== "string" ||
    typeof body.templateId !== "string" ||
    typeof body.category !== "string" ||
    !CATEGORIES.includes(body.category as HypothesisCategory)
  ) {
    return json({ ok: false, error: "bad_request" });
  }
  const result = await submitHypothesisAction({
    code: clean(code),
    playerId: body.playerId,
    targetId: body.targetId,
    category: body.category as HypothesisCategory,
    templateId: body.templateId,
    anonymous: body.anonymous !== false,
    counterOf: typeof body.counterOf === "string" ? body.counterOf : undefined,
  });
  return json(result);
}
