import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { authConfigured, deleteAccount, downloadBackup, signOut, uploadBackup } from '@/auth/auth';
import { makeBackup, readBackup } from '@/domain/backup';
import { totalBudget } from '@/domain/budget';
import { CATEGORIES } from '@/domain/categories';
import { parseBankFile } from '@/domain/bankfiles';
import { expensesToCsv, isAlreadyImported, rowsToExpenses } from '@/domain/csv';
import { historyDays, MIN_DAYS_FOR_BUDGET } from '@/domain/dataSpan';
import { suggestBudgets, type BudgetSuggestion } from '@/domain/insights';
import { parseAmount } from '@/domain/money';
import type { CategoryId } from '@/domain/types';
import { FALLBACK, rateBetween } from '@/fx/fx';
import { CURRENCIES, LANGUAGES, useI18n } from '@/i18n';
import { ensureNotificationPermission } from '@/notifications/local';
import { newId, useStore } from '@/store/store';
import { canLock, unlock } from '@/auth/lock';
import { AuthButtons } from '@/ui/AuthButtons';
import { Button, Card, CategoryBadge, Chip, H2, Input, Muted, Row, Screen, Title } from '@/ui/components';
import { CurrencyButton, CurrencyPicker } from '@/ui/CurrencyPicker';
import { confirm } from '@/ui/confirm';
import { colors, space } from '@/ui/theme';
import { toast } from '@/ui/Toast';

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
  const [budgetMessage, setBudgetMessage] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  // Propuesta de presupuesto: primero se enseña y solo se aplica si dices que sí.
  const [proposal, setProposal] = useState<BudgetSuggestion | null>(null);
  // Lo avanzado (cuenta en la nube, formatos de archivo, borrar todo) va plegado.
  const [advanced, setAdvanced] = useState(false);
  const [income, setIncome] = useState(state.profile.income ? String(Math.round(state.profile.income.monthly / 100)) : '');
  const [hours, setHours] = useState(state.profile.income ? String(state.profile.income.hoursPerWeek) : '40');
  const saveIncome = () => {
    const monthly = parseAmount(income);
    const h = Number(hours.replace(',', '.'));
    dispatch({ type: 'setIncome', income: monthly && h > 0 ? { monthly, hoursPerWeek: h } : undefined });
  };

  function suggest() {
    setProposal(null);
    // Con menos de un mes de gastos la propuesta saldría mal: mejor esperar.
    const days = historyDays(state.expenses);
    if (days < MIN_DAYS_FOR_BUDGET) {
      setBudgetMessage(t('fixa.suggestNeedDays', { days }));
      return;
    }
    const s = suggestBudgets(state);
    if (!s) {
      setBudgetMessage(t('smart.none'));
      return;
    }
    setBudgetMessage(null);
    setProposal(s);
  }

  function applyProposal() {
    if (!proposal) return;
    for (const [category, amount] of Object.entries(proposal.budgets)) dispatch({ type: 'setBudget', category: category as CategoryId, amount: amount! });
    setValues(Object.fromEntries(CATEGORIES.map((c) => {
      const v = proposal.budgets[c.id] ?? state.budgets[c.id];
      return [c.id, v ? String(Math.round(v / 100)) : ''];
    })));
    setProposal(null);
    setBudgetMessage(t('smart.text'));
  }

  async function saveBackup() {
    const json = JSON.stringify(makeBackup(state));
    const fileName = `taimo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast(t('fixa.backupSaved'));
      return;
    }
    const file = new File(Paths.cache, fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(json);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: t('backup.export') });
  }

  async function restoreFile() {
    setBackupMessage(null);
    let backup: ReturnType<typeof readBackup> = null;
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const text = Platform.OS === 'web' ? await (await fetch(asset.uri)).text() : await new File(asset.uri).text();
      backup = readBackup(text);
    } catch {
      setBackupMessage(t('settings.importError'));
      return;
    }
    if (!backup) {
      setBackupMessage(t('backup.invalid'));
      return;
    }
    const restored = backup;
    // Fecha de la copia: si viene rota, se dice "?" en vez de romper la pantalla.
    const exported = new Date(restored.exportedAt);
    const when = Number.isNaN(exported.getTime()) ? t('common.unknown') : i18n.date(exported, { dateStyle: 'medium' });
    confirm(t('backup.confirm', { date: when }), t('common.cancel'), t('backup.import'), () => {
      dispatch({ type: 'restoreBackup', state: restored.state });
      setBackupMessage(t('auth.restored'));
      toast(t('auth.restored'));
    });
  }

  async function toggleLock() {
    setLockMessage(null);
    if (state.profile.lock) {
      dispatch({ type: 'setLock', lock: false });
      return;
    }
    if (!(await canLock())) {
      setLockMessage(t('lock.unavailable'));
      return;
    }
    if (await unlock(t('lock.reason'))) dispatch({ type: 'setLock', lock: true });
  }
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
    let parsed: ReturnType<typeof parseBankFile>;
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        // CSV, OFX/QFX, QIF, CAMT.053 (XML) y MT940 (.sta/.mt940/.txt): los extractos de cualquier banco.
        type: ['*/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const text = Platform.OS === 'web' ? await (await fetch(asset.uri)).text() : await new File(asset.uri).text();
      parsed = parseBankFile(text);
    } catch {
      setCsvMessage(t('settings.importError'));
      return;
    }
    const { rows, skipped } = parsed;
    const home = state.profile.currency;
    const rates = state.fx ?? FALLBACK;
    const expenses = rowsToExpenses(rows, state.learnedCategories, t('capture.defaultMerchant')).map((e, i) => {
      const cur = rows[i].currency;
      const rate = cur && cur !== home ? rateBetween(cur, home, rates) : null;
      return rate ? { ...e, amount: Math.round(e.amount * rate), original: { amount: e.amount, currency: cur!, rate } } : e;
    });
    const fresh = expenses.filter((e) => !isAlreadyImported(state.expenses, e));
    if (fresh.length > 0) dispatch({ type: 'importExpenses', expenses: fresh.map((e) => ({ ...e, id: newId() })) });
    if (expenses.length === 0) {
      setCsvMessage(t('settings.importNone'));
      return;
    }
    const dupes = expenses.length - fresh.length;
    toast(t('settings.imported', { count: fresh.length }));
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
      {/* ── Tú y la app ── */}
      <Section title={t('fixa.secYou')} />
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
        <H2>{t('theme.title')}</H2>
        <Row style={{ flexWrap: 'wrap' }}>
          {(['auto', 'light', 'dark'] as const).map((th) => (
            <Chip key={th} label={t(`theme.${th}`)} selected={(state.profile.theme ?? 'auto') === th} onPress={() => dispatch({ type: 'setTheme', theme: th })} />
          ))}
        </Row>
      </Card>

      <Card>
        <H2>{t('settings.notifications')}</H2>
        <Muted>{t('settings.notificationsText')}</Muted>
        <Button label={t('settings.enableNotifications')} variant="secondary" onPress={() => ensureNotificationPermission().catch(() => {})} />
      </Card>

      {Platform.OS !== 'web' ? (
        <Card>
          <Row>
            <View style={{ flex: 1, gap: 2 }}>
              <H2>🔒 {t('lock.title')}</H2>
              <Muted>{t('lock.text')}</Muted>
            </View>
            <Switch accessibilityLabel={t('lock.title')} value={!!state.profile.lock} onValueChange={() => toggleLock().catch(() => {})} trackColor={{ true: colors.primary, false: colors.border }} />
          </Row>
          {lockMessage ? <Muted>{lockMessage}</Muted> : null}
        </Card>
      ) : null}

      {/* ── Presupuesto ── */}
      <Section title={t('fixa.secBudget')} />
      <Card>
        <H2>{t('settings.budget')}</H2>
        <Muted>{t('settings.total', { amount: money(totalBudget(state.budgets)) })}</Muted>
        <Button label={t('smart.suggest')} variant="secondary" onPress={suggest} />
        {budgetMessage ? <Muted>{budgetMessage}</Muted> : null}
        {proposal ? (
          <View style={{ gap: space.sm, backgroundColor: colors.primarySoft, borderRadius: 16, padding: space.md, borderWidth: 1, borderColor: colors.primaryDark }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{t('fixa.proposalTitle')}</Text>
            {CATEGORIES.filter((c) => proposal.budgets[c.id] !== undefined).map((c) => (
              <Row key={c.id} style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, flex: 1 }}>
                  {c.emoji} {t(`cat.${c.id}`)}
                </Text>
                <Muted>{state.budgets[c.id] ? money(state.budgets[c.id]!) : '—'}</Muted>
                <Text style={{ color: colors.text, fontWeight: '700' }}> → {money(proposal.budgets[c.id]!)}</Text>
              </Row>
            ))}
            <Muted>{t('smart.text')}</Muted>
            <Button label={t('fixa.apply')} onPress={applyProposal} />
            <Button label={t('common.cancel')} variant="ghost" onPress={() => setProposal(null)} />
          </View>
        ) : null}
        {CATEGORIES.map((c) => (
          <Row key={c.id}>
            <CategoryBadge id={c.id} size={32} />
            <Text style={{ color: colors.text, flex: 1 }}>{t(`cat.${c.id}`)}</Text>
            <View style={{ width: 100 }}>
              <Input
                value={values[c.id]}
                accessibilityLabel={`${t(`cat.${c.id}`)} (${i18n.currency})`}
                keyboardType="decimal-pad"
                placeholder="—"
                style={{ textAlign: 'right', paddingVertical: 8 }}
                onChangeText={(v) => setValues((prev) => ({ ...prev, [c.id]: v }))}
                onBlur={() => dispatch({ type: 'setBudget', category: c.id, amount: parseAmount(values[c.id]) ?? 0 })}
              />
            </View>
            <Muted style={{ width: 40 }}>{i18n.currency}</Muted>
          </Row>
        ))}
      </Card>

      <Card>
        <H2>⏱️ {t('work.title')}</H2>
        <Muted>{t('work.hint')}</Muted>
        <Row>
          <View style={{ flex: 1 }}>
            <Input label={t('work.income')} value={income} onChangeText={setIncome} onBlur={saveIncome} keyboardType="decimal-pad" placeholder="1500" />
          </View>
          <View style={{ width: 120 }}>
            <Input label={t('work.hours')} value={hours} onChangeText={setHours} onBlur={saveIncome} keyboardType="decimal-pad" />
          </View>
        </Row>
      </Card>

      {/* ── Cómo te pagan ── */}
      <Section title={t('fixa.secPay')} />
      <Card>
        <H2>{t('pay.title')}</H2>
        <Muted>{t('pay.hint')}</Muted>
        <Input label={t('pay.bizum')} value={payment.bizum ?? ''} keyboardType="phone-pad" placeholder="600 000 000" onChangeText={(v) => setPayment((p) => ({ ...p, bizum: v }))} onBlur={savePayment} />
        <Input label={t('pay.iban')} value={payment.iban ?? ''} autoCapitalize="characters" autoCorrect={false} placeholder="ES00 0000 0000 0000 0000 0000" onChangeText={(v) => setPayment((p) => ({ ...p, iban: v }))} onBlur={savePayment} />
        <Input label={t('pay.paypal')} value={payment.paypal ?? ''} autoCapitalize="none" autoCorrect={false} placeholder="paypal.me/…" onChangeText={(v) => setPayment((p) => ({ ...p, paypal: v }))} onBlur={savePayment} />
        <Input label={t('pay.revolut')} value={payment.revolut ?? ''} autoCapitalize="none" autoCorrect={false} placeholder="@…" onChangeText={(v) => setPayment((p) => ({ ...p, revolut: v }))} onBlur={savePayment} />
      </Card>

      {/* ── Copias y extractos ── */}
      <Section title={t('fixa.secData')} />
      <Card>
        <H2>{t('backup.title')}</H2>
        <Muted>{t('backup.text')}</Muted>
        <Button label={t('backup.export')} variant="secondary" onPress={() => saveBackup().catch(() => {})} />
        <Button label={t('fixa.restoreCopy')} variant="secondary" onPress={() => restoreFile().catch(() => setBackupMessage(t('backup.invalid')))} />
        {backupMessage ? <Muted>{backupMessage}</Muted> : null}
      </Card>

      <Card>
        <H2>🏦 {t('fixa.importBank')}</H2>
        <Muted>{t('fixa.importBankHint')}</Muted>
        <Button label={t('fixa.importBankButton')} variant="secondary" onPress={() => importCsv().catch(() => setCsvMessage(t('settings.importError')))} />
        <Button label={t('settings.export')} variant="ghost" onPress={() => exportCsv().catch(() => {})} />
        {csvMessage ? <Muted>{csvMessage}</Muted> : null}
      </Card>

      {/* ── Más opciones (plegado) ── */}
      <Button label={advanced ? `▲ ${t('fixa.fewerOptions')}` : `▼ ${t('fixa.moreOptions')}`} variant="ghost" onPress={() => setAdvanced((v) => !v)} />
      {advanced ? (
        <>
          <Card>
            <H2>{t('settings.data')}</H2>
            <Muted>{t('settings.dataText')}</Muted>
          </Card>

          {authConfigured || account ? (
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
                  <Button
                    label={t('auth.deleteAccount')}
                    variant="danger"
                    onPress={() =>
                      confirm(t('auth.deleteConfirm'), t('common.cancel'), t('common.delete'), async () => {
                        try {
                          await deleteAccount();
                          dispatch({ type: 'setAccount', account: undefined });
                          setAccountMessage(t('auth.deleted'));
                        } catch {
                          setAccountMessage(t('auth.deleteError'));
                        }
                      })
                    }
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
          ) : null}

          <Card>
            <H2>{t('settings.privacy')}</H2>
            <Muted>{t('settings.privacyText')}</Muted>
          </Card>

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
        </>
      ) : null}
    </Screen>
  );
}

/** Título de cada bloque de Ajustes, grande y con aire por encima. */
function Section({ title }: { title: string }) {
  return (
    <Text accessibilityRole="header" style={{ color: colors.primary, fontSize: 18, fontWeight: '800', marginTop: space.md }}>
      {title}
    </Text>
  );
}
