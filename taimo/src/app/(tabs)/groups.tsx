import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { balances } from '@/domain/groups';
import type { Group } from '@/domain/types';
import { useI18n } from '@/i18n';
import { newId, useStore } from '@/store/store';
import { syncConfigured } from '@/sync/api';
import { Button, Card, Chip, Empty, H2, Input, Muted, Row, Screen, Title } from '@/ui/components';
import { colors, space } from '@/ui/theme';

const EMOJIS = ['🏠', '❤️', '✈️', '🍻', '⚽', '🎓'];

export default function Groups() {
  const { state, dispatch } = useStore();
  const { t, money } = useI18n();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [others, setOthers] = useState('');

  function create() {
    const names = others
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    const group: Group = {
      id: newId(),
      name: name.trim(),
      emoji,
      createdAt: new Date().toISOString(),
      members: [
        { id: newId(), name: state.profile.name || t('common.me'), isMe: true },
        ...names.map((n) => ({ id: newId(), name: n })),
      ],
    };
    dispatch({ type: 'addGroup', group });
    setCreating(false);
    setName('');
    setOthers('');
    router.push({ pathname: '/group/[id]', params: { id: group.id } });
  }

  return (
    <Screen>
      <Title>{t('groups.title')}</Title>
      <Muted>{t('groups.intro')}</Muted>

      {state.groups.map((g) => {
        const me = g.members.find((m) => m.isMe)?.id;
        const myBalance = me ? balances(g, state.expenses, state.settlements)[me] ?? 0 : 0;
        return (
          <Pressable key={g.id} onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}>
            <Card>
              <Row>
                <Text style={{ fontSize: 30 }}>{g.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
                    {g.name}
                    {g.remote ? ' ☁️' : ''}
                  </Text>
                  <Muted>{g.members.map((m) => (m.isMe ? t('common.you') : m.name)).join(', ')}</Muted>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {myBalance === 0 ? (
                    <Muted>{t('groups.settled')}</Muted>
                  ) : (
                    <>
                      <Muted>{myBalance > 0 ? t('groups.owedToYou') : t('groups.youOwe')}</Muted>
                      <Text style={{ color: myBalance > 0 ? colors.success : colors.warning, fontWeight: '700' }}>
                        {money(Math.abs(myBalance))}
                      </Text>
                    </>
                  )}
                </View>
              </Row>
            </Card>
          </Pressable>
        );
      })}

      {state.groups.length === 0 && !creating ? <Empty emoji="👥" text={t('groups.empty')} /> : null}

      {creating ? (
        <Card>
          <H2>{t('groups.newGroup')}</H2>
          <Row style={{ flexWrap: 'wrap' }}>
            {EMOJIS.map((e) => (
              <Chip key={e} label={e} selected={emoji === e} onPress={() => setEmoji(e)} />
            ))}
          </Row>
          <Input label={t('groups.name')} placeholder={t('groups.namePlaceholder')} value={name} onChangeText={setName} />
          <Input label={t('groups.withWho')} placeholder={t('groups.withWhoPlaceholder')} value={others} onChangeText={setOthers} />
          <Button label={t('groups.create')} disabled={!name.trim() || !others.trim()} onPress={create} />
          <Button label={t('common.cancel')} variant="ghost" onPress={() => setCreating(false)} />
        </Card>
      ) : (
        <View style={{ gap: space.sm }}>
          <Button label={t('groups.createButton')} onPress={() => setCreating(true)} />
          {syncConfigured ? <Button label={t('groups.joinButton')} variant="secondary" onPress={() => router.push('/join')} /> : null}
        </View>
      )}
    </Screen>
  );
}
