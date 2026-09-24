const isCorr = (s) => /correct a Spanish/.test(s);
export default {
  duration: 32.4,
  prefs: { characterId: "kieran", scenarioId: "free", level: "B2" },
  async setup(h) {
    await h.app.locator("button.cta").click();
    await h.page.waitForTimeout(2600);
  },
  reply(sys) {
    if (isCorr(sys)) return '{"errors":[],"tip":"¡Muy bien! Más natural: «I\'m a Real Madrid fan»."}';
    if (/TRANSLATE/.test(sys)) return "¡Genial, tío! El Madrid está bien, pero el Liverpool es mejor. ¿Ves la Premier League?";
    if (/REPHRASE/.test(sys)) return "Great! Real Madrid is good, but I like Liverpool more. Do you watch English football?";
    return "Boss that, la! Madrid are sound, but Liverpool are better. D'you ever watch the Premier League?";
  },
  delay: (sys) => (isCorr(sys) ? 900 : 200),
  captions: [
    [0.0, "Si entiendes a uno de <b>Liverpool</b>…"],
    [1.86, "tu inglés está listo <em>para todo</em>"],
    [3.75, "<em>18 acentos</em> distintos"],
    [7.43, "Irlanda · Escocia · Gales"],
    [9.86, "Liverpool · Newcastle · Nueva York"],
    [12.21, "Texas · Australia · Nueva Zelanda · Canadá"],
    [15.47, "Cada uno habla <em>como en su tierra</em>"],
    [17.52, "«<em>Boss</em>» = algo mola"],
    [20.41, "«<em>Arvo</em>» = la tarde (Australia)"],
    [22.7, "¿Que no pillas algo?"],
    [23.95, "Le das a <em>traducir</em>…"],
    [25.3, "…o a «<em>no entiendo</em>»"],
    [26.37, "y te lo repite <em>más fácil</em>"],
  ],
  actions: [
    [3.9, (h) => h.tap('button[aria-label="Colgar"]')],
    [5.2, (h) => h.tap("text=Todos")],
    [7.5, (h) => h.tap("text=Irlanda")],
    [8.6, (h) => h.tap("text=Reino Unido")],
    [9.9, (h) => h.scroll(260)],
    [11.3, (h) => h.tap("text=EE. UU.")],
    [12.6, (h) => h.tap("text=Australia y NZ")],
    [13.8, (h) => h.tap("text=Canadá")],
    [14.6, (h) => h.tap("text=Todos")],
    [15.1, (h) => h.tap(".char-card >> nth=3")],
    [15.6, (h) => h.tap("button.cta")],
    [17.1, (h) => h.say("I love football and I support Real Madrid", 140)],
    [24.1, (h) => h.tap(".row-assistant >> nth=-1 >> text=Traducir")],
    [25.4, (h) => h.tap(".row-assistant >> nth=-1 >> text=No entiendo")],
    [28.0, (h) => h.end("<b style='color:#121212'>Y todo esto, gratis.</b><br>18 acentos · Sin registro")],
    [29.6, (h) => h.end("18 acentos · Sin registro<br><b style=\"color:#121212\">Pruébalo ya</b>")],
  ],
};
