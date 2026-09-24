# Material para redes

## Vídeos (vertical 1080×1920, ~33 s, con voz)

| Archivo | Idea | Gancho |
|---|---|---|
| `videos/craic-1-gratis.mp4` | Qué es Craic y que es gratis | «¿Llevas años con el inglés y te bloqueas al hablar?» |
| `videos/craic-2-acentos.mp4` | 18 acentos (Liverpool, Escocia, Australia…) | «Si entiendes a uno de Liverpool…» |
| `videos/craic-3-entrevista.mp4` | Practicar entrevistas de trabajo | «¿Entrevista en inglés y te mueres de vergüenza?» |
| `videos/craic-4-frances.mp4` | Ahora también francés (París, Marsella, Bélgica, Suiza, Quebec, Dakar) | «¿Entenderías a una quebequesa?» |

La app que se ve es la real; la conversación está preparada para el vídeo
(micrófono y respuestas simulados) y la narración está hecha con ElevenLabs.

## Textos para publicar

**Vídeo 1 · TikTok / Reels / Shorts**
> Aprende inglés HABLANDO, no rellenando fichas 🗣️ Llamas a un irlandés, una londinense o un tejano (con IA), te contesta al momento y te corrige en español. GRATIS y sin registrarte 👉 craic.vercel.app
> #inglés #aprenderingles #englishtips #inglésfácil #speaking #IA #gratis #estudiantes

**Vídeo 2**
> ¿Entenderías a uno de Liverpool? 😅 18 acentos para practicar: Irlanda, Escocia, Gales, Newcastle, Nueva York, Texas, Australia, Nueva Zelanda, Canadá… Cada uno con su jerga. Gratis 👉 craic.vercel.app
> #inglés #acentos #scouse #aprenderingles #englishaccents #britishenglish #gratis

**Vídeo 3**
> Practica tu entrevista de trabajo en inglés antes de la de verdad 💼 Te pregunta como un reclutador y te corrige en español cada respuesta. Gratis, a cualquier hora 👉 craic.vercel.app
> #entrevistadetrabajo #inglés #trabajo #prácticas #aprenderingles #IA #gratis

**Vídeo 4 (francés)**
> ¿Entenderías a una quebequesa? 🇨🇦 Ahora también puedes practicar FRANCÉS hablando: París, Marsella, Bélgica, Suiza, Montreal, Dakar… Te corrige en español. Gratis y sin registro 👉 craic.vercel.app
> #francés #aprenderfrances #french #frenchtips #quebec #idiomas #IA #gratis

**YouTube (título)**: «Aprende inglés hablando GRATIS con IA (18 acentos y correcciones en español)»

Consejos: publica el mismo vídeo en TikTok, Reels y Shorts; pon el enlace
`craic.vercel.app` en la bio; responde a los comentarios con otro vídeo
(«¿Qué acento quieres que pruebe?»).

## Volver a generar los vídeos

`tools/` contiene el escenario (`stage.html`), el grabador (`record.mjs`, usa
Playwright + CDP screencast; ajusta la ruta de `import` de Playwright a tu equipo) y un guion por vídeo (`v1.mjs`…). Copia `tools/*`
a `dist/video/` junto con las fuentes
`node_modules/@fontsource/rubik/files/rubik-latin-{500,700,900}-normal.woff2`, sirve `dist` con `npx vite preview --port 4175` y ejecuta
`node tools/record.mjs ./v1.mjs /tmp/v1frames`; después une los frames con la
narración con ffmpeg (`-f concat -i list.txt -i narracion.mp3`).
