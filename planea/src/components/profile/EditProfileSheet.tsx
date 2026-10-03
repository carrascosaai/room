"use client";

import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { CITIES } from "@/lib/cities";
import { cn } from "@/lib/utils";

const EMOJIS = ["🦊", "🐙", "🌙", "🪩", "🌶️", "🦋", "🎧", "🍋", "🐢", "🛹", "🎸", "💃", "🍓", "🪐", "🐸", "😎", "🔥", "🌻"];
const COLORS = ["#C8FF3D", "#FF4D7E", "#5CE1E6", "#FFB547", "#A78BFA", "#3DFFA0"];

export function EditProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, backend, toast, refreshProfile } = useApp();
  const [name, setName] = useState(profile?.displayName ?? "");
  const [emoji, setEmoji] = useState(profile?.avatarEmoji ?? "🙂");
  const [color, setColor] = useState(profile?.avatarColor ?? COLORS[0]!);
  const [age, setAge] = useState(profile?.age ? String(profile.age) : "");
  const [city, setCity] = useState(profile?.citySlug ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const ageNum = age ? Number(age) : null;
    if (ageNum !== null && (!Number.isInteger(ageNum) || ageNum < 16 || ageNum > 99)) return setError("La edad debe estar entre 16 y 99");
    setBusy(true);
    const res = await backend.updateProfile({ displayName: name, avatarEmoji: emoji, avatarColor: color, age: ageNum, citySlug: city || null });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    await refreshProfile();
    toast({ message: "Perfil actualizado" });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Editar perfil">
      <div className="flex justify-center">
        <Avatar emoji={emoji} color={color} size={84} />
      </div>
      <div className="mt-4 grid grid-cols-9 gap-1.5">
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => setEmoji(e)} className={cn("grid aspect-square place-items-center rounded-xl text-xl", emoji === e ? "bg-surface-3 ring-2 ring-lime" : "bg-surface-2")}>
            {e}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        {COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)} aria-label={`Color ${c}`} className={cn("size-8 rounded-full", color === c && "ring-2 ring-white ring-offset-2 ring-offset-surface")} style={{ background: c }} />
        ))}
      </div>
      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium text-muted">Nombre</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="field" />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">Edad (opcional)</span>
          <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="—" className="field" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">Ciudad</span>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="field appearance-none">
            <option value="">—</option>
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      <Button className="mt-5 w-full" size="lg" loading={busy} onClick={() => void save()}>
        Guardar
      </Button>
    </Sheet>
  );
}
