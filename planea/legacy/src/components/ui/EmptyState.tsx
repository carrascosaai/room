import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  emoji,
  title,
  children,
  action,
  className,
}: {
  emoji: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-[1.5rem] border border-dashed border-line-strong px-6 py-10 text-center", className)}>
      <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-surface-2 text-3xl">{emoji}</div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {children ? <p className="mt-1 max-w-xs text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
