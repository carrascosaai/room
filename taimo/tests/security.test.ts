import { describe, expect, it } from 'vitest';

import { makeBackup, makeCloudBackup, readBackup, restoredState } from '../src/domain/backup';
import { CAPTURE_MAX_AMOUNT, CAPTURE_MAX_MERCHANT, parseCaptureParams, pendingKind } from '../src/domain/capture';
import type { AppState } from '../src/domain/types';
import { initialState, reducer } from '../src/store/store';

const withPrivate: AppState = {
  ...initialState,
  onboarded: true,
  profile: {
    ...initialState.profile,
    name: 'Ana',
    lock: true,
    income: { monthly: 250000, hoursPerWeek: 40 },
    account: { id: 'u1', email: 'ana@example.com', provider: 'apple' },
  },
};

describe('copia en la nube', () => {
  it('no sube la cuenta ni los ingresos', () => {
    const cloud = makeCloudBackup(withPrivate);
    expect(cloud.profile.account).toBeUndefined();
    expect(cloud.profile.income).toBeUndefined();
    expect(JSON.stringify(cloud)).not.toContain('ana@example.com');
    expect(cloud.profile.name).toBe('Ana');
    // El estado original no se toca.
    expect(withPrivate.profile.income).toBeDefined();
  });

  it('al restaurar una copia sin ingresos, se conservan los del móvil', () => {
    const restored = reducer(withPrivate, { type: 'restoreBackup', state: makeCloudBackup(withPrivate) });
    expect(restored.profile.income).toEqual({ monthly: 250000, hoursPerWeek: 40 });
    expect(restored.profile.account?.id).toBe('u1');
  });
});

describe('restaurar copias', () => {
  it('nunca importa el bloqueo ni la cuenta de un archivo', () => {
    const file = makeBackup({ ...withPrivate, profile: { ...withPrivate.profile, lock: false } });
    const evil = JSON.stringify({ ...file, state: { ...file.state, profile: { ...file.state.profile, account: { id: 'x', provider: 'google' } } } });
    const back = readBackup(evil)!;
    expect(back.state.profile.lock).toBeUndefined();
    expect(back.state.profile.account).toBeUndefined();
    const restored = reducer(withPrivate, { type: 'restoreBackup', state: { ...back.state, profile: { ...back.state.profile, lock: false } } });
    expect(restored.profile.lock).toBe(true);
    expect(restored.profile.account?.id).toBe('u1');
  });

  it('rechaza estados con forma rara', () => {
    const ok = { app: 'taimo', state: { expenses: [], groups: [], profile: {} } };
    expect(readBackup(JSON.stringify(ok))).not.toBeNull();
    expect(readBackup(JSON.stringify({ ...ok, version: 2 }))).toBeNull();
    expect(readBackup(JSON.stringify({ ...ok, state: { ...ok.state, version: 7 } }))).toBeNull();
    expect(readBackup(JSON.stringify({ ...ok, state: { ...ok.state, profile: null } }))).toBeNull();
    expect(readBackup(JSON.stringify({ ...ok, state: { ...ok.state, settlements: 'x' } }))).toBeNull();
    expect(readBackup(JSON.stringify({ ...ok, state: { ...ok.state, expenses: [1] } }))).toBeNull();
    expect(readBackup(JSON.stringify({ ...ok, state: { ...ok.state, groups: [{ members: 'x' }] } }))).toBeNull();
    // Una copia rota desde la nube no pisa nada.
    expect(restoredState(withPrivate, { nope: true } as unknown as AppState)).toBe(withPrivate);
  });
});

describe('enlace taimo://capture', () => {
  it('recorta el comercio y rechaza importes absurdos', () => {
    const long = 'A'.repeat(500);
    const p = parseCaptureParams({ amount: '12,50', merchant: long })!;
    expect(p.merchant.length).toBe(CAPTURE_MAX_MERCHANT);
    expect(parseCaptureParams({ amount: '0' })).toBeNull();
    expect(parseCaptureParams({ amount: '99999999999' })).toBeNull();
    expect(parseCaptureParams({ amount: '9'.repeat(400) })).toBeNull();
    expect(parseCaptureParams({ amount: '12,50' })!.amount).toBe(1250);
    expect(CAPTURE_MAX_AMOUNT).toBe(100_000_000);
  });
});

describe('cola de capturas nativas', () => {
  it('una notificación de Android (trae `text`) no va por el camino de Siri', () => {
    const android = { package: 'com.google.android.apps.walletnfcrel', title: 'Mercadona', text: '12,30 €', postedAt: '2026-10-14T10:00:00Z' };
    expect(pendingKind(android, 'android')).toBe('notification');
    expect(pendingKind({ text: '12 euros en café', date: '2026-10-14T10:00:00Z', source: 'siri' }, 'ios')).toBe('siri');
    expect(pendingKind({ amount: '12,30 €', merchant: 'Mercadona', source: 'applepay' }, 'ios')).toBe('wallet');
    expect(pendingKind({ text: 'algo' }, 'android')).toBe('notification');
  });
});
