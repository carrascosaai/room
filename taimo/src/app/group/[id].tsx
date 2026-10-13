import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Share, Text, View } from 'react-native';

import { balances, suggestTransfers } from '@/domain/groups';
import { buildPush } from '@/domain/sync';
import type { Group } from '@/domain/types';
import { useI18n } from '@/i18n';
import { newId, useStore } from '@/store/store';
import { createRemoteGroup, inviteLink, SyncError, syncConfigured } from '@/sync/api';
import { Button, Card, Empty, H2, Input, Muted, Row, Screen } from '@/ui/components';
import { confirm } from '@/ui/confirm';
import { ExpenseRow } from '@/ui/ExpenseRow';
import { colors, space } from '@/ui/theme';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const { t, money } = useI18n();
  const [newMember, setNewMember] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const group = state.groups.find((g) => g.id === id);

  if (!group) {
    return (
      <Screen>
        <Empty emoji="🤷" text={t('group.missing')} />
      </Screen>
    );
  }

  const name = (g: Group, memberId: string) => {
    const m = g.members.find((x) => x.id === memberId);
    return !m ? t('common.unknown') : m.isMe ? t('common.you') : m.name;
  };
  const expenses = state.expenses.filter((e) => e.groupId === group.id);
  const balance = balances(group, state.expenses, state.settlements);
  const transfers = suggestTransfers(balance);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  function settle(from: string, to: string, amount: number) {
    dispatch({
      type: 'addSettlement',
      settlement: { id: newId(), groupId: group!.id, from, to, amount, date: new Date().toISOString() },
    });
  }

  async function invite() {
    if (!group) return;
    setShareError(null);
    let code = group.remote?.code;
    if (!code) {
      setSharing(true);
      try {
        const startedAt = new Date().toISOString();
        const snapshot = await createRemoteGroup(group, buildPush(state, group.id));
        dispatch({ type: 'applySnapshot', groupId: group.id, snapshot, syncStartedAt: startedAt });
        code = snapshot.group.code;
      } catch (e) {
        setShareError(e instanceof SyncError && e.kind === 'network' ? t('join.offline') : t('group.shareError'));
        return;
      } finally {
        setSharing(false);
      }
    }
    const message = t('group.inviteMessage', { name: group.name, link: inviteLink(code), code });
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(message).catch(() => {});
      setShareError(t('group.inviteCopied'));
    } else {
      await Share.share({ message });
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: `${group.emoji} ${group.name}` }} />

      <Card>
        <Muted>{t('group.total')}</Muted>
        <Text style={{ color: colors.text, fontSize: 32, fontWeight: '800' }}>{money(total)}</Text>
        {group.members.map((m) => {
          const b = balance[m.id] ?? 0;
          return (
            <Row key={m.id} style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: 15 }}>{m.isMe ? t('common.you') : m.name}</Text>
              <Text style={{ color: b > 0 ? colors.success : b < 0 ? colors.warning : colors.textMuted }}>
                {b === 0 ? t('group.settled') : b > 0 ? t('group.isOwed', { amount: money(b) }) : t('group.owes', { amount: money(-b) })}
              </Text>
            </Row>
          );
        })}
      </Card>

      {transfers.length > 0 ? (
        <Card>
          <H2>{t('group.settleTitle')}</H2>
          {transfers.map((tr) => (
            <View key={`${tr.from}-${tr.to}`} style={{ gap: space.sm }}>
              <Text style={{ color: colors.text, fontSize: 15 }}>
                {name(group, tr.from)} → {name(group, tr.to)}: <Text style={{ fontWeight: '700' }}>{money(tr.amount)}</Text>
              </Text>
              <Button label={t('group.markPaid')} variant="secondary" onPress={() => settle(tr.from, tr.to, tr.amount)} />
            </View>
          ))}
        </Card>
      ) : null}

      <Button label={t('group.addShared')} onPress={() => router.push({ pathname: '/add', params: { groupId: group.id } })} />

      {syncConfigured ? (
        <Card>
          <H2>{group.remote ? t('group.sharedTitle') : t('group.shareTitle')}</H2>
          <Muted>{group.remote ? t('group.sharedText', { code: group.remote.code }) : t('group.shareText')}</Muted>
          {sharing ? <ActivityIndicator color={colors.primary} /> : <Button label={t('group.invite')} variant="secondary" onPress={invite} />}
          {shareError ? <Muted>{shareError}</Muted> : null}
        </Card>
      ) : null}

      <Card>
        <H2>{t('group.expenses')}</H2>
        {expenses.length === 0 ? (
          <Empty emoji="🧾" text={t('group.noExpenses')} />
        ) : (
          expenses.map((e) => <ExpenseRow key={e.id} expense={e} groups={state.groups} />)
        )}
      </Card>

      <Card>
        <H2>{t('group.members')}</H2>
        <Row>
          <View style={{ flex: 1 }}>
            <Input placeholder={t('group.addMemberPlaceholder')} value={newMember} onChangeText={setNewMember} />
          </View>
          <Button
            label={t('group.addMember')}
            variant="secondary"
            disabled={!newMember.trim()}
            onPress={() => {
              dispatch({ type: 'addMember', groupId: group.id, member: { id: newId(), name: newMember.trim() } });
              setNewMember('');
            }}
          />
        </Row>
      </Card>

      <Button
        label={group.remote ? t('group.leave') : t('group.delete')}
        variant="danger"
        onPress={() =>
          confirm(group.remote ? t('group.leaveConfirm') : t('group.deleteConfirm'), t('common.cancel'), t('common.delete'), () => {
            dispatch({ type: 'deleteGroup', id: group.id });
            router.back();
          })
        }
      />
    </Screen>
  );
}
