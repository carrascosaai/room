import { getRoomView } from "@/server/actions";
import { code as clean, json } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const url = new URL(req.url);
  const playerId = url.searchParams.get("pid");
  const result = await getRoomView(clean(code), playerId);
  return json(result, result.ok ? 200 : 404);
}
