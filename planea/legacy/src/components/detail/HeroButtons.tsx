"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Share2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";

const cls = "grid size-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md transition-transform active:scale-90";

export function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter();
  return (
    <button aria-label="Volver" className={cls} onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}>
      <ArrowLeft size={20} />
    </button>
  );
}

export function ShareButton({ title }: { title: string }) {
  const { toast } = useApp();
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast({ message: "Enlace copiado" });
      }
    } catch {
      /* el usuario canceló */
    }
  }
  return (
    <button aria-label="Compartir" className={cls} onClick={() => void share()}>
      <Share2 size={18} />
    </button>
  );
}
