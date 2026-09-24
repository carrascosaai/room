import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs";
const [, , cfgPath, outDir] = process.argv;
const cfg = (await import(cfgPath)).default;
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-fake-ui-for-media-stream", "--hide-scrollbars"] });
const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await ctx.addInitScript((prefs) => {
  try {
    if (!sessionStorage.getItem("init")) {
      localStorage.clear();
      localStorage.setItem("craic:prefs", JSON.stringify({ voiceEngine: "system", asrEngine: "browser", pause: 1000, mig: 3, ...prefs }));
      sessionStorage.setItem("init", "1");
    }
  } catch {}
  class FakeSR {
    start() { window.__sr = this; }
    stop() { if (window.__sr === this) window.__sr = null; setTimeout(() => this.onend?.(), 10); }
    abort() { if (window.__sr === this) window.__sr = null; setTimeout(() => this.onend?.(), 10); }
  }
  Object.defineProperty(window, "SpeechRecognition", { value: FakeSR, configurable: true });
  Object.defineProperty(window, "webkitSpeechRecognition", { value: FakeSR, configurable: true });
  window.__say = async (text, msPerWord = 260) => {
    for (let i = 0; i < 60 && !window.__sr; i++) await new Promise((r) => setTimeout(r, 50));
    const sr = window.__sr;
    const words = text.split(" ");
    for (let i = 1; i <= words.length; i++) {
      const t = words.slice(0, i).join(" ");
      const res = [{ 0: { transcript: t, confidence: 0.9 }, isFinal: i === words.length, length: 1 }];
      sr?.onresult?.({ resultIndex: 0, results: res });
      await new Promise((r) => setTimeout(r, msPerWord));
    }
  };
  // Voz del sistema simulada (sin audio en el vídeo): dura lo que tardaría en decirse.
  try {
    const synth = window.speechSynthesis;
    synth.speak = (u) => { setTimeout(() => u.onstart?.(), 10); setTimeout(() => u.onend?.(), 250 + u.text.length * (window.__speakMs ?? 9)); };
    synth.cancel = () => {};
  } catch {}
}, cfg.prefs ?? {});
await ctx.route("**/api/chat", async (r) => {
  if (r.request().method() === "GET") return r.fulfill({ contentType: "application/json", body: '{"enabled":true}' });
  const body = JSON.parse(r.request().postData());
  const sys = body.messages[0].content;
  const last = body.messages[body.messages.length - 1].content;
  const text = cfg.reply(sys, last, body) ?? "Okay!";
  const wait = cfg.delay?.(sys, body) ?? 0;
  if (wait) await new Promise((r) => setTimeout(r, wait));
  if (body.stream) {
    const chunks = text.split(/(?<= )/).map((w) => `data: ${JSON.stringify({ choices: [{ delta: { content: w } }] })}\n\n`).join("");
    return r.fulfill({ contentType: "text/event-stream", body: chunks + "data: [DONE]\n\n" });
  }
  return r.fulfill({ contentType: "application/json", body: JSON.stringify({ choices: [{ message: { content: text } }] }) });
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto("http://localhost:4175/video/stage.html");
await page.waitForTimeout(1500);
const app = page.frames().find((f) => f.url().includes("?video"));
const h = {
  page, app,
  cap: (html) => page.evaluate((x) => window.setCap(x), html),
  end: (sub) => page.evaluate((x) => window.showEnd(x), sub),
  say: (t, ms) => app.evaluate(([t, ms]) => window.__say(t, ms), [t, ms]),
  async tap(sel, opts = {}) {
    const loc = typeof sel === "string" ? app.locator(sel).first() : sel;
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const box = await loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.evaluate(([x, y]) => window.tapAt(x, y), [box.x, box.y]);
    await page.waitForTimeout(opts.delay ?? 180);
    await loc.evaluate((el) => el.click());
  },
  scroll: (y) => app.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), y),
};
if (cfg.setup) await cfg.setup(h);

// Grabación: CDP screencast (JPEG de alta calidad con marca de tiempo).
const cdp = await ctx.newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", async (f) => {
  frames.push({ t: f.metadata.timestamp, data: f.data });
  await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
await page.waitForTimeout(400);
const t0 = Date.now() / 1000;
const at = (s) => new Promise((r) => setTimeout(r, Math.max(0, (t0 + s) * 1000 - Date.now())));
const timeline = [...cfg.captions.map(([t, html]) => [t, () => h.cap(html)]), ...cfg.actions].sort((a, b) => a[0] - b[0]);
const running = [];
for (const [t, fn] of timeline) {
  await at(t);
  running.push(Promise.resolve(fn(h)).catch((e) => console.log("action error at", t, e.message)));
}
await at(cfg.duration);
await Promise.all(running.map((p) => Promise.race([p, new Promise((r) => setTimeout(r, 100))])));
await cdp.send("Page.stopScreencast");
await b.close();

// Guardar frames + lista para ffmpeg (duración de cada frame).
const list = [];
frames.sort((a, b) => a.t - b.t);
const usable = frames.filter((f) => f.t >= t0 - 0.5);
let prevKeep = frames.filter((f) => f.t < t0).pop();
if (prevKeep) usable.unshift({ ...prevKeep, t: t0 });
usable.forEach((f, i) => {
  const name = `f${String(i).padStart(5, "0")}.jpg`;
  fs.writeFileSync(`${outDir}/${name}`, Buffer.from(f.data, "base64"));
  const start = Math.max(f.t, t0);
  const next = i + 1 < usable.length ? Math.max(usable[i + 1].t, t0) : t0 + cfg.duration;
  const d = Math.max(0.001, next - start);
  if (f.t >= t0 - 0.001 || i === 0) list.push(`file '${name}'\nduration ${d.toFixed(4)}`);
});
list.push(`file 'f${String(usable.length - 1).padStart(5, "0")}.jpg'`);
fs.writeFileSync(`${outDir}/list.txt`, list.join("\n") + "\n");
console.log("frames", usable.length, "duration", cfg.duration);
