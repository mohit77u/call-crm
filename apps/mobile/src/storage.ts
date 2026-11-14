import * as SecureStore from 'expo-secure-store';

export type SessionSim = { iccId: string | null; label: string; subId: number; slotIndex?: number };
export type Session = { token: string; agentName: string; companyName: string; agentPhone?: string | null; syncFrom: number; syncFromId?: string | null; sim?: SessionSim | null; simAll?: boolean; simValues?: string[] | null; syncReqSeen?: number };

const KEYS = { session: 'session', lastSyncAt: 'lastSyncAt', clientCode: 'clientCode', simIdMap: 'simIdMap' } as const;

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

// SIM identifier map — survives logout because it describes physical SIMs on
// this device, not the login session. Once an ICCID/subId is learned for a SIM
// it stays known even when listSims() can no longer resolve it (OEM quirks).
export type StoredSim = { id: number; iccId: string | null; label: string | null; number: string | null; slotIndex: number; accountIds?: string[] };

export async function getSimIdMap(): Promise<StoredSim[]> {
  const raw = await SecureStore.getItemAsync(KEYS.simIdMap);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredSim[]) : [];
  } catch {
    return [];
  }
}

export async function saveSimIdMap(sims: StoredSim[]) {
  await SecureStore.setItemAsync(KEYS.simIdMap, JSON.stringify(sims.slice(0, 10)));
}
