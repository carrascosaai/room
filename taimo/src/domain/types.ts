// Todas las cantidades se guardan en céntimos (enteros) para evitar errores de redondeo.
export type Cents = number;

export type CategoryId =
  | 'super'
  | 'comer'
  | 'ocio'
  | 'deporte'
  | 'estudios'
  | 'transporte'
  | 'casa'
  | 'compras'
  | 'salud'
  | 'suscripciones'
  | 'otros';

export type ExpenseSource = 'manual' | 'applepay' | 'notificacion' | 'csv';

export interface Expense {
  id: string;
  /** Importe total del pago (lo que salió de la tarjeta de quien pagó). */
  amount: Cents;
  merchant: string;
  category: CategoryId;
  /** ISO 8601 */
  date: string;
  source: ExpenseSource;
  note?: string;
  /** Si es un gasto compartido, el grupo al que pertenece. */
  groupId?: string;
  /** Miembro del grupo que pagó. */
  paidBy?: string;
  /** Parte de cada miembro (céntimos). La suma debe ser igual a `amount`. */
  shares?: Record<string, Cents>;
  /** Última modificación (ISO). Sirve para sincronizar grupos: gana el cambio más reciente. */
  updatedAt?: string;
}

export interface Member {
  id: string;
  name: string;
  /** El usuario de este móvil. Nunca se envía al servidor. */
  isMe?: boolean;
  /** Alguien ya se ha unido al grupo como este miembro desde su móvil. */
  claimed?: boolean;
  updatedAt?: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  members: Member[];
  createdAt: string;
  /** Si el grupo está compartido en la nube: código de invitación y última sincronización. */
  remote?: { code: string; lastSyncAt?: string };
}

/** Pago entre miembros para saldar deudas ("Ana le paga 20 € a Luis"). */
export interface Settlement {
  id: string;
  groupId: string;
  from: string;
  to: string;
  amount: Cents;
  date: string;
  updatedAt?: string;
}

/** Marca de borrado de algo de un grupo compartido, pendiente de enviar al servidor. */
export interface Tombstone {
  kind: 'expense' | 'settlement';
  id: string;
  groupId: string;
  deletedAt: string;
}

export interface Profile {
  name: string;
  /** Código ISO 4217 ("EUR", "NOK"…). */
  currency: string;
  /** Idioma elegido; 'auto' = el del móvil. */
  language?: 'auto' | 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt' | 'ca' | 'eu' | 'gl' | 'nl' | 'sv' | 'nb' | 'da' | 'fi' | 'pl' | 'cs' | 'ro' | 'el' | 'tr' | 'uk';
  /** Si ha iniciado sesión: id y correo de la cuenta (la sesión la guarda Supabase). */
  account?: { id: string; email?: string; provider: 'apple' | 'google' };
}

export interface AppState {
  version: 1;
  onboarded: boolean;
  profile: Profile;
  /** Límite mensual por categoría (céntimos). 0 = sin límite. */
  budgets: Partial<Record<CategoryId, Cents>>;
  expenses: Expense[];
  groups: Group[];
  settlements: Settlement[];
  /** Comercio normalizado -> categoría, aprendido de las correcciones del usuario. */
  learnedCategories: Record<string, CategoryId>;
  tombstones: Tombstone[];
}
