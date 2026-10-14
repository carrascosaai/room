import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { downloadBackup, signOut, uploadBackup } from '@/auth/auth';
import { totalBudget } from '@/domain/budget';
import { CATEGORIES } from '@/domain/categories';
import { expensesToCsv, isAlreadyImported, parseBankCsv } from '@/domain/csv';
import { parseAmount } from '@/domain/money';
import { CURRENCIES, LANGUAGES, useI18n } from '@/i18n';
import { ensureNotificationPermission } from '@/notifications/local';
import { newId, useStore } from '@/store/store';
import { AuthButtons } from '@/ui/AuthButtons';
import { Button, Card, CategoryBadge, Chip, H2, Input, Muted, Row, Screen, Title } from '@/ui/components';
import { CurrencyButton, CurrencyPicker } from '@/ui/CurrencyPicker';
import { confirm } from '@/ui/confirm';
import { colors, space } from '@/ui/theme';

export default function Settings() {
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  const { t, money, lang } = i18n;
  const [name, setName] = useState(state.profile.name);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, state.budgets[c.id] ? String((state.budgets[c.id]! / 100).toFixed(0)) : ''])),
  );
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [pickingCurrency, setPickingCurrency] = useState(false);
  const [payment, setPayment] = useState(state.profile.payment ?? {});
  const savePayment = () =>
    dispatch({
      type: 'setPayment',
      payment: Object.fromEntries(Object.entries(payment).map(([k, v]) => [k, (v ?? '').trim()]).filter(([, v]) => v)),
    });

  const pref = state.profile.language ?? 'auto';
  const langInfo = LANGUAGES.find((l) => l.code === lang)!;
  const account = state.profile.account;

  async function exportCsv() {
    const csv = expensesToCsv(state.expenses, state.groups, {
      header: [t('csv.date'), t('csv.merchant'), t('csv.category'), t('csv.total'), t('csv.myShare'), t('csv.group'), t('csv.source'), t('csv.note')],
      category: (id) => t(`cat.${id}`),
    });
    const fileName = `taimo-${new Date().toISOString().slice(0, 10)}.csv`;
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const file = new File(Paths.cache, fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(csv);
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: t('settings.export') });
  }

  async function importCsv() {
    setCsvMessage(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/csv', '*/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    const text = Platform.OS === 'web' ? await (await fetch(asset.uri)).text() : await new File(asset.uri).text();
    const { expenses, skipped } = parseBankCsv(text, state.learnedCategories);
    const fresh = expenses.filter((e) => !isAlreadyImported(state.expenses, e));
    if (fresh.length > 0) dispatch({ type: 'importExpenses', expenses: fresh.map((e) => ({ ...e, id: newId() })) });
    if (expenses.length === 0) {
      setCsvMessage(t('settings.importNone'));
      return;
    }
    const dupes = expenses.length - fresh.length;
    setCsvMessage(
      [
        t('settings.imported', { count: fresh.length }),
        dupes ? t('settings.importedDupes', { count: dupes }) : '',
        skipped ? t('settings.importedSkipped', { count: skipped }) : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  async function backupNow() {
    setAccountMessage(null);
    try {
      const at = await uploadBackup(state);
      setLastBackup(at);
    } catch {
      setAccountMessage(t('auth.error'));
    }
  }

  async function restore() {
    setAccountMessage(null);
    const backup = await downloadBackup().catch(() => null);
    if (!backup) {
      setAccountMessage(t('auth.noBackup'));
      return;
    }
    confirm(t('auth.restoreConfirm'), t('common.cancel'), t('auth.restore'), () => {
      dispatch({ type: 'restoreBackup', state: backup.data });
      setAccountMessage(t('auth.restored'));
    });
  }

  return (
    <Screen>
      <Title>{t('settings.title')}</Title>

      <Card>
        <H2>{t('settings.name')}</H2>
        <Input value={name} onChangeText={setName} onBlur={() => dispatch({ type: 'setProfileName', name: name.trim() })} />
      </Card>

      <Pressable onPress={() => router.push('/language')} accessibilityRole="button">
        <Card>
          <Row>
            <View style={{ flex: 1, gap: 2 }}>
              <H2>{t('settings.language')}</H2>
              <Muted>{pref === 'auto' ? `${t('settings.languageAuto')} · ${langInfo.name}` : langInfo.name}</Muted>
            </View>
            <Text style={{ fontSize: 22 }}>{langInfo.flag || '🌐'}</Text>
            <Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
          </Row>
        </Card>
      </Pressable>

      <Card>
        <H2>{t('settings.currency')}</H2>
        <Row>
          <CurrencyButton value={i18n.currency} onPress={() => setPickingCurrency(true)} />
          <Muted style={{ flex: 1 }}>{i18n.currencyName(i18n.currency)}</Muted>
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {CURRENCIES.map((c) => (
            <Chip key={c} label={c} selected={i18n.currency === c} onPress={() => dispatch({ type: 'setCurrency', currency: c })} />
          ))}
        </ScrollView>
        <Button label={t('fx.open')} variant="ghost" onPress={() => router.push('/converter')} />
        <CurrencyPicker
          visible={pickingCurrency}
          value={i18n.currency}
          onClose={() => setPickingCurrency(false)}
          onSelect={(c) => dispatch({ type: 'setCurrency', currency: c })}
        />
      </Card>

      <Card>
        <H2>{t('pay.title')}</H2>
        <Muted>{t('pay.hint')}</Muted>
        <Input label={t('pay.bizum')} value={payment.bizum ?? ''} keyboardType="phone-pad" placeholder="600 000 000" onChangeText={(v) => setPayment((p) => ({ ...p, bizum: v }))} onBlur={savePayment} />
        <Input label={t('pay.iban')} value={payment.iban ?? ''} autoCapitalize="characters" autoCorrect={false} placeholder="ES00 0000 0000 0000 0000 0000" onChangeText={(v) => setPayment((p) => ({ ...p, iban: v }))} onBlur={savePayment} />
        <Input label={t('pay.paypal')} value={payment.paypal ?? ''} autoCapitalize="none" autoCorrect={false} placeholder="paypal.me/…" onChangeText={(v) => setPayment((p) => ({ ...p, paypal: v }))} onBlur={savePayment} />
        <Input label={t('pay.revolut')} value={payment.revolut ?? ''} autoCapitalize="none" autoCorrect={false} placeholder="@…" onChangeText={(v) => setPayment((p) => ({ ...p, revolut: v }))} onBlur={savePayment} />
      </Card>

      <Card>
        <H2>{t('auth.account')}</H2>
        {account ? (
          <>
            <Muted>{t('auth.signedInAs', { name: account.email ?? state.profile.name })}</Muted>
            <Muted>{lastBackup ? t('auth.lastBackup', { date: i18n.date(lastBackup, { dateStyle: 'medium', timeStyle: 'short' }) }) : ''}</Muted>
            <Button label={t('auth.backupNow')} variant="secondary" onPress={backupNow} />
            <Button label={t('auth.restore')} variant="secondary" onPress={restore} />
            <Button
              label={t('auth.signOut')}
              variant="ghost"
              onPress={async () => {
                await signOut().catch(() => {});
                dispatch({ type: 'setAccount', account: undefined });
              }}
            />
          </>
        ) : (
          <>
            <Muted>{t('auth.notSignedIn')}</Muted>
            <AuthButtons onSignedIn={() => setAccountMessage(null)} />
          </>
        )}
        {accountMessage ? <Muted>{accountMessage}</Muted> : null}
      </Card>

      <Card>
        <H2>{t('settings.budget')}</H2>
        <Muted>{t('settings.total', { amount: money(totalBudget(state.budgets)) })}</Muted>
        {CATEGORIES.map((c) => (
          <Row key={c.id}>
            <CategoryBadge id={c.id} size={32} />
            <Text style={{ color: colors.text, flex: 1 }}>{t(`cat.${c.id}`)}</Text>
            <View style={{ width: 100 }}>
              <Input
                value={values[c.id]}
                keyboardType="decimal-pad"
                placeholder="—"
                style={{ textAlign: 'right', paddingVertical: 8 }}
                onChangeText={(v) => setValues((prev) => ({ ...prev, [c.id]: v }))}
                onBlur={() => dispatch({ type: 'setBudget', category: c.id, amount: parseAmount(values[c.id]) ?? 0 })}
              />
            </View>
            <Muted style={{ width: 34 }}>{i18n.currency}</Muted>
          </Row>
        ))}
      </Card>

      <Button
        label={Platform.OS === 'android' ? t('settings.autoAndroid') : t('settings.autoIos')}
        variant="secondary"
        onPress={() => router.push('/automation')}
      />

      <Card>
        <H2>{t('settings.notifications')}</H2>
        <Muted>{t('settings.notificationsText')}</Muted>
        <Button label={t('settings.enableNotifications')} variant="secondary" onPress={() => ensureNotificationPermission().catch(() => {})} />
      </Card>

      <Card>
        <H2>{t('settings.data')}</H2>
        <Muted>{t('settings.dataText')}</Muted>
        <Button label={t('settings.import')} variant="secondary" onPress={() => importCsv().catch(() => setCsvMessage(t('settings.importError')))} />
        <Button label={t('settings.export')} variant="secondary" onPress={() => exportCsv().catch(() => {})} />
        {csvMessage ? <Muted>{csvMessage}</Muted> : null}
      </Card>

      <Card>
        <H2>{t('settings.privacy')}</H2>
        <Muted>{t('settings.privacyText')}</Muted>
      </Card>

      <View style={{ gap: space.sm }}>
        <Button
          label={t('settings.reset')}
          variant="danger"
          onPress={() =>
            confirm(t('settings.resetConfirm'), t('common.cancel'), t('common.delete'), () => {
              dispatch({ type: 'reset' });
              router.replace('/onboarding');
            })
          }
        />
        <Muted style={{ textAlign: 'center' }}>{t('settings.version')}</Muted>
      </View>
    </Screen>
  );
}
