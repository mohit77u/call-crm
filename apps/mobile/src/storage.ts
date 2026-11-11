import * as SecureStore from 'expo-secure-store';

export type SessionSim = { iccId: string | null; label: string; subId: number };
export type Session = { token: string; agentName: string; companyName: string; agentPhone?: string | null; syncFrom: number; sim?: SessionSim | null };

const KEYS = { session: 'session', lastSyncAt: 'lastSyncAt', clientCode: 'clientCode' } as const;

export async function getSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(KEYS.session);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export async function saveSession(session: Session) {
  await SecureStore.setItemAsync(KEYS.session, JSON.stringify(session));
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(KEYS.session);
  await SecureStore.deleteItemAsync(KEYS.lastSyncAt);
}

export async function getLastSyncAt() {
  const v = await SecureStore.getItemAsync(KEYS.lastSyncAt);
  return v ? Number(v) : null;
}

export async function setLastSyncAt(ms: number) {
  await SecureStore.setItemAsync(KEYS.lastSyncAt, String(ms));
}

export const getSavedClientCode = () => SecureStore.getItemAsync(KEYS.clientCode);
export const saveClientCode = (code: string) => SecureStore.setItemAsync(KEYS.clientCode, code);
