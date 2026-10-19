import { requireOptionalNativeModule } from 'expo';

interface TaimoCaptureNative {
  drainPending(): string;
  hasNotificationAccess(): boolean;
  openNotificationAccessSettings(): void;
  setIgnoredApps?(apps: string[]): void;
  recognizeText?(uri: string): Promise<OcrLine[]>;
  setWidgetData?(json: string): void;
  captureStatus?(): string;
  setDiagnostics?(on: boolean): void;
  missedNotices?(): string;
  clearMissed?(): void;
  reportMissed?(json: string): void;
  openAppSettings?(): void;
  rebindListener?(): void;
  installSource?(): string;
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
  try {
    return native?.hasNotificationAccess() ?? false;
  } catch {
    return false;
  }
}

export function openNotificationAccessSettings(): void {
  try {
    native?.openNotificationAccessSettings();
  } catch {
    // El móvil no tiene esa pantalla: no pasa nada.
  }
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

/** iPhone: datos para el widget de la pantalla de inicio (App Group compartido). */
export function setWidgetData(json: string): void {
  try {
    native?.setWidgetData?.(json);
  } catch {
    // Sin widget (Android, web o versiones antiguas del módulo).
  }
}

/** Android: si el lector de avisos está vivo (último aviso que ha llegado, de cualquier app). */
export interface CaptureStatus {
  /** Milisegundos; 0 si aún no ha llegado ninguno. */
  seenAt: number;
  seenCount: number;
  diagnostics: boolean;
}

export const canDiagnose = typeof native?.captureStatus === 'function';

export function captureStatus(): CaptureStatus | null {
  if (!native?.captureStatus) return null;
  try {
    const s = JSON.parse(native.captureStatus());
    return { seenAt: Number(s.seenAt) || 0, seenCount: Number(s.seenCount) || 0, diagnostics: !!s.diagnostics };
  } catch {
    return null;
  }
}

/** Modo comprobación: guarda en el móvil los avisos con importe que no se apuntan. Al apagarlo se borran. */
export function setDiagnostics(on: boolean): void {
  try {
    native?.setDiagnostics?.(on);
  } catch {
    // Módulo antiguo.
  }
}

export function missedNotices(): PendingItem[] {
  if (!native?.missedNotices) return [];
  try {
    const parsed = JSON.parse(native.missedNotices());
    return Array.isArray(parsed) ? parsed.reverse() : [];
  } catch {
    return [];
  }
}

export function clearMissed(): void {
  try {
    native?.clearMissed?.();
  } catch {
    // Módulo antiguo.
  }
}

/** Un aviso que el lector guardó pero la app no supo convertir en gasto. */
export function reportMissed(item: PendingItem): void {
  try {
    native?.reportMissed?.(JSON.stringify(item));
  } catch {
    // Módulo antiguo.
  }
}

export function openAppSettings(): void {
  try {
    native?.openAppSettings?.();
  } catch {
    // Módulo antiguo.
  }
}

/** Android: vuelve a conectar el lector de avisos si el móvil lo ha desconectado. */
export function rebindListener(): void {
  try {
    native?.rebindListener?.();
  } catch {
    // Módulo antiguo o fabricante que no lo permite.
  }
}

/** Android: de dónde se instaló Taimo ("play", "sideload", "store" o "unknown"). */
export function installSource(): 'play' | 'sideload' | 'store' | 'unknown' {
  try {
    const s = native?.installSource?.();
    return s === 'play' || s === 'sideload' || s === 'store' ? s : 'unknown';
  } catch {
    return 'unknown';
  }
}
