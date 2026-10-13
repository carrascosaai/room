import { Redirect } from 'expo-router';

// Cualquier enlace desconocido (por ejemplo, un Atajo mal configurado) vuelve al inicio.
export default function NotFound() {
  return <Redirect href="/" />;
}
