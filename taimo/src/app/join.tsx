import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { GroupSnapshot } from '@/domain/sync';
import { newId, useStore } from '@/store/store';
import { extractCode, joinRemoteGroup, SyncError, syncConfigured } from '@/sync/api';
import { Button, Card, Chip, Input, Muted, Row, Screen, Title } from '@/ui/components';
import { colors, space } from '@/ui/theme';

/**
 * Unirse a un grupo con un enlace `taimo://join?code=…` o escribiendo el código.
 * Después eliges quién eres de la lista (o te añades).
 */
export default function Join() {
  const params = useLocalSearchParams<{ code?: string }>();
  const { state, dispatch } = useStore();
  const [input, setInput] = useState(params.code ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<GroupSnapshot | null>(null);
  const [newName, setNewName] = useState(state.profile.name);

  async function lookup(raw: string) {
    const code = extractCode(raw);
    if (!code) {
      setError('Ese código no parece válido. Son 16 letras y números.');
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
      setError(e instanceof SyncError ? e.message : 'No se pudo entrar al grupo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.code) lookup(params.code);
  }, [params.code]);

  function joinAs(memberId: string, isNew: boolean) {
    if (!snapshot) return;
    dispatch({
      type: 'joinGroup',
      snapshot,
      meMemberId: memberId,
      newMemberName: isNew ? newName.trim() : undefined,
    });
    router.replace({ pathname: '/group/[id]', params: { id: snapshot.group.id } });
  }

  if (!syncConfigured) {
    return (
      <Screen>
        <Title>Grupos compartidos</Title>
        <Muted>Esta versión de Taimo todavía no tiene activados los grupos compartidos.</Muted>
        <Button label="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (snapshot) {
    const free = snapshot.members.filter((m) => !m.claimed);
    const expenseCount = snapshot.expenses.filter((e) => !e.deleted).length;
    return (
      <Screen>
        <Text style={{ fontSize: 48, textAlign: 'center' }}>{snapshot.group.emoji}</Text>
        <Title>{snapshot.group.name}</Title>
        <Muted>
          {snapshot.members.map((m) => m.name).join(', ')} · {expenseCount} {expenseCount === 1 ? 'gasto' : 'gastos'}
        </Muted>
        {free.length > 0 ? (
          <Card>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>¿Quién eres?</Text>
            <Row style={{ flexWrap: 'wrap' }}>
              {free.map((m) => (
                <Chip key={m.id} label={m.name} onPress={() => joinAs(m.id, false)} />
              ))}
            </Row>
          </Card>
        ) : null}
        <Card>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
            {free.length > 0 ? '¿No estás en la lista?' : 'Únete al grupo'}
          </Text>
          <Input placeholder="Tu nombre" value={newName} onChangeText={setNewName} />
          <Button label="Unirme" disabled={!newName.trim()} onPress={() => joinAs(newId(), true)} />
        </Card>
        <Muted>
          Los gastos de este grupo se compartirán con sus miembros. Tus gastos personales siguen solo en tu móvil.
        </Muted>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Unirme a un grupo</Title>
      <Muted>Pega el enlace o el código que te han enviado.</Muted>
      <Input
        placeholder="Código de 16 caracteres"
        value={input}
        onChangeText={setInput}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {loading ? (
        <View style={{ padding: space.lg }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <Button label="Buscar grupo" disabled={!input.trim()} onPress={() => lookup(input)} />
      )}
      <Button label="Cancelar" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
