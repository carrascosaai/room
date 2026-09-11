"use client";

import type { PlayerView, PlayerViewPlayer } from "@/game/view";

const AVATAR_COLORS = ["#e8ff59", "#5ad1ff", "#ff4d5e", "#a78bfa", "#4ade80", "#fb923c", "#f472b6", "#38bdf8", "#facc15", "#2dd4bf"];

export function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

export function Avatar({ player, size = 28 }: { player: PlayerViewPlayer; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-[11px] font-bold text-black"
      style={{ width: size, height: size, background: colorFor(player.id), opacity: player.connected ? 1 : 0.4 }}
    >
      {player.nickname.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function PlayerList({ view, highlight = [] }: { view: PlayerView; highlight?: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {view.players.map((p) => (
        <li
          key={p.id}
          className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-sm ${
            highlight.includes(p.id)
              ? "border-[var(--accent)] bg-[var(--accent)]/10"
              : "border-[var(--border)] bg-[var(--surface)]"
          }`}
        >
          <Avatar player={p} size={22} />
          <span className={p.connected ? "" : "text-[var(--muted)] line-through"}>{p.nickname}</span>
          {view.throneHolderId === p.id ? <span aria-label="throne">👑</span> : null}
          {p.isHost ? <span className="text-[10px] font-mono uppercase text-[var(--muted)]">★</span> : null}
          {view.me?.id === p.id ? (
            <span className="text-[10px] font-mono uppercase text-[var(--muted)]">you</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function Leaderboard({ view }: { view: PlayerView }) {
  const rows = [...view.players].sort((a, b) => b.score - a.score);
  const max = Math.max(1, ...rows.map((r) => r.score));
  return (
    <ul className="space-y-1.5">
      {rows.map((p, i) => (
        <li key={p.id} className="flex items-center gap-3">
          <span className="w-4 text-right font-mono text-xs text-[var(--muted)]">{i + 1}</span>
          <Avatar player={p} size={22} />
          <span className="min-w-0 flex-1 truncate text-sm">
            {p.nickname}
            {view.throneHolderId === p.id ? <span className="ml-1" aria-label="throne">👑</span> : null}
          </span>
          <span className="tabnums text-sm font-semibold">{p.score}</span>
          <span className="relative h-1 w-16 overflow-hidden rounded-full bg-[var(--border)]">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]"
              style={{ width: `${(p.score / max) * 100}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
