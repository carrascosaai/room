const isCorr = (s) => /correct a Spanish/.test(s);
export default {
  duration: 33.2,
  prefs: { characterId: "liam", scenarioId: "free", level: "B1" },
  reply(sys) {
    if (isCorr(sys)) return '{"errors":[{"original":"I go","corrected":"I went","explanation":"Con «yesterday» va en pasado: go → went.","type":"tiempo verbal"}],"tip":""}';
    if (/expressions/.test(sys)) return '{"expressions":[{"en":"It was deadly","es":"Fue una pasada","example":"The concert was deadly!"},{"en":"I went to the beach","es":"Fui a la playa","example":"Yesterday I went to the beach."},{"en":"No bother","es":"No hay problema","example":"Thanks! — No bother."}]}';
    return "Ah, that sounds deadly! Which beach did you go to?";
  },
  delay: (sys) => (isCorr(sys) ? 1300 : 250),
  captions: [
    [0.0, "¿Llevas años con el inglés y te <b>bloqueas</b> al hablar?"],
    [3.14, "Mira esto"],
    [4.17, "Esto es <em>Craic</em>"],
    [5.75, "Eliges con quién hablar"],
    [7.23, "Un irlandés de Dublín"],
    [8.73, "Una chica de Londres"],
    [10.01, "Un tejano…"],
    [10.95, "…y le <em>llamas</em>"],
    [12.09, "Tú hablas"],
    [12.95, "Te contesta al momento"],
    [14.54, "Haces una pausa y <em>se envía solo</em>"],
    [17.07, "Y lo mejor:"],
    [17.84, "te <em>corrige en español</em>"],
    [19.69, "sin cortar la conversación"],
    [21.59, "Al colgar…"],
    [22.35, "resumen con tus fallos y <em>expresiones nuevas</em>"],
    [26.0, "¿Cuánto cuesta?"],
  ],
  actions: [
    [5.9, (h) => h.tap("text=Irlanda")],
    [6.5, (h) => h.tap(".char-card >> nth=0")],
    [8.8, (h) => h.tap("text=Reino Unido")],
    [10.05, (h) => h.tap("text=EE. UU.")],
    [11.0, (h) => h.tap("button.cta")],
    [13.5, (h) => h.say("Yesterday I go to the beach with my friends", 170)],
    [21.7, (h) => h.tap('button[aria-label="Colgar"]')],
    [27.3, (h) => h.end("<b style='color:#121212'>Nada.</b> Sin registro · Sin anuncios<br>Aprende inglés hablando")],
    [30.8, (h) => h.end("Sin registro · Sin anuncios<br><b style='color:#121212'>Enlace en el perfil</b>")],
  ],
};
