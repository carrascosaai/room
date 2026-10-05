import { z } from "zod";
import { PLAN_CATEGORIES } from "./categories";
import { checkContent } from "./moderation";

const clean = (max: number, min = 0) =>
  z
    .string()
    .trim()
    .min(min, min ? `Mínimo ${min} caracteres` : undefined)
    .max(max, `Máximo ${max} caracteres`);

const safe = <T extends z.ZodString>(schema: T) =>
  schema.superRefine((val, ctx) => {
    if (!val) return;
    const r = checkContent(val);
    if (!r.ok) ctx.addIssue({ code: "custom", message: r.reason });
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Introduce un email válido"),
  password: z.string().min(1, "Introduce tu contraseña"),
});

export const registerSchema = z.object({
  displayName: safe(clean(40, 2)),
  email: z.string().trim().email("Introduce un email válido"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
  citySlug: z.string().min(1, "Elige tu ciudad"),
  accept: z.literal(true, { error: "Debes aceptar las normas de la comunidad" }),
});

export const planSchema = z
  .object({
    title: safe(clean(80, 3)),
    placeName: safe(clean(80, 2)),
    venueId: z.string().nullable(),
    category: z.enum(PLAN_CATEGORIES as [string, ...string[]]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Elige una hora"),
    description: safe(clean(500)),
    visibility: z.enum(["public", "link"]),
  })
  .strict();

export const postSchema = z
  .object({
    kind: z.enum(["poll", "question", "confession", "opinion", "prediction"]),
    body: clean(280, 3),
    options: z.array(clean(60, 1)).max(4),
  })
  .refine((v) => v.kind !== "poll" || v.options.length >= 2, { message: "Una encuesta necesita al menos 2 opciones", path: ["options"] });

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa el formulario";
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const k = String(issue.path[0] ?? "_");
    out[k] ??= issue.message;
  }
  return out;
}
