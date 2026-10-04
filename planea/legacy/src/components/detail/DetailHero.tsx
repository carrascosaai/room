import type { ReactNode } from "react";
import type { CategorySlug } from "@/lib/types";
import { Cover } from "@/components/ui/Cover";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { BackButton, ShareButton } from "./HeroButtons";

export function DetailHero({
  seed,
  category,
  imageUrl,
  title,
  isDemo,
  backHref,
  children,
}: {
  seed: string;
  category: CategorySlug;
  imageUrl: string | null;
  title: string;
  isDemo: boolean;
  backHref: string;
  children: ReactNode;
}) {
  return (
    <div className="relative -mx-4 sm:mx-0">
      <Cover seed={seed} category={category} imageUrl={imageUrl} alt={title} priority emojiSize="text-8xl" className="h-72 sm:h-80 sm:rounded-b-[2rem] lg:mt-6 lg:rounded-[2rem]" sizes="(max-width: 768px) 100vw, 720px" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent sm:rounded-b-[2rem] lg:mt-6 lg:rounded-[2rem]" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] lg:mt-6">
        <BackButton fallback={backHref} />
        <div className="flex items-center gap-2">
          {isDemo ? <DemoBadge /> : null}
          <ShareButton title={title} />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4 sm:px-6">{children}</div>
    </div>
  );
}
