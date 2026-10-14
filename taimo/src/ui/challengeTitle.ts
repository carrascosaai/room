import type { Challenge } from '@/domain/challenges';
import type { I18n } from '@/i18n';

/** «Semana sin comer fuera», «Gasta menos que la semana pasada»… */
export function challengeTitle(c: Challenge, t: I18n['t']): string {
  if (c.kind === 'noCategory') return t('ch.noCategory', { category: t(`cat.${c.category!}`).toLowerCase() });
  return c.kind === 'noSpendDays' ? t('ch.noSpend') : t('ch.lessWeek');
}
