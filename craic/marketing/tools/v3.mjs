const isCorr = (s) => /correct a Spanish/.test(s);
export default {
  duration: 32.9,
  prefs: { characterId: "interviewer", scenarioId: "interview", level: "B1" },
  reply(sys) {
    if (isCorr(sys))
      return '{"errors":[{"original":"I am study","corrected":"I am studying","explanation":"Presente continuo: am + verbo en -ing.","type":"tiempo verbal"},{"original":"I have did","corrected":"I did","explanation":"No mezcles «have» con pasado: I did / I have done.","type":"gramática"}],"tip":""}';
    if (/expressions/.test(sys))
      return '{"expressions":[{"en":"I\'m studying engineering","es":"Estudio ingeniería","example":"I\'m studying mechanical engineering."},{"en":"My biggest strength is…","es":"Mi mayor punto fuerte es…","example":"My biggest strength is teamwork."},{"en":"I led a project","es":"Dirigí un proyecto","example":"I led a robotics project last year."}]}';
    return "That sounds impressive! What was the biggest challenge in your robotics project?";
  },
  delay: (sys) => (isCorr(sys) ? 2300 : 250),
  captions: [
    [0.0, "¿Entrevista de trabajo en inglés y te <b>mueres de vergüenza</b>?"],
    [4.02, "Practica aquí primero"],
    [6.39, "Una entrevista <em>por llamada</em>"],
    [8.22, "como si fuera de verdad"],
    [9.84, "Tus estudios, tus proyectos…"],
    [12.62, "tus puntos fuertes…"],
    [14.13, "Te dice <em>en español</em> qué has dicho mal"],
    [17.54, "y cómo decirlo <em>mejor</em>"],
    [19.28, "Repítela las veces que quieras"],
    [21.5, "a las <em>3 de la mañana</em> si hace falta"],
    [23.42, "y nadie te juzga"],
    [24.87, "Repasas el vocabulario <em>con tarjetas</em>"],
  ],
  actions: [
    [1.0, (h) => h.tap("text=Entrevista")],
    [4.3, (h) => h.tap("button.cta")],
    [6.9, (h) => h.say("I am study engineering and I have did a project of a robot for my university", 170)],
    [14.6, (h) => h.app.evaluate(() => { const u = [...document.querySelectorAll(".row-user")].pop(); const m = document.querySelector(".messages"); if (u && m) m.scrollTo({ top: u.offsetTop - 12, behavior: "smooth" }); })],
    [15.4, (h) => h.app.evaluate(() => { const u = [...document.querySelectorAll(".row-user")].pop(); const m = document.querySelector(".messages"); if (u && m) m.scrollTo({ top: u.offsetTop - 12, behavior: "smooth" }); })],
    [17.0, (h) => h.app.evaluate(() => { const u = [...document.querySelectorAll(".row-user")].pop(); const m = document.querySelector(".messages"); if (u && m) m.scrollTo({ top: u.offsetTop - 12, behavior: "smooth" }); })],
    [23.5, (h) => h.tap('button[aria-label="Colgar"]')],
    [25.0, (h) => h.tap('button[aria-label="Volver"]')],
    [25.5, (h) => h.tap("text=Repasar")],
    [26.4, (h) => h.tap("button.flash-show")],
    [28.4, (h) => h.end("<b style='color:#121212'>Es gratis. 100% gratis.</b><br>Sin registro · Sin anuncios")],
    [31.3, (h) => h.end("Sin registro · Sin anuncios<br><b style='color:#121212'>Enlace en la bio</b>")],
  ],
};
