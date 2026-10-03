import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { COMMUNITY_RULES, REPORT_REASONS } from "@/lib/moderation";

export const metadata: Metadata = { title: "Normas de la comunidad y privacidad", alternates: { canonical: "/normas" } };

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> PLANEA
      </Link>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight">Normas de la comunidad</h1>
      <p className="mt-3 text-lg text-muted">PLANEA va de pasarlo bien. El salseo es parte del plan, pero nunca a costa de nadie.</p>
      <ol className="mt-8 space-y-3">
        {COMMUNITY_RULES.map((r, i) => (
          <li key={r} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
            <span className="font-display text-2xl font-extrabold text-lime">{i + 1}</span>
            <span className="pt-1">{r}</span>
          </li>
        ))}
      </ol>
      <h2 className="mt-12 font-display text-2xl font-bold">Privacidad, en serio</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
        <li>Nunca mostramos la ubicación de ninguna persona. Ni en tiempo real ni aproximada.</li>
        <li>&quot;Estoy aquí&quot; y &quot;Me apunto&quot; solo suman a un contador. Nadie ve quién eres.</li>
        <li>Si usas &quot;Usar mi ubicación&quot;, se usa en tu dispositivo para elegir ciudad y calcular distancias. No se envía a nuestros servidores.</li>
        <li>Las publicaciones anónimas son anónimas para el resto de usuarios. Solo moderación puede ver la autoría en caso de denuncia grave.</li>
        <li>Puedes borrar tus publicaciones y tus planes cuando quieras.</li>
      </ul>
      <h2 className="mt-12 font-display text-2xl font-bold">Cómo moderamos</h2>
      <p className="mt-3 text-muted">
        Un filtro automático bloquea teléfonos, emails, direcciones, menciones y lenguaje ofensivo antes de publicar. Cualquiera puede denunciar; con 3 denuncias el
        contenido se oculta hasta que el equipo lo revisa. Motivos de denuncia:
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {REPORT_REASONS.map((r) => (
          <span key={r.id} className="rounded-full border border-line px-3 py-1 text-sm">
            {r.label}
          </span>
        ))}
      </div>
    </main>
  );
}
