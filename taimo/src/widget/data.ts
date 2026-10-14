import { monthSummary } from '@/domain/budget';
import type { AppState } from '@/domain/types';
import type { I18n } from '@/i18n';

/** Lo que enseñan los widgets: ya formateado en tu idioma y tu moneda. */
export interface WidgetData {
  title: string;
  left: string;
  perDay: string;
  spent: string;
  /** 0..1 (puede pasar de 1). */
  progress: number;
  over: boolean;
  add: string;
  scan: string;
  updatedAt: string;
}

export function widgetData(state: AppState, i18n: I18n, today: Date = new Date()): WidgetData {
  const s = monthSummary(state, today);
  const noBudget = s.budget === 0;
  return {
    title: noBudget ? i18n.t('widget.spentTitle') : i18n.t('widget.leftTitle'),
    left: noBudget ? i18n.money(s.spent) : i18n.money(s.remaining),
    perDay: noBudget ? i18n.t('widget.noBudget') : s.remaining > 0 ? i18n.t('widget.perDay', { amount: i18n.money(s.dailyAllowance) }) : i18n.t('widget.over'),
    spent: i18n.t('home.spentOf', { spent: i18n.money(s.spent), budget: i18n.money(s.budget) }),
    progress: s.progress,
    over: s.remaining < 0,
    add: i18n.t('widget.add'),
    scan: i18n.t('widget.scan'),
    updatedAt: today.toISOString(),
  };
}
