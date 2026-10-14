import * as Linking from 'expo-linking';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Text } from 'react-native';

import { decodeClaim, encodeClaim } from '@/domain/table';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { BigButton, Button, Card, Empty, Muted, Screen } from '@/ui/components';
import { colors } from '@/ui/theme';

/**
 * El aviso «ya he pagado» de un comensal. En el móvil de quien pagó (con Taimo)
 * se apunta solo; en el navegador ofrece abrirlo en la app.
 */
export default function MesaPagado() {
  const params = useLocalSearchParams<{ d?: string }>();
  const { state, dispatch } = useStore();
  const { t, moneyIn } = useI18n();
  const claim = useMemo(() => {
    const hash = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hash : '';
    return decodeClaim(hash.length > 1 ? hash : params.d ?? '');
  }, [params.d]);
  const group = claim ? state.groups.find((g) => g.table?.id === claim.b) : undefined;
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (claim && group && !applied) {
      dispatch({ type: 'tableClaim', claim });
      setApplied(true);
    }
  }, [claim, group, applied]);

  if (!claim) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <Empty emoji="🔗" text={t('plink.broken')} />
        <Button label={t('mesa.goTaimo')} variant="secondary" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const amount = moneyIn(claim.a, group?.currency ?? group?.table?.c ?? state.profile.currency);

  if (group) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ fontSize: 56, textAlign: 'center' }}>✅</Text>
        <Card style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>{t('mesa.claimAdded', { name: claim.w, amount })}</Text>
          <Muted>{group.name}</Muted>
        </Card>
        <BigButton label={t('mesa.seeTable')} onPress={() => router.replace({ pathname: '/mesa-nueva', params: { groupId: group.id } })} />
      </Screen>
    );
  }

  // No está la mesa aquí: o es el navegador, o el aviso es de otro móvil.
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ fontSize: 56, textAlign: 'center' }}>🍽️</Text>
      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{t('mesa.claimAdded', { name: claim.w, amount })}</Text>
        <Muted>{Platform.OS === 'web' ? t('mesa.openAppHint') : t('mesa.claimUnknown')}</Muted>
      </Card>
      {Platform.OS === 'web' ? (
        <BigButton label={t('mesa.openApp')} onPress={() => Linking.openURL(`taimo://mesa-pagado?d=${encodeClaim(claim)}`)} />
      ) : (
        <Button label={t('mesa.goTaimo')} variant="secondary" onPress={() => router.replace('/')} />
      )}
    </Screen>
  );
}
