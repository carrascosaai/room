import type { Dimension, HypothesisCategory, Localized } from "./types";

// ─────────────────────────────────────────────────────────────
// Hypothesis templates — curated, not free text. A player picks a
// target, then one of these statements (filtered by category).
// Each is dimension+direction tagged so the engine can pick a test
// that actually discriminates between "true" and "false".
// ─────────────────────────────────────────────────────────────

const L = (en: string, es: string): Localized => ({ en, es });

export interface HypothesisTemplate {
  id: string;
  category: HypothesisCategory;
  dimension: Dimension;
  direction: "high" | "low";
  /** RELATIONSHIPS / SPICY: needs a second named player */
  needsComparison?: boolean;
  statement: (target: string, comparison?: string) => Localized;
}

export const HYPOTHESIS_TEMPLATES: HypothesisTemplate[] = [
  // ---------------- LOYALTY ----------------
  {
    id: "loy_help_cost",
    category: "loyalty",
    dimension: "loyalty",
    direction: "high",
    statement: (n) => L(`${n} will help a friend even if it costs them.`, `${n} ayudaría a un amigo aunque le cueste algo.`),
  },
  {
    id: "loy_self_first",
    category: "loyalty",
    dimension: "loyalty",
    direction: "low",
    statement: (n) => L(`${n} prioritizes themselves when there's something to lose.`, `${n} se prioriza a sí mismo/a cuando hay algo que perder.`),
  },
  {
    id: "loy_protects",
    category: "loyalty",
    dimension: "loyalty",
    direction: "high",
    statement: (n) => L(`${n} protects the people they like.`, `${n} protege a la gente que le cae bien.`),
  },
  {
    id: "loy_drops_ally",
    category: "loyalty",
    dimension: "loyalty",
    direction: "low",
    statement: (n) => L(`${n} would drop an ally the moment it stops paying off.`, `${n} dejaría a un aliado en cuanto deje de compensarle.`),
  },
  {
    id: "loy_keeps_word",
    category: "loyalty",
    dimension: "loyalty",
    direction: "high",
    statement: (n) => L(`${n} keeps their word even under pressure.`, `${n} mantiene su palabra incluso bajo presión.`),
  },
  {
    id: "loy_switches",
    category: "loyalty",
    dimension: "loyalty",
    direction: "low",
    statement: (n) => L(`${n} switches sides the second it benefits them.`, `${n} cambia de bando en cuanto le compensa.`),
  },
  {
    id: "loy_sacrifice_self",
    category: "loyalty",
    dimension: "loyalty",
    direction: "high",
    statement: (n) => L(`${n} would take a loss so the group doesn't have to.`, `${n} asumiría una pérdida para que el grupo no tenga que hacerlo.`),
  },
  {
    id: "loy_free_agent",
    category: "loyalty",
    dimension: "loyalty",
    direction: "low",
    statement: (n) => L(`${n} doesn't really owe anyone anything.`, `${n} en el fondo no le debe nada a nadie.`),
  },

  // ---------------- TRUST ----------------
  {
    id: "tru_quick",
    category: "trust",
    dimension: "trust",
    direction: "high",
    statement: (n) => L(`${n} trusts people quickly.`, `${n} confía en la gente rápido.`),
  },
  {
    id: "tru_avoids_high_reward",
    category: "trust",
    dimension: "trust",
    direction: "low",
    statement: (n) => L(`${n} avoids trusting people when the reward is high.`, `${n} evita confiar cuando la recompensa es alta.`),
  },
  {
    id: "tru_follows_trusted",
    category: "trust",
    dimension: "trust",
    direction: "high",
    statement: (n) => L(`${n} follows people they trust, even against their own judgment.`, `${n} sigue a quien confía, incluso contra su propio juicio.`),
  },
  {
    id: "tru_double_checks",
    category: "trust",
    dimension: "trust",
    direction: "low",
    statement: (n) => L(`${n} double-checks everyone, even close friends.`, `${n} lo comprueba todo, hasta con sus amigos más cercanos.`),
  },
  {
    id: "tru_benefit_of_doubt",
    category: "trust",
    dimension: "trust",
    direction: "high",
    statement: (n) => L(`${n} gives people the benefit of the doubt.`, `${n} da el beneficio de la duda.`),
  },
  {
    id: "tru_worst_case",
    category: "trust",
    dimension: "trust",
    direction: "low",
    statement: (n) => L(`${n} assumes the worst until proven otherwise.`, `${n} asume lo peor hasta que le demuestren lo contrario.`),
  },
  {
    id: "tru_open_book",
    category: "trust",
    dimension: "trust",
    direction: "high",
    statement: (n) => L(`${n} trusts this group more than they'd admit.`, `${n} confía en este grupo más de lo que admitiría.`),
  },
  {
    id: "tru_guarded",
    category: "trust",
    dimension: "trust",
    direction: "low",
    statement: (n) => L(`${n} is more guarded than they let on.`, `${n} es más receloso/a de lo que aparenta.`),
  },

  // ---------------- MONEY ----------------
  {
    id: "mon_over_loyalty",
    category: "money",
    dimension: "greed",
    direction: "high",
    statement: (n) => L(`${n} chooses money over loyalty.`, `${n} elige el dinero antes que la lealtad.`),
  },
  {
    id: "mon_share",
    category: "money",
    dimension: "greed",
    direction: "low",
    statement: (n) => L(`${n} would rather share than keep more for themselves.`, `${n} preferiría repartir antes que quedarse con más.`),
  },
  {
    id: "mon_guaranteed",
    category: "money",
    dimension: "risk",
    direction: "low",
    statement: (n) => L(`${n} prefers a guaranteed reward.`, `${n} prefiere una recompensa garantizada.`),
  },
  {
    id: "mon_high_reward_risk",
    category: "money",
    dimension: "risk",
    direction: "high",
    statement: (n) => L(`${n} takes risks when the reward is high enough.`, `${n} arriesga cuando la recompensa merece la pena.`),
  },
  {
    id: "mon_sacrifice_friend",
    category: "money",
    dimension: "greed",
    direction: "high",
    statement: (n) => L(`${n} would sacrifice a friend's points for their own gain.`, `${n} sacrificaría los puntos de un amigo por beneficio propio.`),
  },
  {
    id: "mon_gives_up_points",
    category: "money",
    dimension: "greed",
    direction: "low",
    statement: (n) => L(`${n} gives up points if it helps the group win.`, `${n} cede puntos si eso ayuda a ganar al grupo.`),
  },
  {
    id: "mon_counts_everything",
    category: "money",
    dimension: "greed",
    direction: "high",
    statement: (n) => L(`${n} is keeping score of every point, even now.`, `${n} lleva la cuenta de cada punto, incluso ahora.`),
  },
  {
    id: "mon_doesnt_care",
    category: "money",
    dimension: "greed",
    direction: "low",
    statement: (n) => L(`${n} genuinely doesn't care much about the score.`, `${n} de verdad no le importa mucho la puntuación.`),
  },

  // ---------------- SOCIAL ----------------
  {
    id: "soc_follows_majority",
    category: "social",
    dimension: "conformity",
    direction: "high",
    statement: (n) => L(`${n} follows the majority.`, `${n} sigue a la mayoría.`),
  },
  {
    id: "soc_against_group",
    category: "social",
    dimension: "contrarianism",
    direction: "high",
    statement: (n) => L(`${n} is willing to go against the group.`, `${n} está dispuesto/a a ir contra el grupo.`),
  },
  {
    id: "soc_changes_after_seeing",
    category: "social",
    dimension: "conformity",
    direction: "high",
    statement: (n) => L(`${n} changes their decision after seeing what others do.`, `${n} cambia su decisión al ver lo que hacen los demás.`),
  },
  {
    id: "soc_own_mind",
    category: "social",
    dimension: "conformity",
    direction: "low",
    statement: (n) => L(`${n} makes up their own mind regardless of the room.`, `${n} decide por su cuenta, le diga lo que le diga la sala.`),
  },
  {
    id: "soc_rarely_unpopular",
    category: "social",
    dimension: "contrarianism",
    direction: "low",
    statement: (n) => L(`${n} rarely picks the unpopular option.`, `${n} casi nunca elige la opción impopular.`),
  },
  {
    id: "soc_reads_room",
    category: "social",
    dimension: "socialAlignment",
    direction: "high",
    statement: (n) => L(`${n} reads the room and adapts.`, `${n} lee el ambiente y se adapta.`),
  },
  {
    id: "soc_out_of_step",
    category: "social",
    dimension: "socialAlignment",
    direction: "low",
    statement: (n) => L(`${n} is out of step with the room more than they realize.`, `${n} va a contracorriente más de lo que cree.`),
  },
  {
    id: "soc_needs_approval",
    category: "social",
    dimension: "conformity",
    direction: "high",
    statement: (n) => L(`${n} needs the group's approval more than they'd admit.`, `${n} necesita la aprobación del grupo más de lo que admitiría.`),
  },

  // ---------------- COMPETITION ----------------
  {
    id: "com_sacrifice_other",
    category: "competition",
    dimension: "competitiveness",
    direction: "high",
    statement: (n) => L(`${n} would sacrifice another player to win.`, `${n} sacrificaría a otro jugador por ganar.`),
  },
  {
    id: "com_winning_over_coop",
    category: "competition",
    dimension: "competitiveness",
    direction: "high",
    statement: (n) => L(`${n} prefers winning over cooperation.`, `${n} prefiere ganar antes que cooperar.`),
  },
  {
    id: "com_aggressive_behind",
    category: "competition",
    dimension: "competitiveness",
    direction: "high",
    statement: (n) => L(`${n} becomes more aggressive when behind.`, `${n} se vuelve más agresivo/a cuando va perdiendo.`),
  },
  {
    id: "com_everyone_well",
    category: "competition",
    dimension: "competitiveness",
    direction: "low",
    statement: (n) => L(`${n} would rather everyone did well than win alone.`, `${n} prefiere que a todos les vaya bien antes que ganar solo/a.`),
  },
  {
    id: "com_plays_safe",
    category: "competition",
    dimension: "competitiveness",
    direction: "low",
    statement: (n) => L(`${n} plays it safe even when winning is on the line.`, `${n} juega seguro incluso cuando se juega ganar.`),
  },
  {
    id: "com_keeps_score",
    category: "competition",
    dimension: "competitiveness",
    direction: "high",
    statement: (n) => L(`${n} keeps score even when nobody's watching.`, `${n} lleva la cuenta aunque nadie esté mirando.`),
  },
  {
    id: "com_doesnt_mind_losing",
    category: "competition",
    dimension: "competitiveness",
    direction: "low",
    statement: (n) => L(`${n} genuinely doesn't mind losing.`, `${n} de verdad no le importa perder.`),
  },
  {
    id: "com_wants_credit",
    category: "competition",
    dimension: "competitiveness",
    direction: "high",
    statement: (n) => L(`${n} wants credit for winning, not just the points.`, `${n} quiere el mérito de ganar, no solo los puntos.`),
  },

  // ---------------- RELATIONSHIPS (pairwise) ----------------
  {
    id: "rel_helps_more",
    category: "relationships",
    dimension: "loyalty",
    direction: "high",
    needsComparison: true,
    statement: (n, c) => L(`${n} is more likely to help ${c} than anyone else here.`, `${n} tiene más papeletas de ayudar a ${c} que a nadie más aquí.`),
  },
  {
    id: "rel_chooses_over_group",
    category: "relationships",
    dimension: "loyalty",
    direction: "high",
    needsComparison: true,
    statement: (n, c) => L(`${n} would choose ${c} over the rest of the group.`, `${n} elegiría a ${c} antes que al resto del grupo.`),
  },
  {
    id: "rel_protects_specifically",
    category: "relationships",
    dimension: "loyalty",
    direction: "high",
    needsComparison: true,
    statement: (n, c) => L(`${n} protects ${c} specifically.`, `${n} protege a ${c} en concreto.`),
  },
  {
    id: "rel_trusts_more",
    category: "relationships",
    dimension: "trust",
    direction: "high",
    needsComparison: true,
    statement: (n, c) => L(`${n} trusts ${c} more than most people here.`, `${n} confía en ${c} más que en la mayoría de aquí.`),
  },
  {
    id: "rel_not_that_close",
    category: "relationships",
    dimension: "loyalty",
    direction: "low",
    needsComparison: true,
    statement: (n, c) => L(`${n} isn't as close to ${c} as it looks.`, `${n} no está tan unido/a a ${c} como parece.`),
  },
  {
    id: "rel_would_pick",
    category: "relationships",
    dimension: "trust",
    direction: "high",
    needsComparison: true,
    statement: (n, c) => L(`${n} would pick ${c} first if it counted.`, `${n} elegiría a ${c} primero si contara de verdad.`),
  },
  {
    id: "rel_owes_them",
    category: "relationships",
    dimension: "loyalty",
    direction: "high",
    needsComparison: true,
    statement: (n, c) => L(`${n} feels like they owe ${c} one.`, `${n} siente que le debe una a ${c}.`),
  },
  {
    id: "rel_competes_with",
    category: "relationships",
    dimension: "trust",
    direction: "low",
    needsComparison: true,
    statement: (n, c) => L(`${n} secretly sees ${c} as competition, not an ally.`, `${n} en el fondo ve a ${c} como competencia, no como aliado/a.`),
  },

  // ---------------- SPICY (optional, pairwise, behavior-only) ----------------
  {
    id: "spy_pick_over_anyone",
    category: "spicy",
    dimension: "trust",
    direction: "high",
    needsComparison: true,
    statement: (n, c) => L(`${n} would pick ${c} over anyone else here.`, `${n} elegiría a ${c} antes que a cualquier otra persona aquí.`),
  },
  {
    id: "spy_more_influenced",
    category: "spicy",
    dimension: "conformity",
    direction: "high",
    needsComparison: true,
    statement: (n, c) => L(`${n} is more influenced by ${c} than they'd admit.`, `${n} se deja influir por ${c} más de lo que admitiría.`),
  },
  {
    id: "spy_protect_first",
    category: "spicy",
    dimension: "loyalty",
    direction: "high",
    needsComparison: true,
    statement: (n, c) => L(`${n} would protect ${c} first if it came down to it.`, `${n} protegería a ${c} antes que a nadie si tuviera que elegir.`),
  },
  {
    id: "spy_acts_different",
    category: "spicy",
    dimension: "consistency",
    direction: "low",
    needsComparison: true,
    statement: (n, c) => L(`${n} acts differently when ${c} is watching.`, `${n} actúa distinto cuando ${c} está mirando.`),
  },
  {
    id: "spy_pay_more_attention",
    category: "spicy",
    dimension: "socialAlignment",
    direction: "high",
    needsComparison: true,
    statement: (n, c) => L(`${n} pays more attention to ${c}'s reactions than anyone else's.`, `${n} está más pendiente de cómo reacciona ${c} que de nadie más.`),
  },
  {
    id: "spy_softer_with",
    category: "spicy",
    dimension: "competitiveness",
    direction: "low",
    needsComparison: true,
    statement: (n, c) => L(`${n} goes easier on ${c} than on everyone else.`, `${n} es más blando/a con ${c} que con el resto.`),
  },
];

export const HYPOTHESIS_CATEGORIES: HypothesisCategory[] = [
  "loyalty",
  "trust",
  "money",
  "social",
  "competition",
  "relationships",
  "spicy",
];

export function templatesForCategory(category: HypothesisCategory): HypothesisTemplate[] {
  return HYPOTHESIS_TEMPLATES.filter((t) => t.category === category);
}

export function templateById(id: string): HypothesisTemplate | undefined {
  return HYPOTHESIS_TEMPLATES.find((t) => t.id === id);
}

/** A counter-theory needs the opposite direction on the same dimension,
 *  and (if the original needed a comparison) is allowed to skip it —
 *  a counter can simply be "no, {target} is loyal in general" without
 *  naming a third player. */
export function counterCandidates(original: HypothesisTemplate): HypothesisTemplate[] {
  return HYPOTHESIS_TEMPLATES.filter(
    (t) => t.dimension === original.dimension && t.direction !== original.direction && t.id !== original.id,
  );
}
