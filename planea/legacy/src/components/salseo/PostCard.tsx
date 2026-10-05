"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Avatar } from "@/components/ui/Avatar";
import type { Post, Reply } from "@/lib/types";
import { timeAgo } from "@/lib/time";
import { cn, pct } from "@/lib/utils";
import { ContentMenu } from "./ContentMenu";
import { kindOf } from "./kinds";
import type { ReportTarget } from "./ReportSheet";

export function PostCard({
  post,
  initialReplies,
  onReport,
  onRemove,
}: {
  post: Post;
  initialReplies: Reply[];
  onReport: (t: ReportTarget) => void;
  onRemove: (id: string) => void;
}) {
  const { backend, my, setMy, requireAuth, toast, xp } = useApp();
  const [options, setOptions] = useState(post.options);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [replyCount, setReplyCount] = useState(post.replyCount);
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(true);
  const [busy, setBusy] = useState(false);
  const k = kindOf(post.kind);
  const myVote = my.pollVotes[post.id];
  const totalVotes = options.reduce((a, o) => a + o.votes, 0);

  async function vote(optionId: string) {
    if (!requireAuth("Inicia sesión para votar")) return;
    if (myVote) return;
    setOptions((o) => o.map((x) => (x.id === optionId ? { ...x, votes: x.votes + 1 } : x)));
    setMy((s) => ({ ...s, pollVotes: { ...s.pollVotes, [post.id]: optionId } }));
    const res = await backend.votePoll(post.id, optionId);
    if (!res.ok) {
      setOptions(post.options);
      setMy((s) => {
        const pollVotes = { ...s.pollVotes };
        delete pollVotes[post.id];
        return { ...s, pollVotes };
      });
      toast({ message: res.error, tone: "error" });
    } else xp("pollVote");
  }

  async function toggleReplies() {
    const next = !showReplies;
    setShowReplies(next);
    if (next && replies === null) setReplies(await backend.listReplies(post.id, initialReplies));
  }

  async function sendReply() {
    if (!requireAuth("Inicia sesión para responder")) return;
    if (!text.trim()) return;
    setBusy(true);
    const res = await backend.createReply(post.id, text, anon);
    setBusy(false);
    if (!res.ok) return toast({ message: res.error, tone: "error" });
    setReplies((r) => [...(r ?? []), res.data]);
    setReplyCount((c) => c + 1);
    setText("");
    xp("reply");
  }

  async function del() {
    const res = await backend.deletePost(post.id);
    if (!res.ok) return toast({ message: res.error, tone: "error" });
    toast({ message: "Publicación eliminada" });
    onRemove(post.id);
  }

  async function block() {
    if (!requireAuth("Inicia sesión para bloquear")) return;
    const res = await backend.blockAuthor({ userId: post.authorId, postId: post.id });
    if (!res.ok) return toast({ message: res.error, tone: "error" });
    toast({ message: "Autor bloqueado. No verás más su contenido." });
    onRemove(post.id);
  }

  async function delReply(id: string) {
    const res = await backend.deleteReply(id);
    if (!res.ok) return toast({ message: res.error, tone: "error" });
    setReplies((r) => (r ?? []).filter((x) => x.id !== id));
    setReplyCount((c) => Math.max(0, c - 1));
  }

  const visibleReplies = (replies ?? []).filter((r) => !my.hidden.includes(r.id));

  return (
    <article className="animate-fade-up rounded-[1.25rem] border border-line bg-surface p-4">
      <header className="flex items-center gap-2.5">
        <Avatar emoji={post.authorEmoji} size={32} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">{post.authorName}</p>
          <p className="text-xs text-dim">
            {k.emoji} {k.label} · {timeAgo(post.createdAt)}
          </p>
        </div>
        <ContentMenu
          isMine={post.isMine}
          onDelete={() => void del()}
          onReport={() => requireAuth("Inicia sesión para denunciar") && onReport({ type: "post", id: post.id, preview: post.body })}
          onBlock={() => void block()}
        />
      </header>
      <p className={cn("mt-3 whitespace-pre-line break-words", post.kind === "confession" ? "font-display text-lg italic" : "text-[15px]")}>{post.body}</p>

      {post.kind === "poll" ? (
        <div className="mt-3 space-y-2">
          {options.map((o) => {
            const p = pct(o.votes, totalVotes);
            const chosen = myVote === o.id;
            return (
              <button
                key={o.id}
                onClick={() => void vote(o.id)}
                disabled={Boolean(myVote)}
                className={cn(
                  "relative flex h-11 w-full items-center overflow-hidden rounded-xl border px-3 text-left text-sm font-medium transition-colors",
                  chosen ? "border-hot/60" : "border-line",
                  !myVote && "hover:border-line-strong active:scale-[0.99]",
                )}
              >
                {myVote ? <span className={cn("absolute inset-y-0 left-0 transition-all duration-700", chosen ? "bg-hot/25" : "bg-surface-3")} style={{ width: `${p}%` }} /> : null}
                <span className="relative flex-1 truncate">{o.label}</span>
                {myVote ? <span className="relative font-semibold tabular-nums">{p}%</span> : null}
              </button>
            );
          })}
          <p className="text-xs text-dim">{totalVotes} votos{myVote ? "" : " · vota para ver resultados"}</p>
        </div>
      ) : (
        <footer className="mt-3">
          <button onClick={() => void toggleReplies()} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
            <MessageCircle size={16} /> {replyCount ? `${replyCount} ${replyCount === 1 ? "respuesta" : "respuestas"}` : "Responder"}
          </button>
          {showReplies ? (
            <div className="mt-3 space-y-2 border-l-2 border-line pl-3">
              {replies === null ? <p className="text-sm text-dim">Cargando…</p> : null}
              {visibleReplies.map((r) => (
                <div key={r.id} className="group flex items-start gap-2">
                  <span className="text-base leading-6">{r.authorEmoji}</span>
                  <p className="flex-1 text-sm">
                    <span className="font-semibold text-muted">{r.authorName}</span> {r.body}
                    <span className="ml-1.5 text-xs text-dim">{timeAgo(r.createdAt)}</span>
                  </p>
                  <ContentMenu
                    isMine={r.isMine}
                    onDelete={() => void delReply(r.id)}
                    onReport={() => requireAuth("Inicia sesión para denunciar") && onReport({ type: "reply", id: r.id, preview: r.body })}
                  />
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void sendReply()}
                  maxLength={200}
                  placeholder={anon ? "Responde en anónimo…" : "Responde…"}
                  className="field h-10 py-2 text-sm"
                />
                <button
                  onClick={() => setAnon((a) => !a)}
                  aria-label={anon ? "Responder con tu nombre" : "Responder en anónimo"}
                  title={anon ? "Anónimo" : "Con tu nombre"}
                  className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-lg", anon ? "bg-hot/15" : "bg-surface-2")}
                >
                  {anon ? "🎭" : "🙂"}
                </button>
                <button onClick={() => void sendReply()} disabled={busy || !text.trim()} aria-label="Enviar" className="grid size-10 shrink-0 place-items-center rounded-xl bg-hot text-white disabled:opacity-40">
                  <Send size={16} />
                </button>
              </div>
            </div>
          ) : null}
        </footer>
      )}
    </article>
  );
}
