import type { Msg } from "../conversation";

export function CorrectionCard({ msg }: { msg: Msg }) {
  if (msg.correctionState === "pending") {
    return <div className="corr corr-pending">Revisando tu frase…</div>;
  }
  if (msg.correctionState === "error" || !msg.corrections) {
    return <div className="corr corr-muted">No se pudo revisar esta frase.</div>;
  }
  const { errors, tip } = msg.corrections;
  if (!errors.length) {
    if (!tip) return <div className="corr corr-ok">✓ ¡Sin errores!</div>;
    return (
      <details className="corr corr-ok">
        <summary>✓ ¡Sin errores! · ver consejo</summary>
        <p className="corr-tip">💡 {tip}</p>
      </details>
    );
  }
  return (
    <details className="corr corr-fix" open>
      <summary>
        ✎ {errors.length} {errors.length === 1 ? "corrección" : "correcciones"}
      </summary>
      <ul>
        {errors.map((e, i) => (
          <li key={i}>
            <div className="corr-line">
              <s>{e.original}</s>
              <span aria-hidden="true"> → </span>
              <strong lang="en">{e.corrected}</strong>
            </div>
            {e.explanation && <p className="corr-expl">{e.explanation}</p>}
            <span className="corr-tag">{e.type}</span>
          </li>
        ))}
      </ul>
      {tip && <p className="corr-tip">💡 {tip}</p>}
    </details>
  );
}
