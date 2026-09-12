import { track, type AnalyticsEvent } from "@/lib/analytics";
import { readBody } from "@/server/http";

export const dynamic = "force-dynamic";

const ALLOWED: AnalyticsEvent[] = [
  "room_created",
  "room_joined",
  "game_started",
  "round_completed",
  "hypothesis_created",
  "counter_theory_created",
  "test_completed",
  "theory_confirmed",
  "theory_discarded",
  "game_completed",
  "share_clicked",
  "play_again",
];

export async function POST(req: Request) {
  const body = await readBody<{ name?: string; props?: Record<string, unknown> }>(req);
  if (body.name && (ALLOWED as string[]).includes(body.name)) {
    await track(body.name as AnalyticsEvent, null, body.props ?? {});
  }
  return new Response(null, { status: 204 });
}
