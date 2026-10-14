// Punto de entrada: la app (Expo Router) y, en Android, el dibujo del widget
// de la pantalla de inicio, que el sistema puede pedir con la app cerrada.
import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widget/android');
  registerWidgetTaskHandler(widgetTaskHandler);
}
