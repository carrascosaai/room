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

export type ExpenseSource = 'manual' | 'applepay' | 'notificacion' | 'csv' | 'fijo';

/** Cómo se reparte un gasto de grupo. */
export type SplitMode = 'equal' | 'weights' | 'exact' | 'items';

/** Una línea del ticket en el reparto por productos (importe en la moneda en que se pagó). */
export interface ReceiptItem {
  name: string;
  amount: Cents;
  /** Quiénes lo comparten. */
  who: string[];
}

/** Importe original cuando se pagó en otra moneda (p. ej. 3.000 JPY en un viaje). */
export interface OriginalAmount {
  amount: Cents;
  currency: string;
  /** Unidades de la moneda base (la del grupo o la tuya) por 1 unidad de la original, fijado el día del gasto. */
  rate: number;
}

export interface Expense {
  /** App de Android que avisó del pago (para poder ignorarla). */
  app?: string;
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
  /** Cómo se calcularon las partes (para poder editarlo igual). */
  splitMode?: SplitMode;
  /** Pesos usados con splitMode 'weights' (p. ej. { ana: 60, luis: 40 }). */
  weights?: Record<string, number>;
  /** Líneas del ticket con splitMode 'items'. */
  items?: ReceiptItem[];
  /** Si se pagó en otra moneda: importe y tipo de cambio originales. `amount` ya está convertido. */
  original?: OriginalAmount;
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
  /** Cómo cobra este miembro (lo comparte él desde su móvil). */
  pay?: PaymentInfo;
}

export type GroupKind = 'couple' | 'flat' | 'trip' | 'other';

/** Gasto fijo que se repite cada mes (alquiler, luz, Netflix compartido…). */
export interface Recurring {
  id: string;
  name: string;
  amount: Cents;
  category: CategoryId;
  paidBy: string;
  /** Día del mes en que se apunta (1–28). */
  day: number;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  members: Member[];
  createdAt: string;
  kind?: GroupKind;
  /** Moneda en la que se llevan las cuentas del grupo (por defecto, la tuya). */
  currency?: string;
  /** Reparto por defecto: peso de cada miembro (pareja 60/40, familia con 2 adultos…). */
  weights?: Record<string, number>;
  /** Presupuesto: total del viaje, o mensual para pareja y piso. */
  budget?: Cents;
  /** Fechas del viaje (ISO, solo fecha). */
  trip?: { start?: string; end?: string };
  recurring?: Recurring[];
  /**
   * Ids de gastos fijos de un mes (`fijo-<r>-<YYYY-MM>`) que se borraron a mano:
   * no se vuelven a crear solos. Se sincroniza con los ajustes del grupo.
   */
  recurringSkipped?: string[];
  /** «Paga tu parte»: la cuenta de la mesa cuyo QR enseñaste (los avisos de pago se casan por su id). */
  table?: import('./table').TableBill;
  /** Bote común: cada uno pone dinero y los gastos comunes se pagan de ahí. */
  pot?: boolean;
  /** Última modificación de los ajustes del grupo (para sincronizar). */
  updatedAt?: string;
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
  /** Tu moneda (ISO 4217: "EUR", "NOK"…). Todo lo personal se cuenta en ella. */
  currency: string;
  /** Idioma elegido; 'auto' = el del móvil. */
  language?: 'auto' | 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt' | 'ca' | 'eu' | 'gl' | 'nl' | 'sv' | 'nb' | 'da' | 'fi' | 'pl' | 'cs' | 'ro' | 'el' | 'tr' | 'uk';
  /** Si ha iniciado sesión: id y correo de la cuenta (la sesión la guarda Supabase). */
  account?: { id: string; email?: string; provider: 'apple' | 'google' };
  /** Cómo te pagan los demás: se añade a los recordatorios de deudas. */
  payment?: PaymentInfo;
  /** Cuándo cambiaste «Cómo te pagan» (para mandarlo a tus grupos). */
  paymentAt?: string;
  /** Pedir Face ID / huella / código al abrir la app. */
  lock?: boolean;
  /** Apariencia: la del móvil, clara u oscura. */
  theme?: 'auto' | 'light' | 'dark';
  /** Para traducir gastos a horas de trabajo (opcional, solo en tu móvil). */
  income?: { monthly: Cents; hoursPerWeek: number };
}

export interface PaymentInfo {
  bizum?: string;
  iban?: string;
  /** Usuario de paypal.me */
  paypal?: string;
  /** Usuario de revolut.me */
  revolut?: string;
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
  /** Últimos tipos de cambio descargados (base EUR). */
  fx?: { date: string; fetchedAt: string; rates: Record<string, number>; source: 'online' | 'fallback' };
  /** Monedas usadas hace poco (para tenerlas a mano en viajes). */
  recentCurrencies?: string[];
  /** Metas de ahorro (no cuentan como gasto). */
  goals?: Goal[];
  /** Mes (YYYY-MM) en el que ya apartaste lo que te sobraba, para no volver a proponerlo. */
  leftoverMonth?: string;
  /** Apps de Android cuyos avisos de pago no quieres que se apunten. */
  ignoredApps?: string[];
  /** Gastos que dijiste que no eran del viaje (para no volver a proponerlo). */
  tripDismissed?: string[];
  /** Retos de ahorro empezados. */
  challenges?: import('./challenges').Challenge[];
  /** Lista de deseos con la regla de las 48 horas. */
  wishes?: import('./habits').Wish[];
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: Cents;
  saved: Cents;
  /** Fecha límite opcional (YYYY-MM-DD). */
  deadline?: string;
  createdAt: string;
}
