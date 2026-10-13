import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';

import { findDuplicate, type CapturePayload } from '@/domain/capture';
import { normalizeMerchant } from '@/domain/categorize';
import type { AppState, CategoryId, Cents, Expense, Group, Member, Settlement } from '@/domain/types';

const STORAGE_KEY = 'taimo:state:v1';

export const initialState: AppState = {
  version: 1,
  onboarded: false,
  profile: { name: '', currency: 'EUR' },
  budgets: {},
  expenses: [],
  groups: [],
  settlements: [],
  learnedCategories: {},
};

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'completeOnboarding'; name: string; budgets: AppState['budgets'] }
  | { type: 'setProfileName'; name: string }
  | { type: 'setBudget'; category: CategoryId; amount: Cents }
  | { type: 'addExpense'; expense: Expense }
  | { type: 'updateExpense'; expense: Expense }
  | { type: 'deleteExpense'; id: string }
  | { type: 'addGroup'; group: Group }
  | { type: 'addMember'; groupId: string; member: Member }
  | { type: 'deleteGroup'; id: string }
  | { type: 'addSettlement'; settlement: Settlement }
  | { type: 'reset' };

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
      return { ...state, onboarded: true, profile: { ...state.profile, name: action.name }, budgets: action.budgets };
    case 'setProfileName':
      return { ...state, profile: { ...state.profile, name: action.name } };
    case 'setBudget':
      return { ...state, budgets: { ...state.budgets, [action.category]: action.amount } };
    case 'addExpense':
      return { ...state, expenses: [action.expense, ...state.expenses] };
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
        expenses: state.expenses.map((e) => (e.id === action.expense.id ? action.expense : e)),
      };
    }
    case 'deleteExpense':
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.id) };
    case 'addGroup':
      return { ...state, groups: [...state.groups, action.group] };
    case 'addMember':
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId ? { ...g, members: [...g.members, action.member] } : g,
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
      };
    case 'addSettlement':
      return { ...state, settlements: [...state.settlements, action.settlement] };
    case 'reset':
      return { ...initialState };
  }
}

/** Crea el gasto a partir de una captura, o devuelve el que ya existía si es un duplicado. */
export function expenseFromCapture(state: AppState, payload: CapturePayload): { expense: Expense; duplicate: boolean } {
  const dup = findDuplicate(state.expenses, payload);
  if (dup) return { expense: dup, duplicate: true };
  return {
    duplicate: false,
    expense: {
      id: newId(),
      amount: payload.amount,
      merchant: payload.merchant,
      category: payload.category,
      date: payload.date,
      source: payload.source,
      note: payload.card ? `Tarjeta: ${payload.card}` : undefined,
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
