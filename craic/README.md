# ☘ Craic · Practica inglés hablando con una IA

App web (PWA) para practicar **conversación en inglés** con un personaje nativo,
al estilo ISSEN. Hablas con el micrófono (o escribes), el personaje te responde
en voz alta y, debajo de cada frase tuya, ves las **correcciones en español**.

**Coste cero para todos:** el modelo de lenguaje se ejecuta **dentro del navegador**
con WebGPU gracias a [WebLLM](https://github.com/mlc-ai/web-llm). No hay servidor,
no hay API keys, no hay cuentas. Se aloja gratis en GitHub Pages o Vercel.

---

## Qué hace

- **Personajes:** Liam (Dublín, de visita en Córdoba), Emily (Londres), Jake
  (EE. UU., Erasmus en Córdoba) y Sarah Mitchell (entrevista de prácticas de ingeniería).
- **Niveles:** B1, B2 y C1 (cambia vocabulario y naturalidad del personaje).
- **Voz:** botón grande de «mantener para hablar» (o un toque para empezar y otro
  para enviar), respuestas leídas en voz alta con acento irlandés/británico si el
  dispositivo lo tiene, botón 🔊 para repetir y velocidad lenta/normal.
- **Correcciones:** tarjeta plegable bajo cada mensaje: tu frase → versión natural
  + explicación de una línea en español. Si no hay errores, un consejo para sonar
  más nativo.
- **Una sola pregunta por turno:** se pide en el prompt y además la app corta la
  respuesta justo después de la primera pregunta.
- **Palabras en español:** el personaje te dice cómo se dicen en inglés y sigue.
- **Resumen al terminar:** errores más repetidos por tipo y 5-10 expresiones nuevas.
- **Historial y vocabulario** guardados en el dispositivo (IndexedDB), con
  exportación a JSON o CSV (importable en Anki) y botón para borrarlo todo.
- **Instalable (PWA)**, modo oscuro, pensada para móvil y **funciona sin conexión**
  una vez descargado el modelo.

## Cómo funciona por dentro

```
Tu voz ──► Web Speech API (SpeechRecognition) ──► texto
texto ──► WebLLM (Web Worker + WebGPU) ──► 1) respuesta del personaje ──► speechSynthesis
                                     └──► 2) correcciones en JSON ──► tarjeta en pantalla
```

- **Dos llamadas por turno.** Los modelos pequeños fallan si les pides muchas
  cosas a la vez, así que primero se genera la respuesta (se muestra en streaming
  y se lee en voz alta) y después, en otra llamada, las correcciones.
- **Correcciones robustas.** Se piden en JSON con gramática forzada
  (`response_format` de WebLLM) y ejemplos; además el parser tolera JSON roto,
  cortado o rodeado de texto, descarta «correcciones» que no cambian nada o que
  no aparecen en lo que dijiste, y nunca rompe la app (`src/llm/parse.ts`, con tests).
- **Historial corto:** al modelo solo se le envían los últimos 6 mensajes.

### Modelos

Elegidos de la lista oficial `prebuiltAppConfig.model_list` de
`@mlc-ai/web-llm@0.2.85` (versión fijada en `package.json`):

| Opción | Modelo | Descarga aprox. | Memoria GPU | Para qué |
|---|---|---|---|---|
| **Ligero** (por defecto) | `Llama-3.2-1B-Instruct-q4f16_1-MLC` | ~0,7 GB | ~0,9 GB | Móviles y portátiles normales |
| **Mejor calidad** | `Llama-3.2-3B-Instruct-q4f16_1-MLC` | ~1,8 GB | ~2,3 GB | Ordenadores con buena GPU / móviles potentes |

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

- **Espacio:** ~1 GB libre para el modelo ligero, ~2,5 GB para el de calidad.
- **Memoria:** si el móvil se queda sin memoria, la app lo explica; usa el modelo
  ligero y cierra otras apps.
- **HTTPS obligatorio:** WebGPU y el micrófono solo funcionan en `https://` o `localhost`.
- **Voz:** el reconocimiento de voz lo hace el navegador. En Chrome se procesa en
  los servidores de Google (necesita conexión); en Safari puede ser en el
  dispositivo. Si no hay reconocimiento de voz, la app pasa a modo escrito. El
  modelo de IA y tus datos **nunca** salen del dispositivo.

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

La app es estática (`dist/`), no necesita backend. **No hacen falta cabeceras
especiales** (WebLLM no usa `SharedArrayBuffer`, así que no se necesita
COOP/COEP); `vercel.json` solo añade permisos de micrófono y caché.

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
3. Haz push a `main` (o ve a **Actions → Craic → GitHub Pages → Run workflow**).
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
│   │   ├── engine.ts         WebLLM en Web Worker, cola de peticiones, caché
│   │   ├── prompts.ts        prompts del personaje y de las correcciones
│   │   ├── parse.ts          limpieza y parseo tolerante (+ tests)
│   │   ├── errors.ts         errores traducidos a mensajes en español
│   │   └── mockEngine.ts     motor falso del modo ?demo
│   ├── speech/               reconocimiento de voz y texto a voz
│   ├── lib/                  WebGPU, IndexedDB, preferencias, instalación PWA
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

El código de la app aún no tiene licencia: si la publicas, añade un archivo
`LICENSE` (por ejemplo MIT). Dependencias de código abierto:
WebLLM (Apache-2.0), React (MIT), Vite (MIT), idb (ISC), vite-plugin-pwa (MIT).
Los modelos Llama 3.2 se distribuyen bajo la *Llama 3.2 Community License* de
Meta (uso gratuito; exige mostrar «Built with Llama», que aparece en el pie de la app).
