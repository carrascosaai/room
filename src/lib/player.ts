// Per-room anonymous identity, stored only in the player's own browser.

const NS = "room.player.";

export function getStoredPlayer(code: string): { id: string; nickname: string } | null {
  try {
    const raw = localStorage.getItem(NS + code);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === "string") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function storePlayer(code: string, id: string, nickname: string): void {
  try {
    localStorage.setItem(NS + code, JSON.stringify({ id, nickname }));
  } catch {
    /* ignore */
  }
}

export function clearPlayer(code: string): void {
  try {
    localStorage.removeItem(NS + code);
  } catch {
    /* ignore */
  }
}

export function getLastNickname(): string {
  try {
    return localStorage.getItem("room.nickname") ?? "";
  } catch {
    return "";
  }
}

export function rememberNickname(n: string): void {
  try {
    localStorage.setItem("room.nickname", n);
  } catch {
    /* ignore */
  }
}
