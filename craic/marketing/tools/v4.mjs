const isCorr = (s) => /correct a Spanish/.test(s);
export default {
  duration: 28.6,
  prefs: { lang: "fr", characterId: "emilie", scenarioId: "free", level: "B1" },
  async setup(h) {
    await h.page.evaluate(() => {
      document.getElementById("flags").innerHTML = ["fr", "be", "ch", "qc", "sn"].map((c) => window.flag(c, 90)).join("");
    });
    await h.app.locator("button.cta").click();
    await h.page.waitForTimeout(2200);
  },
  reply(sys) {
    if (isCorr(sys))
      return '{"errors":[{"original":"je vais","corrected":"je suis allé","explanation":"Con «hier» va en passé composé: je suis allé.","type":"tiempo verbal"}],"tip":""}';
    if (/TRANSLATE/.test(sys)) return "¡Qué guay! ¿Qué peli visteis? ¿Estuvo brutal?";
    return "Ah, trop bien ! Vous avez vu quel film ? C'était ouf ?";
  },
  delay: (sys) => (isCorr(sys) ? 500 : 200),
  captions: [
    [0.0, "¿Entenderías a una <b>quebequesa</b>?"],
    [2.14, "Ahora en Craic…"],
    [3.1, "también puedes practicar <em>francés</em>"],
    [5.27, "Eliges con quién hablar"],
    [6.84, "Una parisina"],
    [8.06, "Uno de Marsella"],
    [9.31, "Un belga · Una suiza"],
    [11.27, "Montreal · Dakar"],
    [13.57, "…y le <em>llamas</em>"],
    [14.69, "Hablas en francés"],
    [16.16, "Te contesta al momento"],
    [17.64, "y te corrige <em>en español</em>"],
    [20.01, "¿No pillas su jerga?"],
    [21.69, "Le das a <em>traducir</em>"],
  ],
  actions: [
    [2.3, (h) => h.tap('button[aria-label="Colgar"]')],
    [3.3, (h) => h.tap("text=Inglés")],
    [4.3, (h) => h.tap("text=Francés")],
    [6.9, (h) => h.tap(".region-chips >> text=Francia")],
    [9.35, (h) => h.tap(".region-chips >> text=Bélgica y Suiza")],
    [11.3, (h) => h.tap(".region-chips >> text=Quebec")],
    [12.3, (h) => h.tap(".region-chips >> text=África")],
    [13.0, (h) => h.tap(".region-chips >> text=Todos")],
    [13.4, (h) => h.tap(".char-card >> nth=0")],
    [13.8, (h) => h.tap("button.cta")],
    [15.3, (h) => h.say("Salut Camille, hier je vais au cinéma avec ma copine", 140)],
    [18.9, (h) => h.app.evaluate(() => { const u = [...document.querySelectorAll(".row-user")].pop(); const m = document.querySelector(".messages"); if (u && m) m.scrollTo({ top: u.offsetTop - 12, behavior: "smooth" }); })],
    [19.7, (h) => h.app.evaluate(() => { const u = [...document.querySelectorAll(".row-user")].pop(); const m = document.querySelector(".messages"); if (u && m) m.scrollTo({ top: u.offsetTop - 12, behavior: "smooth" }); })],
    [21.8, (h) => h.tap(".row-assistant >> nth=-1 >> text=Traducir")],
    [23.1, (h) => h.end("<b style='color:#121212'>Inglés y francés, gratis.</b><br>Sin registro · Sin anuncios")],
    [26.8, (h) => h.end("Inglés y francés · Sin registro<br><b style='color:#121212'>Enlace en el perfil</b>")],
  ],
};
