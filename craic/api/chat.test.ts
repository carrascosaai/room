import { beforeEach, describe, expect, it, vi } from "vitest";
import { handle } from "./chat";

const setEnv = (k: string, v?: string) => {
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
};

const post = (body: unknown, origin = "https://craic.vercel.app") =>
  new Request("https://craic.vercel.app/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", origin, "x-real-ip": String(Math.random()) },
    body: JSON.stringify(body),
  });

const msgs = [{ role: "user", content: "Hi" }];

describe("api/chat", () => {
  beforeEach(() => setEnv("GROQ_API_KEY", "test-key"));

  it("reports whether the cloud is enabled", async () => {
    setEnv("GROQ_API_KEY");
    const r = await handle(new Request("https://x/api/chat"));
    expect(await r.json()).toEqual({ enabled: false });
  });

  it("proxies to the provider with the secret key and a capped token limit", async () => {
    const f = vi.fn(async () => new Response('{"choices":[{"message":{"content":"Hey!"}}]}', { status: 200 }));
    const r = await handle(post({ messages: msgs, max_tokens: 99999 }), f as unknown as typeof fetch);
    expect(r.status).toBe(200);
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-key");
    expect(JSON.parse(init.body as string).max_tokens).toBe(700);
  });

  it("falls back to the next model when one is retired", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"error":{"message":"The model `x` has been decommissioned"}}', { status: 400 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const r = await handle(post({ messages: msgs }), f as unknown as typeof fetch);
    expect(r.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
    expect(r.headers.get("x-model")).not.toBe(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string).model);
  });

  it("rejects other origins and oversized input", async () => {
    expect((await handle(post({ messages: msgs }, "https://evil.example"))).status).toBe(403);
    const big = [{ role: "user", content: "x".repeat(30000) }];
    expect((await handle(post({ messages: big }))).status).toBe(400);
    expect((await handle(post({ messages: [{ role: "tool", content: "x" }] }))).status).toBe(400);
  });
});
