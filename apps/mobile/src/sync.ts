import CallLog from '../modules/call-log';
import type { SimInfo } from '../modules/call-log';
import { ApiError, heartbeat, uploadCalls } from './api';
import { clearSession, getSession, saveSession, setLastSyncAt, type SessionSim } from './storage';

const BATCH = 200;

export type SyncResult =
  | { ok: true; uploaded: number; requested?: boolean }
  | { ok: false; reason: 'logged_out' | 'no_permission' | 'sim_unavailable' | 'error'; message?: string };

let running: Promise<SyncResult> | null = null;

export function syncCalls(): Promise<SyncResult> {
  running ??= doSync().finally(() => {
    running = null;
  });
  return running;
}

async function resolveSelectedSim(sims: SimInfo[], sessionSim: SessionSim): Promise<SimInfo | null> {
  return (
    sims.find((s) => s.iccId && s.iccId === sessionSim.iccId) ??
    sims.find((s) => s.id === sessionSim.subId && (sessionSim.slotIndex === undefined || s.slotIndex === sessionSim.slotIndex)) ??
    null
  );
}

async function doSync(): Promise<SyncResult> {
  let session = await getSession();
  if (!session) return { ok: false, reason: 'logged_out' };
  const permissionsOk = CallLog.hasPermission();
  try {
    const location = await CallLog.getLastLocation().catch(() => null);
    const hb = await heartbeat(session.token, permissionsOk, location);
    // Admin "Sync now" from CRM → sync_requested_at on the device. If it's newer
    // than what we've already seen, mark this run as admin-requested.
    let requested = false;
    const reqTs = hb.syncRequestedAt ? Date.parse(hb.syncRequestedAt) : 0;
    if (reqTs > (session.syncReqSeen ?? 0)) {
      session = { ...session, syncReqSeen: reqTs };
      await saveSession(session);
      requested = true;
    }
    if (!permissionsOk) return { ok: false, reason: 'no_permission' };
    if (!session.sim && !session.simAll) return { ok: true, uploaded: 0 };

    // simAll → sync call logs from every SIM (phoneAccountId = null).
    // Each uploaded call still carries its own PHONE_ACCOUNT_ID in `sim`.
    let phoneAccountId: string | null = null;
    if (session.sim) {
      const { sims } = await CallLog.listSims().catch(() => ({ sims: [], slotCount: 0 }));
      const selectedSim = await resolveSelectedSim(sims, session.sim);
      if (!selectedSim) {
        return { ok: false, reason: 'sim_unavailable', message: 'Selected SIM is not active. Please select the correct work SIM.' };
      }
      phoneAccountId = String(selectedSim.id);
    }

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
    return { ok: true, uploaded, requested };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await clearSession();
      return { ok: false, reason: 'logged_out' };
    }
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
