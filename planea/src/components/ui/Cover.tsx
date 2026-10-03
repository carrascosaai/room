import Image from "next/image";
import type { CSSProperties } from "react";
import { categoryOf } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";
import { cn, hash } from "@/lib/utils";

/**
 * Portada de un local/evento/plan.
 * Si hay imagen real (imageUrl) se muestra optimizada; si no, se genera una
 * portada abstracta por categoría (sin depender de fotos de stock ni de red).
 */
const PALETTES: Record<CategorySlug, [string, string, string]> = {
  discotecas: ["#7c3aed", "#ff2e93", "#2a0f4a"],
  copas: ["#ff9f43", "#14b8a6", "#22140a"],
  pubs: ["#f59e0b", "#b91c1c", "#1f1206"],
  conciertos: ["#ef4444", "#fb923c", "#250a0a"],
  universitario: ["#2563eb", "#c8ff3d", "#0a1230"],
  festivales: ["#ec4899", "#facc15", "#2a0a1c"],
  eventos: ["#06b6d4", "#8b5cf6", "#081c24"],
  restaurantes: ["#ea580c", "#84cc16", "#1f1007"],
  planes: ["#6366f1", "#c8ff3d", "#100f2a"],
};

function pattern(category: CategorySlug, h: number): string {
  const angle = h % 360;
  switch (category) {
    case "discotecas":
      return `repeating-conic-gradient(from ${angle}deg at ${30 + (h % 40)}% -10%, rgb(255 255 255 / 0.10) 0deg 3deg, transparent 3deg 14deg)`;
    case "conciertos":
      return `conic-gradient(from 160deg at 50% -20%, transparent 0deg, rgb(255 255 255 / 0.14) 12deg, transparent 24deg, transparent 30deg, rgb(255 255 255 / 0.10) 40deg, transparent 52deg)`;
    case "copas":
    case "festivales":
      return `radial-gradient(circle at 20% 30%, rgb(255 255 255 / 0.16) 0 3px, transparent 4px), radial-gradient(circle at 70% 60%, rgb(255 255 255 / 0.12) 0 6px, transparent 7px), radial-gradient(circle at 40% 80%, rgb(255 255 255 / 0.10) 0 10px, transparent 11px), radial-gradient(circle at 85% 20%, rgb(255 255 255 / 0.12) 0 4px, transparent 5px)`;
    case "universitario":
      return `linear-gradient(rgb(255 255 255 / 0.06) 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(90deg, rgb(255 255 255 / 0.06) 1px, transparent 1px) 0 0 / 22px 22px`;
    case "pubs":
    case "restaurantes":
      return `repeating-linear-gradient(${angle % 2 ? 115 : 65}deg, rgb(255 255 255 / 0.05) 0 2px, transparent 2px 18px)`;
    default:
      return `radial-gradient(circle at 75% 25%, rgb(255 255 255 / 0.10), transparent 40%)`;
  }
}

export function Cover({
  seed,
  category,
  imageUrl,
  alt,
  className,
  emojiSize = "text-6xl",
  priority,
  sizes = "(max-width: 640px) 100vw, 480px",
}: {
  seed: string;
  category: CategorySlug;
  imageUrl?: string | null;
  alt: string;
  className?: string;
  emojiSize?: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (imageUrl) {
    return (
      <div className={cn("relative overflow-hidden bg-surface-2", className)}>
        <Image src={imageUrl} alt={alt} fill sizes={sizes} priority={priority} unoptimized={imageUrl.startsWith("data:")} className="object-cover" />
      </div>
    );
  }
  const h = hash(seed);
  const [a, b, base] = PALETTES[category] ?? PALETTES.eventos;
  const style: CSSProperties = {
    backgroundColor: base,
    backgroundImage: [
      pattern(category, h),
      `radial-gradient(circle at ${15 + (h % 50)}% ${20 + ((h >> 3) % 50)}%, ${a} 0%, transparent 55%)`,
      `radial-gradient(circle at ${55 + ((h >> 5) % 40)}% ${50 + ((h >> 7) % 45)}%, ${b} 0%, transparent 50%)`,
    ].join(", "),
  };
  const rotate = ((h >> 9) % 24) - 12;
  return (
    <div role="img" aria-label={alt} className={cn("grain relative overflow-hidden", className)} style={style}>
      <span
        aria-hidden
        className={cn("absolute bottom-[-8%] right-[6%] select-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]", emojiSize)}
        style={{ transform: `rotate(${rotate}deg)` }}
      >
        {categoryOf(category).emoji}
      </span>
    </div>
  );
}
