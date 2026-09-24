import { t } from "../i18n";
import { useState } from "react";
import type { Msg } from "../conversation";
import { addOneVocab } from "../lib/db";
import type { TargetLang } from "../lang";
import { applyCorrections } from "../llm/parse";
import { PracticeSpeech } from "./PracticeSpeech";

interface Props {
  msg: Msg;
  listenOnce: () => Promise<string>;
  onStopListening: () => void;
  onSay: (text: string) => void;
  lang?: TargetLang;
}

export function CorrectionCard({ msg, listenOnce, onStopListening, onSay, lang }: Props) {
  const [saved, setSaved] = useState<Set<number>>(new Set());

  if (msg.correctionState === "pending") {
    return <div className="corr corr-pending">{t("Revisando tu frase…")}</div>;
  }
  if (msg.correctionState === "error" || !msg.corrections) {
    return <div className="corr corr-muted">{t("No se pudo revisar esta frase.")}</div>;
  }
  const { errors, tip } = msg.corrections;
  if (!errors.length) {
    if (!tip) return <div className="corr corr-ok">{t("✓ ¡Sin errores!")}</div>;
    return (
      <details className="corr corr-ok">
        <summary>{t("✓ ¡Sin errores! · ver consejo")}</summary>
        <p className="corr-tip">💡 {tip}</p>
      </details>
    );
  }
  const full = applyCorrections(msg.text, errors);

  const save = async (i: number) => {
    const e = errors[i];
    await addOneVocab({ en: e.corrected, es: e.explanation || t("en vez de «{x}»", { x: e.original }), example: full ?? "", lang });
    setSaved((s) => new Set(s).add(i));
  };

  return (
    <details className="corr corr-fix" open>
      <summary>
        ✎ {errors.length === 1 ? t("1 corrección") : t("{n} correcciones", { n: errors.length })}
      </summary>
      <ul>
        {errors.map((e, i) => (
          <li key={i}>
            <div className="corr-line">
              <s>{e.original}</s>
              <span aria-hidden="true"> → </span>
              <strong lang={lang ?? "en"}>{e.corrected}</strong>
            </div>
            {e.explanation && <p className="corr-expl">{e.explanation}</p>}
            <div className="corr-meta">
              <span className="corr-tag">{e.type}</span>
              <button className="link-btn" onClick={() => void save(i)} disabled={saved.has(i)}>
                {saved.has(i) ? t("✓ Guardada") : t("+ A mi vocabulario")}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {full && (
        <div className="corr-full">
          <small>{t("Versión natural")}</small>
          <p lang={lang ?? "en"}>{full}</p>
          <PracticeSpeech target={full} listenOnce={listenOnce} onStop={onStopListening} onListen={() => onSay(full)} />
        </div>
      )}
      {tip && <p className="corr-tip">💡 {tip}</p>}
    </details>
  );
}
