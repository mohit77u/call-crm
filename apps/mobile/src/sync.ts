import CallLog from '../modules/call-log';
import type { SimInfo } from '../modules/call-log';
import { ApiError, heartbeat, uploadCalls } from './api';
import { clearSession, getSession, saveSession, setLastSyncAt, type Session } from './storage';

const BATCH = 200;

export type SyncResult = { ok: true; uploaded: number } | { ok: false; reason: 'logged_out' | 'no_permission' | 'error'; message?: string };

let running: Promise<SyncResult> | null = null;

export function syncCalls(): Promise<SyncResult> {
  running ??= doSync().finally(() => {
    running = null;
  });
  return running;
}

async function resolvePhoneAccountId(session: Session): Promise<string | null> {
  if (!session.sim) return null;
  const sims = await CallLog.listSims().catch(() => [] as SimInfo[]);
  const match = sims.find((s) => s.iccId && s.iccId === session.sim!.iccId) ?? sims.find((s) => s.id === session.sim!.subId);
  return match ? String(match.id) : null;
}

async function doSync(): Promise<SyncResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: 'logged_out' };
  const permissionsOk = CallLog.hasPermission();
  try {
    const location = await CallLog.getLastLocation().catch(() => null);
    await heartbeat(session.token, permissionsOk, location);
    if (!permissionsOk) return { ok: false, reason: 'no_permission' };
    if (!session.sim) return { ok: true, uploaded: 0 };

    const phoneAccountId = await resolvePhoneAccountId(session);
    if (!phoneAccountId) return { ok: false, reason: 'error', message: 'Selected SIM was not found on this phone' };

    let uploaded = 0;
    let since = session.syncFrom;
    for (;;) {
      const calls = await CallLog.getCallsSince(since, BATCH, phoneAccountId);
      if (calls.length === 0) break;
      await uploadCalls(session.token, calls);
      uploaded += calls.length;
      since = calls[calls.length - 1].timestamp;
      await saveSession({ ...session, syncFrom: since });
      if (calls.length < BATCH) break;
    }
    await setLastSyncAt(Date.now());
    return { ok: true, uploaded };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await clearSession();
      return { ok: false, reason: 'logged_out' };
    }
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
