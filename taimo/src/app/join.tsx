import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { sameName } from '@/domain/names';
import type { GroupSnapshot } from '@/domain/sync';
import { useI18n } from '@/i18n';
import { newId, useStore } from '@/store/store';
import { extractCode, joinRemoteGroup, SyncError, syncConfigured } from '@/sync/api';
import { Button, Card, Chip, Input, Muted, Row, Screen, Title } from '@/ui/components';
import { HomeButton } from '@/ui/HomeButton';
import { colors, space } from '@/ui/theme';

/**
 * Unirse a un grupo con un enlace `taimo://join?code=…` o escribiendo el código.
 * Después eliges quién eres de la lista (o te añades).
 */
export default function Join() {
  const params = useLocalSearchParams<{ code?: string }>();
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const [input, setInput] = useState(params.code ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<GroupSnapshot | null>(null);
  const [newName, setNewName] = useState(state.profile.name);
  // Primero eliges quién eres y después confirmas: un toque sin querer no te une al grupo.
  const [chosen, setChosen] = useState<string | null>(null);

  async function lookup(raw: string) {
    const code = extractCode(raw);
    if (!code) {
      setError(t('join.invalid'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snap = await joinRemoteGroup(code);
      if (state.groups.some((g) => g.id === snap.group.id)) {
        router.replace({ pathname: '/group/[id]', params: { id: snap.group.id } });
        return;
      }
      setSnapshot(snap);
    } catch (e) {
      const kind = e instanceof SyncError ? e.kind : 'server';
      setError(kind === 'not_found' ? t('join.notFound') : kind === 'network' ? t('join.offline') : t('join.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.code) lookup(params.code);
  }, [params.code]);

  function joinAs(memberId: string, isNew: boolean) {
    if (!snapshot) return;
    dispatch({ type: 'joinGroup', snapshot, meMemberId: memberId, newMemberName: isNew ? newName.trim() : undefined });
    router.replace({ pathname: '/group/[id]', params: { id: snapshot.group.id } });
  }

  if (!syncConfigured) {
    return (
      <Screen>
        <Title>{t('join.title')}</Title>
        <Muted>{t('join.notConfigured')}</Muted>
        <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (snapshot) {
    const free = snapshot.members.filter((m) => !m.claimed);
    const count = snapshot.expenses.filter((e) => !e.deleted).length;
    const chosenMember = free.find((m) => m.id === chosen);
    const taken = snapshot.members.some((m) => sameName(m.name, newName));
    return (
      <Screen>
        <Text style={{ fontSize: 48, textAlign: 'center' }}>{snapshot.group.emoji}</Text>
        <HomeButton />
        <Title>{snapshot.group.name}</Title>
        <Muted>
          {snapshot.members.map((m) => m.name).join(', ')} · {t('join.expenses', { count })}
        </Muted>
        {free.length > 0 ? (
          <Card>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{t('join.who')}</Text>
            <Row style={{ flexWrap: 'wrap' }}>
              {free.map((m) => (
                <Chip key={m.id} label={m.name} selected={chosen === m.id} onPress={() => setChosen(chosen === m.id ? null : m.id)} />
              ))}
            </Row>
            {chosenMember ? (
              <>
                <Button label={t('join.joinAs', { name: chosenMember.name })} onPress={() => joinAs(chosenMember.id, false)} />
                <Button label={t('common.cancel')} variant="ghost" onPress={() => setChosen(null)} />
              </>
            ) : null}
          </Card>
        ) : null}
        <Card>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
            {free.length > 0 ? t('join.notListed') : t('join.joinTitle')}
          </Text>
          <Input placeholder={t('onboarding.namePlaceholder')} value={newName} onChangeText={setNewName} />
          {/* Un nombre que ya está en el grupo lía las cuentas: se pide otro (o elegirse arriba). */}
          {taken ? <Text style={{ color: colors.danger, fontSize: 15 }}>{t('fixa.duplicateName', { name: newName.trim() })}</Text> : null}
          <Button label={t('join.joinButton')} disabled={!newName.trim() || taken} onPress={() => joinAs(newId(), true)} />
        </Card>
        <Muted>{t('join.note')}</Muted>
      </Screen>
    );
  }

  return (
    <Screen>
      <HomeButton />
      <Title>{t('join.title')}</Title>
      <Muted>{t('join.text')}</Muted>
      <Input placeholder={t('join.placeholder')} value={input} onChangeText={setInput} autoCapitalize="characters" autoCorrect={false} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {loading ? (
        <View style={{ padding: space.lg }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <Button label={t('join.search')} disabled={!input.trim()} onPress={() => lookup(input)} />
      )}
      <Button label={t('common.cancel')} variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}
