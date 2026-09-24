import { beforeEach, describe, expect, it, vi } from "vitest";
import { handle } from "./tts";

const post = (body: unknown) =>
  new Request("https://craic.vercel.app/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://craic.vercel.app", "x-client-id": String(Math.random()) },
    body: JSON.stringify(body),
  });

describe("api/tts", () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = "k";
  });

  it("devuelve el audio del proveedor", async () => {
    const f = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "audio/wav" } }));
    const r = await handle(post({ text: "Hello there!", gender: "male" }), f as unknown as typeof fetch);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("audio/wav");
    const sent = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.input).toBe("Hello there!");
  });

  it("prueba otra voz si una no existe", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"error":{"message":"invalid voice"}}', { status: 400 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1]), { status: 200 }));
    const r = await handle(post({ text: "Hi", gender: "female" }), f as unknown as typeof fetch);
    expect(r.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("rechaza textos vacíos o demasiado largos", async () => {
    expect((await handle(post({ text: "" }))).status).toBe(400);
    expect((await handle(post({ text: "x".repeat(500) }))).status).toBe(400);
  });
});

describe("api/tts · cupo", () => {
  it("GET no gasta cupo y avisa cuando se agota", async () => {
    process.env.GROQ_API_KEY = "k";
    const f = vi.fn(async () => new Response('{"error":{"message":"Rate limit reached for model on requests per day (RPD): Limit 100, Used 100. Please try again in 7m12.5s."}}', { status: 429 }));
    const get = () => handle(new Request("https://craic.vercel.app/api/tts"), f as unknown as typeof fetch);
    expect(await (await get()).json()).toMatchObject({ enabled: true });
    expect(f).not.toHaveBeenCalled();
    const r = await handle(post({ text: "Hi", gender: "male" }), f as unknown as typeof fetch);
    expect(r.status).toBe(429);
    expect(Number(r.headers.get("retry-after"))).toBe(433);
    expect(await (await get()).json()).toMatchObject({ enabled: false, reason: "quota" });
    // Mientras dura, ni se pregunta a Groq.
    expect((await handle(post({ text: "Hi", gender: "male" }), f as unknown as typeof fetch)).status).toBe(429);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
