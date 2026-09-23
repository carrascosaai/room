# ☘ Craic · Practica inglés hablando con una IA

App web (PWA) para practicar **conversación en inglés** con un personaje nativo,
al estilo ISSEN. Hablas con el micrófono (o escribes), el personaje te responde
en voz alta y, debajo de cada frase tuya, ves las **correcciones en español**.

**Coste cero para todos:** el modelo de lenguaje se ejecuta **dentro del navegador**
con WebGPU gracias a [WebLLM](https://github.com/mlc-ai/web-llm). No hay servidor,
no hay API keys, no hay cuentas. Se aloja gratis en GitHub Pages o Vercel.

---

## Qué hace

Diseño inspirado en ISSEN: la conversación es una **llamada** con el personaje
(tarjeta de conversación arriba, barra «Listening…» con onda y dock con ideas,
colgar, ajustes y micrófono).

- **Personajes:** Liam (Dublín, de visita en Córdoba), Emily (Londres), Jake
  (EE. UU., Erasmus en Córdoba) y Sarah Mitchell (entrevistas de prácticas de ingeniería).
- **Situaciones (role-play):** charla libre, de tapas, dar indicaciones, planes del
  finde, viajes, tu carrera, resolver un problema; y para Sarah: entrevista
  general, técnica y de situación (STAR).
- **Niveles:** B1, B2 y C1.
- **Como una llamada (manos libres):** te escucha sola; cuando dejas de hablar
  (pausa configurable: 0,65 / 1 / 1,6 s) se envía automáticamente, el personaje
  responde con voz y vuelve a escucharte. El micro del dock pausa/reanuda y, si
  el personaje está hablando, lo interrumpe.
- **Respuesta rápida:** la voz empieza con la primera frase mientras el modelo
  escribe el resto; las correcciones se calculan en segundo plano y nunca
  retrasan tu siguiente turno.
- **Voz natural:** usa las voces «naturales» del navegador si existen (Edge,
  Safari con voces mejoradas) y, si no, Kokoro-82M en máxima calidad por GPU
  (voces elegibles por personaje, ordenadas por calidad).
- **Te entiende bien:** Silero VAD detecta cuándo hablas y Moonshine transcribe
  al instante en tu dispositivo (opción «Preciso» con Whisper small, o el
  reconocimiento del navegador). Sin internet y sin pitidos.
- **Una sola pregunta por turno**, y no repite preguntas que ya hizo.
- **Ayudas:** 💡 ideas de respuesta (con traducción), 🌐 traducir un mensaje,
  🤔 «No entiendo» (lo repite más fácil y despacio), 🐢 repetir despacio,
  👂 modo escucha (oculta el texto para entrenar el oído).
- **Correcciones en español** bajo cada frase: error → versión natural +
  explicación, la **frase completa corregida** y **«Dilo tú»**: la repites y la
  app marca palabra a palabra qué se entendió (puntuación de pronunciación).
- **Palabras en español:** el personaje te da la palabra en inglés y sigue.
- **Resumen al colgar:** errores más repetidos y 5-10 expresiones nuevas.
- **Repasar:** tarjetas con repetición espaciada (ves el español, lo dices en
  inglés, compruebas).
- **Progreso:** racha de días, minutos, palabras dichas, gráfico semanal y
  tendencia de errores.
- **Retomar conversación** si se cierra la pestaña a medias.
- Historial y vocabulario en el dispositivo (IndexedDB), exportación JSON / CSV
  (Anki) y borrado total. **PWA instalable**, modo oscuro, móvil primero,
  **funciona sin conexión** tras la primera descarga.

## Cómo funciona por dentro

```
micro ─► Silero VAD (¿hablas? ¿has parado?) ─► Moonshine ─► texto        [asr.worker, WASM]
texto ─► WebLLM (prioridad alta) ─► frase 1 ─► Kokoro / voz natural ─► altavoz   [llm.worker + tts.worker, GPU]
                                  └─► frase 2 … (se genera mientras suena la 1)
      └► correcciones (prioridad baja, se pausan si vuelves a hablar)
```

- **Dos llamadas por turno con prioridades.** Primero la respuesta (en
  streaming, se corta tras la primera pregunta y empieza a sonar frase a frase);
  después, con prioridad baja, las correcciones. Si vuelves a hablar mientras se
  calculan, se interrumpen y se retoman cuando el modelo queda libre
  (`src/llm/scheduler.ts`, con tests).
- **Prompts cortos** (cada token del prompt cuesta tiempo en cada turno) y
  calentamiento del modelo al cargar para que la primera respuesta no tarde.
- **Correcciones robustas.** JSON con gramática forzada (`response_format` de
  WebLLM) y ejemplos; el parser tolera JSON roto o cortado, descarta
  «correcciones» que no cambian nada o que no aparecen en lo que dijiste, y nunca
  rompe la app (`src/llm/parse.ts`, con tests).
- **Audio en CPU, IA en GPU.** Whisper y Kokoro corren con WebAssembly en otro
  worker para no competir por la GPU con el modelo de lenguaje. Con las
  cabeceras COOP/COEP (ya en `vercel.json`) usan varios hilos y van mucho más rápido.
- **Whisper sin alucinaciones:** se descartan grabaciones sin voz (detector de
  energía) y las frases fantasma típicas («Thank you for watching»…).
- **Historial corto:** al modelo solo se le envían los últimos 6 mensajes.

### Modelos

Elegidos de la lista oficial `prebuiltAppConfig.model_list` de
`@mlc-ai/web-llm@0.2.85` (versión fijada en `package.json`):

| Opción | Modelo | Descarga aprox. | Memoria GPU | Para qué |
|---|---|---|---|---|
| **Ligero** (por defecto) | `Llama-3.2-1B-Instruct-q4f16_1-MLC` | ~0,7 GB | ~0,9 GB | Móviles y portátiles normales |
| **Mejor calidad** | `Llama-3.2-3B-Instruct-q4f16_1-MLC` | ~1,8 GB | ~2,3 GB | Ordenadores con buena GPU / móviles potentes |

Voz y oído (Transformers.js, se descargan una vez y quedan en caché):

| Parte | Modelo | Descarga aprox. |
|---|---|---|
| Voz (máxima calidad, GPU) | `onnx-community/Kokoro-82M-v1.0-ONNX` fp32 | ~330 MB |
| Voz (ligera, CPU) | `onnx-community/Kokoro-82M-v1.0-ONNX` q8 | ~90 MB |
| Detección de voz | `onnx-community/silero-vad` | ~2 MB |
| Transcripción (rápida) | `onnx-community/moonshine-base-ONNX` | ~200 MB |
| Transcripción (precisa) | `Xenova/whisper-small.en` q8 | ~250 MB |

Si el navegador tiene voces naturales (p. ej. Edge), no se descarga Kokoro.

Por qué Llama 3.2: tiene muy buen inglés conversacional para su tamaño, sigue
bien instrucciones, está marcado como apto para dispositivos con pocos recursos
y tiene variante **q4f32** para las GPUs que no soportan `shader-f16` (la app la
elige sola). Se descartaron Qwen3/Qwen3.5 (modo «thinking» que añade latencia),
Phi-3.5 (ventana de contexto de 1k en la versión ligera) y Gemma 3 1B (sin
variante q4f32).

Antes de descargar, la app consulta el **tamaño real** en Hugging Face y te lo
muestra; también avisa si queda poco espacio. El modelo se guarda en la caché del
navegador y las siguientes veces carga en segundos, sin conexión.

Para cambiar de modelo, edita `src/llm/models.ts` (cualquier `model_id` de la
lista de WebLLM sirve).

## Requisitos del dispositivo

| Dispositivo | Navegador |
|---|---|
| Ordenador (Windows, macOS, ChromeOS) | Chrome o Edge actualizados. Linux: puede requerir activar WebGPU en `chrome://flags` |
| Android 12+ con 4 GB de RAM o más | Chrome actualizado |
| iPhone / iPad | Safari con iOS / iPadOS 26 o superior |
| Firefox | WebGPU todavía parcial según sistema; mejor Chrome |

- **Espacio:** ~1,3 GB libres con el modelo ligero (IA + voz + oído), ~2,6 GB con el de calidad.
- **Memoria:** si el móvil se queda sin memoria, la app lo explica; usa el modelo
  ligero y cierra otras apps.
- **HTTPS obligatorio:** WebGPU y el micrófono solo funcionan en `https://` o `localhost`.
- **Voz y privacidad:** con el reconocimiento local (opción por defecto) tu voz
  se transcribe en el dispositivo y no sale de él. Si eliges el reconocimiento «Navegador», en
  Chrome el audio se procesa en los servidores de Google. El modelo de IA, las
  voces y tus datos **nunca** salen del dispositivo.

## Ejecutar en local

Necesitas [Node.js](https://nodejs.org) 20 o superior.

```bash
cd craic
npm install
npm run dev          # abre http://localhost:5173
```

- `http://localhost:5173/?demo` → **modo demo**: respuestas de prueba sin
  descargar el modelo; útil para tocar la interfaz en cualquier navegador.
- `npm test` → tests del parser y del resumen.
- `npm run build && npm run preview` → versión de producción (con service worker)
  en `http://localhost:4173`.

### Probar en tu móvil

El móvil necesita HTTPS, así que lo más fácil es **desplegar** (siguiente sección:
cada push crea una URL nueva). Alternativa en Android con cable USB: en el
ordenador abre `chrome://inspect/#devices` → *Port forwarding* → `5173` →
`localhost:5173`, y en el móvil abre `http://localhost:5173`.

## Desplegar gratis

La app es estática (`dist/`), no necesita backend. `vercel.json` añade las
cabeceras **COOP/COEP** (aislamiento entre orígenes: los modelos de voz usan
varios hilos), permiso de micrófono y caché. En GitHub Pages no se pueden poner
cabeceras: todo funciona igual, pero la voz y Whisper van en un solo hilo (más lentos).

### Opción A: Vercel (plan Hobby, recomendado)

1. Crea una cuenta gratis en [vercel.com](https://vercel.com) con tu GitHub.
2. **Add New… → Project** → importa este repositorio.
3. En **Root Directory** pulsa *Edit* y elige `craic`.
4. Vercel detecta Vite solo (build `npm run build`, salida `dist`). Pulsa **Deploy**.
5. En ~1 minuto tendrás `https://<tu-proyecto>.vercel.app`. Cada push a `main`
   se publica solo, y cada rama tiene su URL de prueba.

### Opción B: GitHub Pages

1. Sube el código a GitHub (el workflow ya está en `.github/workflows/craic-pages.yml`).
2. En el repositorio: **Settings → Pages → Build and deployment → Source:
   «GitHub Actions»**.
3. Ve a **Actions → Craic → GitHub Pages → Run workflow** (se lanza a mano para
   no chocar con Vercel; si prefieres que sea automático, añade `push` en `on:`).
4. La app queda en `https://<tu-usuario>.github.io/<nombre-del-repo>/`.

> Si mueves `craic/` a su propio repositorio, mueve también el workflow a
> `.github/workflows/` del nuevo repo y quita `craic/` de las rutas
> (`working-directory`, `cache-dependency-path`, `path`, `paths`).

## Estructura

```
craic/
├── src/
│   ├── App.tsx               pantallas y carga del modelo
│   ├── characters.ts         personajes, openers y estilo por nivel
│   ├── conversation.ts       turno: respuesta → voz → correcciones
│   ├── summary.ts            errores repetidos y expresiones del resumen
│   ├── llm/
│   │   ├── models.ts         modelos elegidos y tamaño de descarga
│   │   ├── engine.ts         WebLLM en Web Worker, calentamiento, caché
│   │   ├── scheduler.ts      cola con prioridades e interrupción (+ tests)
│   │   ├── prompts.ts        prompts del personaje y de las correcciones
│   │   ├── parse.ts          limpieza y parseo tolerante (+ tests)
│   │   ├── errors.ts         errores traducidos a mensajes en español
│   │   └── mockEngine.ts     motor falso del modo ?demo
│   ├── scenarios.ts          situaciones de role-play
│   ├── speech/
│   │   ├── asr.worker.ts     Silero VAD + Moonshine/Whisper (detecta pausas y transcribe)
│   │   ├── tts.worker.ts     Kokoro en GPU (fp32) o CPU (q8)
│   │   ├── audioModels.ts    carga y progreso de los modelos de audio
│   │   ├── mic.ts            micrófono compartido → trozos de 512 muestras a 16 kHz
│   │   ├── voiceInput.ts     escucha con fin de frase automático (local o navegador)
│   │   ├── asrText.ts        limpieza de transcripciones (+ tests)
│   │   └── tts.ts            voz frase a frase; elige la voz más natural disponible
│   ├── lib/                  WebGPU, IndexedDB, repetición espaciada, progreso,
│   │                         puntuación de pronunciación, borrador, preferencias
│   └── components/           interfaz
├── public/                   iconos
├── vite.config.ts            Vite + PWA (BASE_PATH para subcarpetas)
└── vercel.json
```

## Limitaciones conocidas

- Un modelo de 1B parámetros no es un profesor nativo: a veces se le escapa
  alguna corrección o marca algo que está bien. El de 3B es claramente mejor.
- La primera respuesta tras cargar puede tardar unos segundos más (la GPU
  compila los shaders).
- En iOS, el reconocimiento de voz y la voz del sistema comparten el audio: si la
  voz suena baja después de hablar, sube el volumen o usa auriculares.

## Licencias

Código de la app: licencia MIT (ver `LICENSE`). Dependencias de código abierto:
WebLLM (Apache-2.0), React (MIT), Vite (MIT), idb (ISC), vite-plugin-pwa (MIT).
Los modelos Llama 3.2 se distribuyen bajo la *Llama 3.2 Community License* de
Meta (uso gratuito; exige mostrar «Built with Llama», que aparece en el pie de la app).
