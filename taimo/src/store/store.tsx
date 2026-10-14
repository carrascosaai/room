import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';

import { findDuplicate, type CapturePayload } from '@/domain/capture';
import { normalizeMerchant } from '@/domain/categorize';
import { applySnapshot, groupFromSnapshot, type GroupSnapshot } from '@/domain/sync';
import type { AppState, CategoryId, Cents, Expense, Goal, Group, Member, PaymentInfo, Settlement } from '@/domain/types';
import { FALLBACK, rateBetween } from '@/fx/fx';

const STORAGE_KEY = 'taimo:state:v1';

/** Los gastos siempre van del más reciente al más antiguo (sort estable: empates quedan igual). */
const byDate = (list: Expense[]) => [...list].sort((a, b) => b.date.localeCompare(a.date));

export const initialState: AppState = {
  version: 1,
  onboarded: false,
  profile: { name: '', currency: 'EUR', language: 'auto' },
  budgets: {},
  expenses: [],
  groups: [],
  settlements: [],
  learnedCategories: {},
  tombstones: [],
};

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'completeOnboarding'; name: string; budgets: AppState['budgets']; currency?: string }
  | { type: 'setProfileName'; name: string }
  | { type: 'setPayment'; payment: PaymentInfo }
  | { type: 'setLock'; lock: boolean }
  | { type: 'setTheme'; theme: 'auto' | 'light' | 'dark' }
  | { type: 'addGoal'; goal: Goal }
  | { type: 'saveToGoal'; id: string; amount: Cents; leftoverMonth?: string }
  | { type: 'deleteGoal'; id: string }
  | { type: 'toggleIgnoredApp'; app: string }
  | { type: 'dismissTrip'; ids: string[] }
  | { type: 'setLanguage'; language: NonNullable<AppState['profile']['language']> }
  | { type: 'setCurrency'; currency: string }
  | { type: 'setAccount'; account: AppState['profile']['account'] }
  | { type: 'restoreBackup'; state: AppState }
  | { type: 'setBudget'; category: CategoryId; amount: Cents }
  | { type: 'addExpense'; expense: Expense }
  | { type: 'updateExpense'; expense: Expense }
  | { type: 'deleteExpense'; id: string }
  | { type: 'addGroup'; group: Group }
  | { type: 'updateGroup'; groupId: string; changes: Partial<Omit<Group, 'id' | 'members' | 'remote'>> }
  | { type: 'setFx'; fx: NonNullable<AppState['fx']> }
  | { type: 'useCurrency'; currency: string }
  | { type: 'addMember'; groupId: string; member: Member }
  | { type: 'deleteGroup'; id: string }
  | { type: 'addSettlement'; settlement: Settlement }
  | { type: 'importExpenses'; expenses: Expense[] }
  | { type: 'setGroupRemote'; groupId: string; code: string }
  | { type: 'applySnapshot'; groupId: string; snapshot: GroupSnapshot; syncStartedAt: string }
  | { type: 'joinGroup'; snapshot: GroupSnapshot; meMemberId: string; newMemberName?: string }
  | { type: 'reset' };

const now = () => new Date().toISOString();

function learn(state: AppState, merchant: string, category: CategoryId): AppState['learnedCategories'] {
  const key = normalizeMerchant(merchant);
  if (!key) return state.learnedCategories;
  return { ...state.learnedCategories, [key]: category };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return { ...initialState, ...action.state };
    case 'completeOnboarding':
      return {
        ...state,
        onboarded: true,
        profile: { ...state.profile, name: action.name, currency: action.currency ?? state.profile.currency },
        budgets: action.budgets,
      };
    case 'setProfileName':
      return { ...state, profile: { ...state.profile, name: action.name } };
    case 'addGoal':
      return { ...state, goals: [...(state.goals ?? []), action.goal] };
    case 'saveToGoal':
      return {
        ...state,
        goals: (state.goals ?? []).map((g) => (g.id === action.id ? { ...g, saved: Math.max(0, g.saved + action.amount) } : g)),
        leftoverMonth: action.leftoverMonth ?? state.leftoverMonth,
      };
    case 'dismissTrip':
      return { ...state, tripDismissed: [...(state.tripDismissed ?? []), ...action.ids].slice(-500) };
    case 'toggleIgnoredApp': {
      const ignored = state.ignoredApps ?? [];
      return { ...state, ignoredApps: ignored.includes(action.app) ? ignored.filter((a) => a !== action.app) : [...ignored, action.app] };
    }
    case 'deleteGoal':
      return { ...state, goals: (state.goals ?? []).filter((g) => g.id !== action.id) };
    case 'setTheme':
      return { ...state, profile: { ...state.profile, theme: action.theme } };
    case 'setLock':
      return { ...state, profile: { ...state.profile, lock: action.lock } };
    case 'setPayment':
      return { ...state, profile: { ...state.profile, payment: action.payment } };
    case 'setLanguage':
      return { ...state, profile: { ...state.profile, language: action.language } };
    case 'setCurrency':
      return { ...state, profile: { ...state.profile, currency: action.currency } };
    case 'setAccount':
      return { ...state, profile: { ...state.profile, account: action.account } };
    case 'restoreBackup':
      // La copia manda, pero la cuenta con la que se ha entrado es la de ahora.
      return { ...initialState, ...action.state, onboarded: true, profile: { ...action.state.profile, account: state.profile.account } };
    case 'setBudget':
      return { ...state, budgets: { ...state.budgets, [action.category]: action.amount } };
    case 'addExpense':
      return { ...state, expenses: byDate([{ ...action.expense, updatedAt: now() }, ...state.expenses]) };
    case 'importExpenses': {
      const known = new Set(state.expenses.map((e) => e.id));
      const fresh = action.expenses.filter((e) => !known.has(e.id)).map((e) => ({ ...e, updatedAt: e.updatedAt ?? now() }));
      return { ...state, expenses: [...fresh, ...state.expenses].sort((a, b) => b.date.localeCompare(a.date)) };
    }
    case 'updateExpense': {
      const prev = state.expenses.find((e) => e.id === action.expense.id);
      // Si el usuario cambia la categoría, la recordamos para ese comercio.
      const learnedCategories =
        prev && prev.category !== action.expense.category
          ? learn(state, action.expense.merchant, action.expense.category)
          : state.learnedCategories;
      return {
        ...state,
        learnedCategories,
        expenses: byDate(state.expenses.map((e) => (e.id === action.expense.id ? { ...action.expense, updatedAt: now() } : e))),
      };
    }
    case 'deleteExpense': {
      const target = state.expenses.find((e) => e.id === action.id);
      const shared = target?.groupId && state.groups.some((g) => g.id === target.groupId && g.remote);
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.id),
        // En un grupo compartido hay que avisar a los demás de que se ha borrado.
        tombstones: shared
          ? [...state.tombstones, { kind: 'expense', id: action.id, groupId: target!.groupId!, deletedAt: now() }]
          : state.tombstones,
      };
    }
    case 'addGroup':
      return { ...state, groups: [...state.groups, { ...action.group, updatedAt: action.group.updatedAt ?? now() }] };
    case 'updateGroup':
      return {
        ...state,
        groups: state.groups.map((g) => (g.id === action.groupId ? { ...g, ...action.changes, updatedAt: now() } : g)),
      };
    case 'setFx':
      return { ...state, fx: action.fx };
    case 'useCurrency': {
      // Las últimas monedas usadas, la más reciente primero (máx. 6).
      const list = [action.currency, ...(state.recentCurrencies ?? []).filter((c) => c !== action.currency)].slice(0, 6);
      return { ...state, recentCurrencies: list };
    }
    case 'addMember':
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId ? { ...g, members: [...g.members, { ...action.member, updatedAt: now() }] } : g,
        ),
      };
    case 'deleteGroup':
      return {
        ...state,
        groups: state.groups.filter((g) => g.id !== action.id),
        // Los gastos del grupo pasan a ser personales para no perder el histórico.
        expenses: state.expenses.map((e) =>
          e.groupId === action.id ? { ...e, groupId: undefined, paidBy: undefined, shares: undefined } : e,
        ),
        settlements: state.settlements.filter((s) => s.groupId !== action.id),
        tombstones: state.tombstones.filter((t) => t.groupId !== action.id),
      };
    case 'addSettlement':
      return { ...state, settlements: [...state.settlements, { ...action.settlement, updatedAt: now() }] };
    case 'setGroupRemote':
      return {
        ...state,
        groups: state.groups.map((g) => (g.id === action.groupId ? { ...g, remote: { code: action.code } } : g)),
      };
    case 'applySnapshot':
      return applySnapshot(state, action.groupId, action.snapshot, action.syncStartedAt);
    case 'joinGroup': {
      if (state.groups.some((g) => g.id === action.snapshot.group.id)) return state;
      const { group } = groupFromSnapshot(action.snapshot, action.meMemberId);
      if (action.newMemberName) {
        group.members.push({ id: action.meMemberId, name: action.newMemberName, isMe: true, claimed: true, updatedAt: now() });
      }
      const withGroup = { ...state, groups: [...state.groups, group] };
      // Trae los gastos y pagos que ya tenía el grupo.
      return applySnapshot(withGroup, group.id, action.snapshot, '1970-01-01T00:00:00.000Z');
    }
    case 'reset':
      return { ...initialState };
  }
}

/** Crea el gasto a partir de una captura, o devuelve el que ya existía si es un duplicado. */
export function expenseFromCapture(state: AppState, payload: CapturePayload): { expense: Expense; duplicate: boolean } {
  const dup = findDuplicate(state.expenses, payload);
  if (dup) return { expense: dup, duplicate: true };
  // Pagado en otra moneda (de viaje, compras online): se guarda en la tuya con el cambio del día.
  const home = state.profile.currency;
  const foreign = payload.currency && payload.currency !== home ? payload.currency : null;
  const rate = foreign ? rateBetween(foreign, home, state.fx ?? FALLBACK) : null;
  return {
    duplicate: false,
    expense: {
      id: newId(),
      amount: foreign && rate ? Math.round(payload.amount * rate) : payload.amount,
      merchant: payload.merchant,
      category: payload.category,
      date: payload.date,
      source: payload.source,
      note: payload.card ? `💳 ${payload.card}` : undefined,
      original: foreign && rate ? { amount: payload.amount, currency: foreign, rate } : undefined,
      app: payload.app,
    },
  };
}

interface StoreValue {
  state: AppState;
  dispatch: (action: Action) => void;
  ready: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) dispatch({ type: 'hydrate', state: JSON.parse(raw) as AppState });
      })
      .catch(() => {
        // Datos corruptos o almacenamiento no disponible: empezamos de cero.
      })
      .finally(() => {
        hydrated.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const value = useMemo(() => ({ state, dispatch, ready }), [state, ready]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>');
  return ctx;
}
