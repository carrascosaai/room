import type { CategoryId } from './types';

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  emoji: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'super', label: 'Supermercado', emoji: '🛒', color: '#22C55E' },
  { id: 'comer', label: 'Comer fuera', emoji: '🍔', color: '#F97316' },
  { id: 'ocio', label: 'Ocio', emoji: '🎉', color: '#F43F5E' },
  { id: 'deporte', label: 'Deporte', emoji: '⚽', color: '#06B6D4' },
  { id: 'estudios', label: 'Estudios', emoji: '📚', color: '#3B82F6' },
  { id: 'transporte', label: 'Transporte', emoji: '🚇', color: '#FDE047' },
  { id: 'casa', label: 'Casa', emoji: '🏠', color: '#14B8A6' },
  { id: 'compras', label: 'Compras', emoji: '🛍️', color: '#F59E0B' },
  { id: 'salud', label: 'Salud', emoji: '💊', color: '#EF4444' },
  { id: 'suscripciones', label: 'Suscripciones', emoji: '🔁', color: '#64748B' },
  { id: 'otros', label: 'Otros', emoji: '✨', color: '#94A3B8' },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function category(id: CategoryId): CategoryInfo {
  return byId.get(id) ?? byId.get('otros')!;
}

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && byId.has(value as CategoryId);
}
