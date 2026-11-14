import CallLog from '../modules/call-log';
import type { DeviceCall, SimInfo } from '../modules/call-log';
import { ApiError, heartbeat, uploadCalls } from './api';
import { clearSession, getSession, getSimIdMap, saveSession, saveSimIdMap, setLastSyncAt, type SessionSim, type StoredSim } from './storage';

const BATCH = 200;

// Work-hours window: today 09:00–18:30 IST. Computed without device timezone
// dependence — IST is fixed UTC+5:30, so 09:00 IST = 03:30 UTC, 18:30 IST = 13:00 UTC.
function istWorkWindowMs(): { startMs: number; endMs: number } {
  const todayIst = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [y, m, d] = todayIst.split('-').map(Number);
  return {
    startMs: Date.UTC(y, m - 1, d, 3, 30, 0),
    endMs: Date.UTC(y, m - 1, d, 13, 0, 0),
  };
}

export type SyncResult =
  | {
      ok: true;
      uploaded: number;
      requested?: boolean;
      skipped?: number;
      fallbackSent?: number;
    }
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

// Every identifier the call log's PHONE_ACCOUNT_ID might contain for this SIM:
// subscription id, ICCID, and any telecom phone-account ids resolved natively.
export function simIdentifiers(sim: SimInfo): Set<string> {
  const ids = new Set<string>([String(sim.id)]);
  if (sim.iccId) ids.add(sim.iccId);
  for (const a of sim.accountIds ?? []) ids.add(a);
  return ids;
}

// Resolve which SIM a call belongs to. PHONE_ACCOUNT_ID format varies by OEM
// and Android version: subscription id (Android 13+), ICCID (Android 12-),
// ICCID embedded with extra chars (some Samsung), SIM slot index (some OEMs),
// or null. Matching tiers: exact id → long-id substring → slot index →
// single-SIM fallback.
export function findSimForCall(simsWithIds: { sim: SimInfo; ids: Set<string> }[], call: DeviceCall): SimInfo | null {
  const v = call.sim?.trim();
  if (!v) return simsWithIds.length === 1 ? simsWithIds[0].sim : null;
  const exact = simsWithIds.find((x) => x.ids.has(v));
  if (exact) return exact.sim;
  // ICCID can appear inside PHONE_ACCOUNT_ID with extra characters — only allow
  // substring matching for long identifiers so short subscription ids can't
  // cause false positives.
  const embedded = simsWithIds.find((x) =>
    [...x.ids].some((id) => id.length >= 10 && (v.includes(id) || (v.length >= 10 && id.includes(v))))
  );
  if (embedded) return embedded.sim;
  const bySlot = simsWithIds.find((x) => String(x.sim.slotIndex) === v || String(x.sim.slotIndex + 1) === v);
  return bySlot?.sim ?? (simsWithIds.length === 1 ? simsWithIds[0].sim : null);
}

// Rebuild a SimInfo from the identifiers saved at SIM-selection time. Used when
// listSims() comes back empty (READ_PHONE_STATE denied or OEM hides subscription
// info) so PHONE_ACCOUNT_ID matching can still resolve the selected SIM.
function simFromSession(s: SessionSim): SimInfo {
  return { id: s.subId, iccId: s.iccId, label: s.label, number: null, slotIndex: s.slotIndex ?? -1 };
}

// Merge identifiers learned on previous syncs into the live SIM list. Live and
// stored entries are matched by subscription id or ICCID (both stable per
// physical SIM); stored SIMs that are no longer active are kept so their
// historical calls still attribute to the right SIM.
function mergeStoredSims(live: SimInfo[], stored: StoredSim[]): SimInfo[] {
  const merged = live.map((s) => {
    const st = stored.find((x) => (s.iccId && x.iccId === s.iccId) || x.id === s.id);
    if (!st) return s;
    return {
      ...s,
      iccId: s.iccId ?? st.iccId,
      accountIds: [...new Set([...(s.accountIds ?? []), ...(st.accountIds ?? [])])],
    };
  });
  const known = new Set(merged.flatMap((s) => [String(s.id), s.iccId].filter(Boolean) as string[]));
  const extra = stored.filter((x) => !known.has(String(x.id)) && !(x.iccId && known.has(x.iccId)));
  return [...merged, ...extra];
}

function simDetailsOf(sim: SimInfo): Record<string, unknown> {
  return {
    subId: sim.id,
    iccId: sim.iccId,
    phoneAccountIds: sim.accountIds ?? [],
    slotIndex: sim.slotIndex,
    label: sim.label,
    number: sim.number,
  };
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
    if (!session.sim && !session.simAll && !session.simValues?.length) return { ok: true, uploaded: 0 };

    // simAll → sync call logs from every SIM (no SIM filter).
    // With a selected SIM we fetch all calls and attribute each one in JS —
    // PHONE_ACCOUNT_ID is unreliable across OEMs, so SQL-side filtering missed
    // calls on devices (e.g. Xiaomi) that store a different identifier or null.
    const { sims } = await CallLog.listSims().catch(() => ({ sims: [] as SimInfo[], slotCount: 0 }));
    const storedSims = await getSimIdMap().catch(() => [] as StoredSim[]);
    // Union of live SIMs (enriched with stored identifiers) and SIMs seen on
    // previous syncs — covers listSims() returning empty or partial data.
    const attributionSims = mergeStoredSims(sims, storedSims);
    const pool = attributionSims.length > 0 ? attributionSims : session.sim ? [simFromSession(session.sim)] : [];
    const simsWithIds = pool.map((s) => ({ sim: s, ids: simIdentifiers(s) }));
    // Persist every identifier we know — once an ICCID/subId is learned it
    // survives logouts, reboots and OEM resolution failures.
    saveSimIdMap(pool).catch(() => {});
    let selectedSim: SimInfo | null = null;
    if (session.sim) {
      selectedSim = await resolveSelectedSim(pool, session.sim);
      if (!selectedSim) {
        return { ok: false, reason: 'sim_unavailable', message: 'Selected SIM is not active. Please select the correct work SIM.' };
      }
      // Merge identifiers saved at SIM-selection time into the live SIM's
      // identifier set — e.g. Xiaomi stores the ICCID in PHONE_ACCOUNT_ID, and
      // the ICCID captured during selection still identifies the SIM even when
      // listSims() can no longer resolve it on this sync.
      if (session.sim.iccId) {
        const entry = simsWithIds.find((x) => x.sim === selectedSim);
        if (entry && !entry.ids.has(session.sim.iccId)) entry.ids.add(session.sim.iccId);
      }
    }

    let uploaded = 0;
    let skipped = 0;
    let fallbackSent = 0;
    let since = session.syncFrom;
    let sinceId: string | null = session.syncFromId ?? null;
    const { startMs, endMs } = istWorkWindowMs();
    for (;;) {
      const calls = await CallLog.getCallsSince(since, sinceId, BATCH);
      if (calls.length === 0) break;
      const resolved = calls.map((c) => ({ call: c, sim: findSimForCall(simsWithIds, c) }));
      // session.simValues → user-picked raw PHONE_ACCOUNT_ID groups (fallback
      // for OEMs where SIM identifiers can't be resolved, e.g. Xiaomi/ICCID).
      const rawValues = session.simValues?.length ? new Set(session.simValues) : null;
      const matched = rawValues
        ? resolved.filter((r) => rawValues.has(r.call.sim?.trim() || 'null'))
        : selectedSim
          ? resolved.filter((r) => r.sim === selectedSim)
          : resolved;
      // Fallback: when the selected SIM matches nothing in this batch but calls
      // exist whose SIM can't be identified at all, send those unattributed
      // calls anyway — on OEMs with broken SIM attribution (e.g. Xiaomi/ICCID)
      // this is the only way the work SIM's calls reach the CRM. Calls that
      // resolved to a different SIM stay excluded.
      const fallback =
        !rawValues && selectedSim && matched.length === 0 ? resolved.filter((r) => r.sim === null) : [];
      const toUpload = [...matched, ...fallback];
      skipped += calls.length - toUpload.length;
      const inWindowCalls = toUpload.filter((r) => r.call.timestamp >= startMs && r.call.timestamp < endMs);
      const inWindow = inWindowCalls.map((r) => ({ ...r.call, simDetails: r.sim ? simDetailsOf(r.sim) : null }));
      if (inWindow.length > 0) await uploadCalls(session.token, inWindow);
      uploaded += inWindow.length;
      fallbackSent += fallback.filter((r) => r.call.timestamp >= startMs && r.call.timestamp < endMs).length;
      const last = calls[calls.length - 1];
      since = last.timestamp;
      sinceId = last.id;
      await saveSession({ ...session, syncFrom: since, syncFromId: sinceId });
      if (calls.length < BATCH) break;
    }
    await setLastSyncAt(Date.now());
    return {
      ok: true,
      uploaded,
      requested,
      skipped,
      fallbackSent: fallbackSent || undefined,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await clearSession();
      return { ok: false, reason: 'logged_out' };
    }
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
