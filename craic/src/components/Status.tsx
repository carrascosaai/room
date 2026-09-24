import { useEffect, useState } from "react";

// Página del propietario: /?estado — cupo gratuito de Groq que queda hoy.
type Limits = {
  model?: string;
  status?: number;
  requestsPerDay?: string | null;
  requestsLeftToday?: string | null;
  requestsResetIn?: string | null;
  tokensPerMinute?: string | null;
  tokensLeftThisMinute?: string | null;
  error?: string;
};
type Data = { enabled: boolean; checkedAt?: string; chat?: Limits[]; voice?: Limits; extraProviders?: string[] };

function Bar({ left, total }: { left?: string | null; total?: string | null }) {
  const l = Number(left);
  const t = Number(total);
  if (!t || Number.isNaN(l)) return <p className="muted small">Sin datos</p>;
  const pct = Math.max(0, Math.min(100, (l / t) * 100));
  return (
    <>
      <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar" style={{ width: `${Math.max(pct, 2)}%`, background: pct < 15 ? "var(--red)" : undefined }} />
      </div>
      <p className="small">
        <strong>{l.toLocaleString("es-ES")}</strong> de {t.toLocaleString("es-ES")} peticiones libres hoy ({Math.round(pct)} %)
      </p>
    </>
  );
}

function Block({ title, l }: { title: string; l?: Limits }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {!l ? (
        <p className="muted">—</p>
      ) : l.error || (l.status && l.status >= 400) ? (
        <p className="note note-warn">
          {l.status === 429 ? "Cupo agotado ahora mismo: la app usa el plan B (reintentos / voz del móvil)." : `Error ${l.status ?? ""} ${l.error ?? ""}`}
        </p>
      ) : (
        <>
          <Bar left={l.requestsLeftToday} total={l.requestsPerDay} />
          {l.requestsResetIn && <p className="muted small">Se recarga del todo en: {l.requestsResetIn}</p>}
          {l.tokensPerMinute && (
            <p className="muted small">
              Por minuto: {Number(l.tokensLeftThisMinute).toLocaleString("es-ES")} de {Number(l.tokensPerMinute).toLocaleString("es-ES")} tokens libres
            </p>
          )}
        </>
      )}
    </section>
  );
}

export function Status() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const load = () => {
    setErr("");
    fetch("/api/status", { cache: "no-store" })
      .then((r) => r.json() as Promise<Data>)
      .then(setData, (e) => setErr(String(e)));
  };
  useEffect(load, []);
  return (
    <div className="app">
      <div className="settings">
        <h1 className="section-title">Estado de Craic</h1>
        <p className="muted small">
          Cupo gratuito que queda hoy en Groq (se actualiza cada minuto). Visitas y países: Vercel → proyecto craic → Analytics. Consumo
          detallado: console.groq.com → Dashboard → Usage.
        </p>
        {err && <p className="note note-warn">{err}</p>}
        {!data ? (
          <p className="muted">Cargando…</p>
        ) : !data.enabled ? (
          <p className="note note-warn">La IA en la nube no está configurada (falta GROQ_API_KEY).</p>
        ) : (
          <>
            {data.chat?.map((c) => <Block key={c.model} title={`IA · ${c.model}`} l={c} />)}
            <Block title="Voz realista · Orpheus" l={data.voice} />
            <section className="card">
              <h2>Reserva</h2>
              <p className="small">
                {data.extraProviders?.length
                  ? `Proveedores extra activos: ${data.extraProviders.join(", ")}`
                  : "Sin proveedores extra. Añade GEMINI_API_KEY en Vercel para tener reserva cuando Groq se sature."}
              </p>
            </section>
            <p className="muted small">Comprobado: {data.checkedAt && new Date(data.checkedAt).toLocaleString("es-ES")}</p>
            <div className="actions">
              <button className="btn-dark" onClick={load}>
                Actualizar
              </button>
              <a className="btn-ghost" href="/">
                Volver a la app
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
