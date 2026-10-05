import type { PostKind } from "@/lib/types";

export const POST_KINDS: { id: PostKind; label: string; emoji: string; placeholder: string; anonDefault: boolean }[] = [
  { id: "poll", label: "Encuesta", emoji: "📊", placeholder: "¿Qué discoteca está más llena hoy?", anonDefault: false },
  { id: "question", label: "Pregunta", emoji: "❓", placeholder: "¿Quién crees que va a acabar liándose esta noche?", anonDefault: true },
  { id: "confession", label: "Confesión", emoji: "🤫", placeholder: "Confiesa algo que haya pasado aquí…", anonDefault: true },
  { id: "opinion", label: "Opinión", emoji: "💬", placeholder: "¿Qué tal está hoy? Cuéntalo.", anonDefault: false },
  { id: "prediction", label: "Predicción", emoji: "🔮", placeholder: "Predicción: hoy va a haber cola a las 2…", anonDefault: false },
];

export const kindOf = (k: PostKind) => POST_KINDS.find((x) => x.id === k)!;
