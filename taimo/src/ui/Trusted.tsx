import * as Linking from 'expo-linking';
import { useState } from 'react';
import { View } from 'react-native';

import { cleanTrusted, telHref } from '@/domain/scam';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';

import { BigButton, Button, H2, Input, Muted, Row } from './components';
import { space } from './theme';

/** Botón grande para llamar a tu persona de confianza (si la tienes). */
export function CallTrusted({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
  const { state } = useStore();
  const { t } = useI18n();
  const trusted = state.profile.trusted;
  const href = trusted ? telHref(trusted.phone) : null;
  if (!trusted || !href) return null;
  return <BigButton label={t('scam.callTrusted', { name: trusted.name })} variant={variant} onPress={() => Linking.openURL(href).catch(() => {})} />;
}

/**
 * Elegir la persona de confianza: nombre y teléfono, nada más.
 * Se usa en Ajustes y en «Antes de pagar, comprueba».
 */
export function TrustedForm() {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const trusted = state.profile.trusted;
  const [editing, setEditing] = useState(!trusted);
  const [name, setName] = useState(trusted?.name ?? '');
  const [phone, setPhone] = useState(trusted?.phone ?? '');
  const [message, setMessage] = useState<string | null>(null);

  function save() {
    const next = cleanTrusted(name, phone);
    if (!next) {
      setMessage(t('scam.trustedMissing'));
      return;
    }
    dispatch({ type: 'setTrusted', trusted: next });
    setMessage(t('scam.trustedSaved'));
    setEditing(false);
  }

  function remove() {
    dispatch({ type: 'setTrusted', trusted: undefined });
    setName('');
    setPhone('');
    setMessage(null);
    setEditing(true);
  }

  return (
    <View style={{ gap: space.md }}>
      <H2>🤝 {t('scam.trustedTitle')}</H2>
      <Muted>{t('scam.trustedText')}</Muted>
      {trusted && !editing ? (
        <>
          <Muted style={{ fontWeight: '700' }}>{`${trusted.name} · ${trusted.phone}`}</Muted>
          <Row style={{ flexWrap: 'wrap' }}>
            <Button label={t('scam.trustedChange')} variant="secondary" onPress={() => setEditing(true)} />
            <Button label={t('scam.trustedRemove')} variant="danger" onPress={remove} />
          </Row>
        </>
      ) : (
        <>
          <Input label={t('scam.trustedName')} value={name} onChangeText={setName} autoCapitalize="words" />
          <Input label={t('scam.trustedPhone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
          <Button label={t('scam.trustedSave')} onPress={save} />
        </>
      )}
      {message ? <Muted>{message}</Muted> : null}
    </View>
  );
}
