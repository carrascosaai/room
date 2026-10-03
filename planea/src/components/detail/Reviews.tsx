"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Stars } from "@/components/ui/Stars";
import { ContentMenu } from "@/components/salseo/ContentMenu";
import { ReportSheet, type ReportTarget } from "@/components/salseo/ReportSheet";
import { checkContent } from "@/lib/moderation";
import { timeAgo } from "@/lib/time";
import type { Review } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./InfoGrid";

export function Reviews({ venueId, venueName, initial }: { venueId: string; venueName: string; initial: Review[] }) {
  const { backend, profile, requireAuth, toast, xp } = useApp();
  const [reviews, setReviews] = useState(initial);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    void backend.listReviews(venueId, initial).then(setReviews);
  }, [backend, venueId, initial, profile?.id]);

  async function submit() {
    if (!rating) return toast({ message: "Elige de 1 a 5 estrellas", tone: "error" });
    if (body.trim()) {
      const m = checkContent(body);
      if (!m.ok) return toast({ message: m.reason!, tone: "error" });
    }
    setBusy(true);
    const res = await backend.createReview(venueId, rating, body);
    setBusy(false);
    if (!res.ok) return toast({ message: res.error, tone: "error" });
    setReviews((r) => [res.data, ...r.filter((x) => x.authorId !== res.data.authorId || !x.authorId)]);
    setOpen(false);
    setBody("");
    toast({ message: "¡Gracias por tu reseña!" });
    xp("review");
  }

  const list = showAll ? reviews : reviews.slice(0, 3);

  return (
    <section>
      <SectionTitle
        action={
          <button onClick={() => requireAuth("Inicia sesión para opinar", () => setOpen(true)) && setOpen(true)} className="text-sm font-semibold text-lime">
            Escribir reseña
          </button>
        }
      >
        Reseñas
      </SectionTitle>
      <div className="space-y-3">
        {list.map((r) => (
          <article key={r.id} className="rounded-2xl border border-line bg-surface p-4">
            <header className="flex items-center gap-2.5">
              <Avatar emoji={r.authorEmoji} size={30} />
              <div className="flex-1 leading-tight">
                <p className="text-sm font-semibold">{r.authorName}</p>
                <p className="text-xs text-dim">{timeAgo(r.createdAt)}</p>
              </div>
              <Stars value={r.rating} size={13} />
              <ContentMenu
                isMine={Boolean(profile && r.authorId === profile.id)}
                onReport={() => requireAuth("Inicia sesión para denunciar") && setReporting({ type: "review", id: r.id, preview: r.body })}
              />
            </header>
            {r.body ? <p className="mt-2 text-[15px] text-ink/90">{r.body}</p> : null}
          </article>
        ))}
        {!reviews.length ? <p className="text-sm text-muted">Nadie ha opinado todavía. ¡Estrena tú las reseñas!</p> : null}
        {reviews.length > 3 && !showAll ? (
          <button onClick={() => setShowAll(true)} className="text-sm font-semibold text-muted hover:text-ink">
            Ver las {reviews.length} reseñas
          </button>
        ) : null}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={`¿Qué tal ${venueName}?`}>
        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} onClick={() => setRating(i)} aria-label={`${i} estrellas`} className="active:scale-90">
              <Star size={38} className={cn("transition-colors", i <= rating ? "fill-amber text-amber" : "text-dim")} strokeWidth={1.5} />
            </button>
          ))}
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={400} rows={4} placeholder="Ambiente, música, precios, colas… (opcional)" className="field mt-3 resize-none" />
        <Button className="mt-4 w-full" size="lg" loading={busy} onClick={() => void submit()}>
          Publicar reseña
        </Button>
      </Sheet>
      <ReportSheet target={reporting} onClose={() => setReporting(null)} onReported={(id) => setReviews((r) => r.filter((x) => x.id !== id))} />
    </section>
  );
}
