// Estadísticas de progreso calculadas a partir de las sesiones guardadas.

export interface SessionLike {
  startedAt: number;
  endedAt: number;
  messages: { role: "user" | "assistant"; text: string }[];
  errorStats: { count: number }[];
}

export interface Progress {
  sessions: number;
  minutes: number;
  wordsSpoken: number;
  streak: number;
  practicedToday: boolean;
  /** Errores por intervención en las últimas 5 sesiones vs las 5 anteriores */
  errorRateRecent: number | null;
  errorRatePrevious: number | null;
  /** Minutos por día, últimos 7 días (el último es hoy) */
  week: { label: string; minutes: number }[];
}

const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"];

function sessionMinutes(s: SessionLike) {
  return Math.max(0, (s.endedAt - s.startedAt) / 60000);
}

function errorRate(list: SessionLike[]): number | null {
  let turns = 0;
  let errors = 0;
  for (const s of list) {
    turns += s.messages.filter((m) => m.role === "user").length;
    errors += s.errorStats.reduce((a, e) => a + e.count, 0);
  }
  return turns ? errors / turns : null;
}

export function computeProgress(sessions: SessionLike[], now = Date.now()): Progress {
  const sorted = [...sessions].sort((a, b) => b.endedAt - a.endedAt);
  const days = new Set(sorted.map((s) => dayKey(s.endedAt)));

  // Racha: días seguidos con práctica, contando hoy o (si hoy aún no) desde ayer
  let streak = 0;
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const practicedToday = days.has(dayKey(today.getTime()));
  const cursor = new Date(today);
  if (!practicedToday) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const week: { label: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dayKey(d.getTime());
    const minutes = sorted.filter((s) => dayKey(s.endedAt) === key).reduce((a, s) => a + sessionMinutes(s), 0);
    week.push({ label: DAY_LABELS[d.getDay()], minutes: Math.round(minutes) });
  }

  const wordsSpoken = sorted.reduce(
    (a, s) => a + s.messages.filter((m) => m.role === "user").reduce((b, m) => b + m.text.split(/\s+/).filter(Boolean).length, 0),
    0,
  );

  return {
    sessions: sorted.length,
    minutes: Math.round(sorted.reduce((a, s) => a + sessionMinutes(s), 0)),
    wordsSpoken,
    streak,
    practicedToday,
    errorRateRecent: errorRate(sorted.slice(0, 5)),
    errorRatePrevious: errorRate(sorted.slice(5, 10)),
    week,
  };
}
