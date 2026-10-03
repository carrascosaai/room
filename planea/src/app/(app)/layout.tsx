import { BottomNav } from "@/components/shell/BottomNav";
import { DemoBanner } from "@/components/shell/DemoBanner";
import { DesktopHeader } from "@/components/shell/DesktopHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoBanner />
      <DesktopHeader />
      <div className="pb-nav lg:pb-16">{children}</div>
      <BottomNav />
    </>
  );
}
