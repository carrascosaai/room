import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { makeCloudBackup } from '@/domain/backup';
import type { AppState } from '@/domain/types';

/**
 * Inicio de sesión con Apple y Google a través de Supabase Auth, y copia de
 * seguridad privada de los datos del usuario (tabla taimo_backups, solo
 * accesible por su dueño). Se configura con las mismas variables que los grupos.
 */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const authConfigured = Boolean(URL && KEY);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!authConfigured) return null;
  if (!client) {
    client = createClient(URL, KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
    });
  }
  return client;
}

if (Platform.OS === 'web') WebBrowser.maybeCompleteAuthSession();

export type Provider = 'apple' | 'google';

export interface SignedIn {
  user: User;
  /** Nombre que da el proveedor (Apple solo lo da la primera vez). */
  name?: string;
}

/** Apple en iPhone usa la hoja nativa; el resto, la web del proveedor dentro de la app. */
export async function appleNativeAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

async function signInWithAppleNative(sb: SupabaseClient): Promise<SignedIn> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce: hashedNonce,
  });
  if (!credential.identityToken) throw new Error('Apple no devolvió el token');
  const { data, error } = await sb.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: rawNonce });
  if (error || !data.user) throw error ?? new Error('Sin usuario');
  const name = credential.fullName?.givenName ?? undefined;
  return { user: data.user, name };
}

async function signInWithOAuth(sb: SupabaseClient, provider: Provider): Promise<SignedIn | null> {
  if (Platform.OS === 'web') {
    // En web la página se va al proveedor y vuelve; la sesión se recoge al volver.
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    if (error) throw error;
    return null;
  }
  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data.url) throw error ?? new Error('Sin URL de inicio de sesión');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null; // cancelado por el usuario
  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('El proveedor no devolvió el código');
  const exchanged = await sb.auth.exchangeCodeForSession(code);
  if (exchanged.error || !exchanged.data.user) throw exchanged.error ?? new Error('Sin usuario');
  const meta = exchanged.data.user.user_metadata as { full_name?: string; name?: string };
  return { user: exchanged.data.user, name: (meta.full_name ?? meta.name)?.split(' ')[0] };
}

/** Devuelve null si el usuario cancela. */
export async function signIn(provider: Provider): Promise<SignedIn | null> {
  const sb = supabase();
  if (!sb) throw new Error('not_configured');
  if (provider === 'apple' && (await appleNativeAvailable())) {
    try {
      return await signInWithAppleNative(sb);
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
      throw e;
    }
  }
  return signInWithOAuth(sb, provider);
}

export async function signOut(): Promise<void> {
  await supabase()?.auth.signOut();
}

export async function currentUser(): Promise<User | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

// ── Copia de seguridad ──────────────────────────────────────────────────────

export async function uploadBackup(state: AppState): Promise<string> {
  const sb = supabase();
  const user = await currentUser();
  if (!sb || !user) throw new Error('not_signed_in');
  const updatedAt = new Date().toISOString();
  // Sin la cuenta ni los ingresos: la app promete que los ingresos no salen del móvil.
  const { error } = await sb.from('taimo_backups').upsert({ user_id: user.id, data: makeCloudBackup(state), updated_at: updatedAt });
  if (error) throw error;
  return updatedAt;
}

export async function downloadBackup(): Promise<{ data: AppState; updatedAt: string } | null> {
  const sb = supabase();
  const user = await currentUser();
  if (!sb || !user) return null;
  const { data, error } = await sb.from('taimo_backups').select('data, updated_at').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { data: data.data as AppState, updatedAt: data.updated_at as string };
}
