import { hourlyRate, workMinutes } from '@/domain/habits';
import type { Cents, Profile } from '@/domain/types';
import type { I18n } from '@/i18n';

/** «2 h 30 min» */
export function formatMinutes(i18n: I18n, min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return i18n.t('work.min', { m });
  return m ? i18n.t('work.hmin', { h, m }) : i18n.t('work.h', { h });
}

/** «≈ 2 h 30 min de tu trabajo», o null si no has puesto tus ingresos. */
export function workCost(i18n: I18n, profile: Profile, amount: Cents): string | null {
  const min = workMinutes(amount, hourlyRate(profile.income));
  return min ? formatMinutes(i18n, min) : null;
}
