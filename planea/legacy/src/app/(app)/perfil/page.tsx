import type { Metadata } from "next";
import { ProfileView } from "@/components/profile/ProfileView";

export const metadata: Metadata = { title: "Tu perfil", robots: { index: false } };

export default function ProfilePage() {
  return <ProfileView />;
}
