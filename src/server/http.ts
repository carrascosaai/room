import { NextResponse } from "next/server";
import { normalizeRoomCode } from "@/lib/id";
import type { Lang } from "@/game/types";
import type { ActionResult } from "./actions";

export function json(result: ActionResult, status?: number) {
  return NextResponse.json(result, {
    status: status ?? (result.ok ? 200 : 400),
    headers: { "cache-control": "no-store" },
  });
}

export async function readBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export function cleanLang(v: unknown): Lang {
  return v === "es" ? "es" : "en";
}

export function cleanNickname(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, 20) : "";
}

export function code(raw: string): string {
  return normalizeRoomCode(raw);
}
