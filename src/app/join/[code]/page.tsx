import { redirect } from "next/navigation";
import { normalizeRoomCode } from "@/lib/id";

export default async function JoinCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/room/${normalizeRoomCode(code)}`);
}
