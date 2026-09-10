import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";
import type { RoomStore } from "./types";

let cached: RoomStore | null = null;

export function getStore(): RoomStore {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    cached = new SupabaseStore(url, serviceKey);
  } else {
    cached = new MemoryStore();
  }
  return cached;
}

export function storeKind(): "memory" | "supabase" {
  return getStore().kind;
}

export type { RoomStore } from "./types";
