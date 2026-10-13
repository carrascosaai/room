import { requireOptionalNativeModule } from 'expo';

interface TaimoCaptureNative {
  drainPending(): string;
  hasNotificationAccess(): boolean;
  openNotificationAccessSettings(): void;
}

// No existe en Expo Go ni en web: allí la app funciona sin captura nativa.
const native = requireOptionalNativeModule<TaimoCaptureNative>('TaimoCapture');

/** iOS: lo que deja el App Intent. Android: notificaciones de pago sin interpretar. */
export type PendingItem = Record<string, string>;

export const nativeCaptureAvailable = native !== null;

export function drainPending(): PendingItem[] {
  if (!native) return [];
  try {
    const parsed = JSON.parse(native.drainPending());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hasNotificationAccess(): boolean {
  return native?.hasNotificationAccess() ?? false;
}

export function openNotificationAccessSettings(): void {
  native?.openNotificationAccessSettings();
}
