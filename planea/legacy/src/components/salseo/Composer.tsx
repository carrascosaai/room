"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { Post, PostKind, TargetRef } from "@/lib/types";
import { cn } from "@/lib/utils";
import { firstError, postSchema } from "@/lib/validation";
import { checkContent } from "@/lib/moderation";
import { POST_KINDS, kindOf } from "./kinds";

export function Composer({ open, onClose, target, onCreated }: { open: boolean; onClose: () => void; target: TargetRef; onCreated: (p: Post) => void }) {
  const { backend, toast, xp } = useApp();
  const [kind, setKind] = useState<PostKind>("poll");
  const [body, setBody] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [anon, setAnon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const k = kindOf(kind);
  const forcedAnon = kind === "confession";

  function pick(next: PostKind) {
    setKind(next);
    setAnon(kindOf(next).anonDefault);
    setError(null);
  }

  async function submit() {
    setError(null);
    const opts = kind === "poll" ? options.map((o) => o.trim()).filter(Boolean) : [];
    const parsed = postSchema.safeParse({ kind, body, options: opts });
    if (!parsed.success) return setError(firstError(parsed.error));
    const mod = checkContent([body, ...opts].join(" "));
    if (!mod.ok) return setError(mod.reason!);
    setBusy(true);
    const res = await backend.createPost({ target, kind, body, options: opts, anonymous: forcedAnon || anon });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onCreated(res.data);
    toast({ message: "Publicado en el salseo 🔥" });
    xp("post");
    setBody("");
    setOptions(["", ""]);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nuevo salseo">
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {POST_KINDS.map((x) => (
          <button
            key={x.id}
            onClick={() => pick(x.id)}
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold",
              kind === x.id ? "border-hot bg-hot/15 text-hot" : "border-line bg-surface-2 text-muted",
            )}
          >
            {x.emoji} {x.label}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={280}
        rows={3}
        placeholder={k.placeholder}
        className="field mt-4 resize-none text-[16px]"
        autoFocus
      />
      <p className="mt-1 text-right text-xs text-dim">{body.length}/280</p>
      {kind === "poll" ? (
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={o}
                maxLength={60}
                onChange={(e) => setOptions((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={`Opción ${i + 1}`}
                className="field"
              />
              {options.length > 2 ? (
                <button aria-label="Quitar opción" onClick={() => setOptions((l) => l.filter((_, j) => j !== i))} className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                  <X size={16} />
                </button>
              ) : null}
            </div>
          ))}
          {options.length < 4 ? (
            <button onClick={() => setOptions((l) => [...l, ""])} className="flex items-center gap-1.5 text-sm font-semibold text-lime">
              <Plus size={16} /> Añadir opción
            </button>
          ) : null}
        </div>
      ) : null}
      <label className={cn("mt-4 flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3", forcedAnon && "opacity-70")}>
        <span>
          <span className="block text-sm font-semibold">🎭 Publicar como anónimo</span>
          <span className="block text-xs text-muted">{forcedAnon ? "Las confesiones siempre son anónimas." : "Nadie verá tu nombre."}</span>
        </span>
        <input type="checkbox" checked={forcedAnon || anon} disabled={forcedAnon} onChange={(e) => setAnon(e.target.checked)} className="size-5 accent-[#ff4d7e]" />
      </label>
      <p className="mt-3 text-xs text-dim">Sin nombres completos, teléfonos, @usuarios ni acusaciones. El salseo es sobre el plan, no para hacer daño.</p>
      {error ? <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      <Button className="mt-4 w-full" size="lg" variant="hot" loading={busy} onClick={() => void submit()}>
        Publicar
      </Button>
    </Sheet>
  );
}
