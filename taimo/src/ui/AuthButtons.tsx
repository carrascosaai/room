import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';

import { appleNativeAvailable, authConfigured, signIn, type Provider, type SignedIn } from '@/auth/auth';
import { useI18n } from '@/i18n';

import { colors, radius, space } from './theme';

/**
 * Botones "Continuar con Apple" y "Continuar con Google". En iPhone, Apple usa
 * su botón oficial (lo exige la App Store). Llama a `onSignedIn` al terminar.
 */
export function AuthButtons({ onSignedIn }: { onSignedIn: (result: SignedIn) => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nativeApple, setNativeApple] = useState(false);

  useEffect(() => {
    appleNativeAvailable().then(setNativeApple);
  }, []);

  async function go(provider: Provider) {
    setError(null);
    if (!authConfigured) {
      setError(t('auth.unavailable'));
      return;
    }
    setBusy(provider);
    try {
      const result = await signIn(provider);
      if (result) onSignedIn(result);
    } catch {
      setError(t('auth.error'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ gap: space.md }}>
      {nativeApple ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={radius.pill}
          style={{ height: 50 }}
          onPress={() => go('apple')}
        />
      ) : (
        <ProviderButton label={t('auth.apple')} icon="" dark={false} loading={busy === 'apple'} onPress={() => go('apple')} />
      )}
      <ProviderButton label={t('auth.google')} icon="G" dark loading={busy === 'google'} onPress={() => go('google')} />
      {error ? <Text style={{ color: colors.warning, textAlign: 'center' }}>{error}</Text> : null}
    </View>
  );
}

function ProviderButton({
  label,
  icon,
  dark,
  loading,
  onPress,
}: {
  label: string;
  icon: string;
  dark: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        height: 50,
        borderRadius: radius.pill,
        backgroundColor: dark ? colors.surfaceAlt : colors.appleBg,
        borderWidth: dark ? 1 : 0,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={dark ? colors.text : colors.appleText} />
      ) : (
        <>
          <Text
            style={{
              color: dark ? colors.text : colors.appleText,
              fontSize: 18,
              fontWeight: '700',
              fontFamily: Platform.select({ ios: 'System', default: undefined }),
            }}
          >
            {icon}
          </Text>
          <Text style={{ color: dark ? colors.text : colors.appleText, fontSize: 16, fontWeight: '600' }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
