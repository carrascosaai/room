import { Alert, Platform } from 'react-native';

/** Confirmación destructiva que funciona en móvil y en web. */
export function confirm(message: string, cancelLabel: string, okLabel: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(message)) onYes();
    return;
  }
  Alert.alert(message, undefined, [
    { text: cancelLabel, style: 'cancel' },
    { text: okLabel, style: 'destructive', onPress: onYes },
  ]);
}
