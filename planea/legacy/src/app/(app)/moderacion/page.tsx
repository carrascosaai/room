import type { Metadata } from "next";
import { ModerationPanel } from "@/components/moderation/ModerationPanel";
import { demoReports } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Moderación", robots: { index: false } };

export default function ModerationPage() {
  return <ModerationPanel initial={demoReports()} />;
}
