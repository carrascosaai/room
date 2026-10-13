import { Redirect } from 'expo-router';

// Destino de vuelta del inicio de sesión con Google/Apple en el navegador.
// La sesión ya la recoge Supabase; aquí solo volvemos a la app.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
