import { setUiLang, t, UI_LANGS, useUiLang } from "../i18n";

/** Idioma de la página (se detecta solo; aquí se puede cambiar). */
export function UiLangSelect() {
  const ui = useUiLang();
  return (
    <label className="ui-lang">
      <span aria-hidden="true">🌐</span>
      <select value={ui} onChange={(e) => setUiLang(e.target.value as typeof ui)} aria-label={t("Idioma de la página")}>
        {UI_LANGS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
