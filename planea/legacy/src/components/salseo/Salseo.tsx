"use client";

import { useEffect, useState } from "react";
import { Flame, Plus } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Post, Reply, TargetRef } from "@/lib/types";
import { Composer } from "./Composer";
import { PostCard } from "./PostCard";
import { ReportSheet, type ReportTarget } from "./ReportSheet";

/** 🔥 SALSEO: encuestas, preguntas, confesiones, opiniones y predicciones del plan. */
export function Salseo({ target, initialPosts, initialReplies }: { target: TargetRef; initialPosts: Post[]; initialReplies: Reply[] }) {
  const { backend, my, profile, requireAuth } = useApp();
  const [posts, setPosts] = useState(initialPosts);
  const [composer, setComposer] = useState(false);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);

  useEffect(() => {
    void backend.listPosts(target, initialPosts).then(setPosts);
    // Recarga al cambiar de sesión (bloqueos, publicaciones propias).
  }, [backend, target, initialPosts, profile?.id]);

  const visible = posts.filter((p) => !my.hidden.includes(p.id));

  return (
    <section id="salseo" className="scroll-mt-20">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <Flame className="text-hot" /> Salseo
        </h2>
        <button
          onClick={() => requireAuth("Inicia sesión para abrir salseo", () => setComposer(true)) && setComposer(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-hot px-3.5 text-sm font-semibold text-white active:scale-95"
        >
          <Plus size={16} strokeWidth={2.6} /> Publicar
        </button>
      </div>
      <p className="mb-4 text-sm text-muted">Encuestas, preguntas y confesiones. Anónimo cuando toca, sin datos de nadie.</p>
      {visible.length ? (
        <div className="space-y-3">
          {visible.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              initialReplies={initialReplies.filter((r) => r.postId === p.id)}
              onReport={setReporting}
              onRemove={(id) => setPosts((list) => list.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      ) : (
        <EmptyState emoji="🫖" title="Aún no hay salseo">
          Lanza la primera encuesta o pregunta. ¿A qué hora se llena? ¿Quién llega siempre tarde?
        </EmptyState>
      )}
      <Composer open={composer} onClose={() => setComposer(false)} target={target} onCreated={(p) => setPosts((list) => [p, ...list])} />
      <ReportSheet target={reporting} onClose={() => setReporting(null)} onReported={(id) => setPosts((list) => list.filter((x) => x.id !== id))} />
    </section>
  );
}
