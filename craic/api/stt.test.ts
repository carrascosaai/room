import { beforeEach, describe, expect, it, vi } from "vitest";
import { handle } from "./stt";

const post = (bytes: number, lang = "en") =>
  new Request(`https://craic.vercel.app/api/stt?lang=${lang}`, {
    method: "POST",
    headers: { "content-type": "audio/wav", origin: "https://craic.vercel.app", "x-client-id": String(Math.random()) },
    body: new Uint8Array(bytes),
  });

describe("api/stt", () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = "k";
  });

  it("devuelve el texto de Whisper", async () => {
    const f = vi.fn(async () => new Response('{"text":" Hello there "}', { status: 200 }));
    const r = await handle(post(5000, "fr"), f as unknown as typeof fetch);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ text: "Hello there" });
    const form = (f.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(form.get("language")).toBe("fr");
    expect(form.get("prompt")).toBeNull();
  });

  it("pasa al otro modelo si uno está saturado", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429 }))
      .mockResolvedValueOnce(new Response('{"text":"ok"}', { status: 200 }));
    const r = await handle(post(5000), f as unknown as typeof fetch);
    expect(r.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("rechaza audios vacíos", async () => {
    expect((await handle(post(10))).status).toBe(400);
  });

  it("pasa el contexto a Whisper", async () => {
    const f = vi.fn(async () => new Response('{"text":"Córdoba"}', { status: 200 }));
    const req = new Request("https://craic.vercel.app/api/stt?lang=en&prompt=Do%20you%20live%20in%20C%C3%B3rdoba%3F", {
      method: "POST",
      headers: { origin: "https://craic.vercel.app", "x-client-id": "ctx" },
      body: new Uint8Array(5000),
    });
    await handle(req, f as unknown as typeof fetch);
    const form = (f.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(form.get("prompt")).toBe("Do you live in Córdoba?");
  });
});
