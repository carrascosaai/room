import { router } from 'expo-router';

import { useI18n } from '@/i18n';

import { Button } from './components';

/**
 * Pantallas que se abren desde un enlace (pagar, mesa, unirse…): si no hay
 * pantalla anterior, un botón claro para ir al inicio de la app.
 */
export function HomeButton({ force = false }: { force?: boolean }) {
  const { t } = useI18n();
  if (!force && router.canGoBack()) return null;
  return <Button label={`🏠 ${t('fixa.home')}`} variant="secondary" onPress={() => router.replace('/')} />;
}
