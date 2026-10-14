import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/** ¿Tiene el móvil Face ID, huella o al menos un código de bloqueo configurado? */
export async function canLock(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const level = await LocalAuthentication.getEnrolledLevelAsync().catch(() => LocalAuthentication.SecurityLevel.NONE);
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

/** Pide Face ID / huella; si falla, deja usar el código del móvil. */
export async function unlock(reason: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: reason, disableDeviceFallback: false }).catch(() => null);
  return !!result?.success;
}
