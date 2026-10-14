import { requireOptionalNativeModule } from 'expo';

interface TaimoCaptureNative {
  drainPending(): string;
  hasNotificationAccess(): boolean;
  openNotificationAccessSettings(): void;
  setIgnoredApps?(apps: string[]): void;
  recognizeText?(uri: string): Promise<OcrLine[]>;
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

/** Android: apps cuyos avisos el lector nativo no debe guardar ni anunciar. */
export function setIgnoredApps(apps: string[]): void {
  try {
    native?.setIgnoredApps?.(apps);
  } catch {
    // Versiones antiguas del módulo nativo no la tienen.
  }
}

/** Una línea de texto leída de una foto, con su posición (0..1, desde arriba a la izquierda). */
export interface OcrLine {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** ¿Puede este móvil leer tickets? (no en web ni en Expo Go). */
export const canRecognizeText = typeof native?.recognizeText === 'function';

/** Lee el texto de una foto en el propio móvil (Vision en iPhone, ML Kit en Android). */
export async function recognizeText(uri: string): Promise<OcrLine[]> {
  if (!native?.recognizeText) return [];
  return native.recognizeText(uri);
}
