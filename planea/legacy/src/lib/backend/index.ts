import { IS_DEMO } from "../config";
import { createDemoBackend } from "./demo";
import { createSupabaseBackend } from "./supabase";
import type { Backend } from "./types";

let instance: Backend | null = null;

export function getBackend(): Backend {
  instance ??= IS_DEMO ? createDemoBackend() : createSupabaseBackend();
  return instance;
}

export type { Backend } from "./types";
