import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Linking,
  PermissionsAndroid,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import CallLog from './modules/call-log';
import type { SimInfo, SimList } from './modules/call-log';
import { heartbeat, login, verifyClient } from './src/api';
import { startBackgroundSync, stopBackgroundSync } from './src/backgroundSync';
import {
  type Session,
  clearSession,
  getLastSyncAt,
  getSavedClientCode,
  getSession,
  saveClientCode,
  saveSession,
} from './src/storage';
import { syncCalls } from './src/sync';

type Screen = { name: 'loading' } | { name: 'code' } | { name: 'login'; clientCode: string; companyName: string } | { name: 'home'; session: Session };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });

  useEffect(() => {
    getSession().then((session) => setScreen(session ? { name: 'home', session } : { name: 'code' }));
  }, []);

  return (
    <KeyboardAvoidingView style={styles.root} behavior="height">
      <StatusBar style="dark" />
      {screen.name === 'loading' && <ActivityIndicator style={{ flex: 1 }} />}
      {screen.name === 'code' && <CodeScreen onVerified={(clientCode, companyName) => setScreen({ name: 'login', clientCode, companyName })} />}
      {screen.name === 'login' && (
        <LoginScreen
          clientCode={screen.clientCode}
          companyName={screen.companyName}
          onBack={() => setScreen({ name: 'code' })}
          onLoggedIn={(session) => setScreen({ name: 'home', session })}
        />
      )}
      {screen.name === 'home' && <HomeScreen session={screen.session} onLoggedOut={() => setScreen({ name: 'code' })} />}
    </KeyboardAvoidingView>
  );
}

function CodeScreen({ onVerified }: { onVerified: (code: string, companyName: string) => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSavedClientCode().then((saved) => saved && setCode(saved));
  }, []);

  const submit = async () => {
    const clientCode = code.trim().toUpperCase();
    if (!clientCode) return setError('Enter the client code');
    setBusy(true);
    setError('');
    try {
      const { companyName } = await verifyClient(clientCode);
      await saveClientCode(clientCode);
      onVerified(clientCode, companyName);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Call CRM</Text>
      <Text style={styles.muted}>Enter the client code given by your company</Text>
      <TextInput
        style={[styles.input, styles.codeInput]}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="CLIENT CODE"
        onSubmitEditing={submit}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title="Continue" onPress={submit} busy={busy} />
    </View>
  );
}

function LoginScreen(props: { clientCode: string; companyName: string; onBack: () => void; onLoggedIn: (s: Session) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await login(props.clientCode, username.trim(), password);
      const session: Session = {
        token: res.token,
        agentName: res.agent.name,
        companyName: res.company.name,
        agentPhone: res.agent.phone,
        syncFrom: res.syncFrom,
      };
      await saveSession(session);
      props.onLoggedIn(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.center}>
      <Text style={styles.title}>{props.companyName}</Text>
      <Text style={styles.muted}>Client code: {props.clientCode}</Text>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Enter username" placeholderTextColor="#9ca3af" autoCapitalize="none" autoCorrect={false} />
      <View style={styles.passwordWrap}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          placeholderTextColor="#9ca3af"
          secureTextEntry={!showPassword}
          onSubmitEditing={submit}
        />
        <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748b" />
        </Pressable>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title="Login" onPress={submit} busy={busy} />
      <Pressable onPress={props.onBack} style={{ marginTop: 16 }}>
        <Text style={styles.link}>Change client code</Text>
      </Pressable>
    </View>
  );
}

function HomeScreen({ session, onLoggedOut }: { session: Session; onLoggedOut: () => void }) {
  const [sess, setSess] = useState(session);
  const [pickingSim, setPickingSim] = useState(!session.sim && !session.simAll);
  const [hasPermission, setHasPermission] = useState(CallLog.hasPermission());
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const logout = useCallback(async () => {
    await stopBackgroundSync();
    await clearSession();
    onLoggedOut();
  }, [onLoggedOut]);

  const sync = useCallback(async () => {
    const result = await syncCalls();
    setHasPermission(CallLog.hasPermission());
    setLastSyncAt(await getLastSyncAt());
    if (result.ok) setMessage(result.requested ? 'Synced (requested by admin)' : result.uploaded ? `${result.uploaded} new calls sent` : 'Up to date');
    else if (result.reason === 'logged_out') onLoggedOut();
    else if (result.reason === 'no_permission') setMessage('Call log permission is needed');
    else if (result.reason === 'sim_unavailable') {
      setMessage(result.message ?? 'Selected SIM is not active. Please select the correct work SIM.');
      setPickingSim(true);
    } else setMessage(result.message ?? 'Sync failed');
  }, [onLoggedOut]);

  const askPermission = async () => {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    if (Object.values(result).includes(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) {
      setMessage('Permission blocked. Enable "Call logs" in app settings.');
      Linking.openSettings();
    }
    setHasPermission(CallLog.hasPermission());
    sync();
  };

  const syncNow = async () => {
    setBusy(true);
    await sync();
    setBusy(false);
  };

  // Lightweight poll: check for an admin "Sync now" request every 30s and run a
  // full sync immediately when one is pending (instead of waiting for the 60s cycle).
  const pollSyncRequest = useCallback(async () => {
    const s = await getSession();
    if (!s) return;
    try {
      const res = await heartbeat(s.token, CallLog.hasPermission(), null);
      const ts = res.syncRequestedAt ? Date.parse(res.syncRequestedAt) : 0;
      if (ts > (s.syncReqSeen ?? 0)) {
        await saveSession({ ...s, syncReqSeen: ts });
        sync();
      }
    } catch {
      // network/server hiccup — next poll will retry
    }
  }, [sync]);

  useEffect(() => {
    startBackgroundSync().catch(() => {});
    const kickoff = CallLog.hasPermission() ? sync : askPermission;
    setTimeout(kickoff, 0);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && sync());
    const timer = setInterval(sync, 60_000);
    const pollTimer = setInterval(pollSyncRequest, 30_000);
    return () => {
      sub.remove();
      clearInterval(timer);
      clearInterval(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pickingSim) {
    return <SimPicker agentPhone={sess.agentPhone} onDone={(s) => { setSess(s); setPickingSim(false); }} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.home}>
      <Text style={styles.title}>Hi, {sess.agentName}</Text>
      <Text style={styles.muted}>{sess.companyName}</Text>

      <View style={styles.card}>
        <Row label="Call log permission" value={hasPermission ? 'Allowed' : 'Not allowed'} ok={hasPermission} />
        <Row label="Work SIM" value={sess.sim?.label ?? (sess.simAll ? 'All SIMs' : 'Not selected')} ok={!!sess.sim || !!sess.simAll} />
        <Row label="Last sync" value={lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Not yet'} ok={!!lastSyncAt} />
        {!!message && <Text style={[styles.muted, { marginTop: 8 }]}>{message}</Text>}
      </View>

      <Pressable onPress={() => setPickingSim(true)} style={{ marginTop: 12, alignSelf: 'center' }}>
        <Text style={styles.link}>Change work SIM</Text>
      </Pressable>

      {!hasPermission && <Button title="Allow call log access" onPress={askPermission} />}
      <Button title="Sync now" onPress={syncNow} busy={busy} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Keep sync running</Text>
        <Text style={styles.muted}>
          Calls are sent when you open the app and about every 5 minutes in the background. On Xiaomi, Vivo, Oppo, Realme and
          Samsung phones, set Battery to “No restrictions” for this app so background sync is not stopped.
        </Text>
        <Pressable onPress={() => Linking.openSettings()} style={{ marginTop: 8 }}>
          <Text style={styles.link}>Open app settings</Text>
        </Pressable>
      </View>

      <Pressable onPress={logout} style={{ marginTop: 24, alignSelf: 'center' }}>
        <Text style={[styles.link, { color: '#c62828' }]}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

function SimPicker({ agentPhone, onDone }: { agentPhone?: string | null; onDone: (s: Session) => void }) {
  const [device, setDevice] = useState<SimList | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const autoSaved = useRef(false);

  const loadSims = useCallback(async () => {
    setBusy(true);
    setLoadError('');
    try {
      // SIM info needs READ_PHONE_STATE — request it here too, since the picker
      // can mount before the home screen's permission flow finishes.
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      ]);
      const result = await CallLog.listSims();
      setDevice(result);
    } catch {
      setDevice({ sims: [], slotCount: 0 });
      setLoadError('Unable to read SIM information. Check phone permissions.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    loadSims();
  }, [loadSims]);

  const choose = useCallback(
    async (sim: SimInfo) => {
      setBusy(true);
      const session = await getSession();
      if (session) {
        const updated: Session = {
          ...session,
          sim: { iccId: sim.iccId, label: sim.label ?? `SIM ${sim.id}`, subId: sim.id, slotIndex: sim.slotIndex },
          simAll: false,
        };
        await saveSession(updated);
        onDone(updated);
      }
      setBusy(false);
    },
    [onDone]
  );

  const chooseAll = useCallback(async () => {
    setBusy(true);
    const session = await getSession();
    if (session) {
      const updated: Session = { ...session, sim: null, simAll: true };
      await saveSession(updated);
      onDone(updated);
    }
    setBusy(false);
  }, [onDone]);

  useEffect(() => {
    if (!device || autoSaved.current) return;
    const sims = device.sims;
    if (device.slotCount === 1 && sims.length === 1) {
      autoSaved.current = true;
      choose(sims[0]);
    }
  }, [device, choose]);

  const sims = device?.sims ?? [];

  return (
    <ScrollView contentContainerStyle={styles.center}>
      <Text style={styles.title}>Select work SIM</Text>
      <Text style={styles.muted}>
        Choose the SIM used for work calls — only calls on this SIM will be sent to the CRM.
        On a single-SIM phone the inserted SIM is selected automatically.
      </Text>
      {busy && device === null && <ActivityIndicator style={{ marginTop: 24 }} />}
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
      {device?.slotCount === 1 && sims.length === 1 ? (
        <Text style={[styles.muted, { marginTop: 16 }]}>Single-SIM phone detected. The inserted SIM will be selected automatically.</Text>
      ) : null}
      {sims.map((s, i) => (
        <Button
          key={`${s.slotIndex}-${s.id}`}
          title={`${s.label ?? `SIM ${i + 1}`}${s.number ? ` · ${s.number}` : ''}`}
          onPress={() => choose(s)}
          busy={busy}
        />
      ))}
      {device && sims.length === 0 && !loadError && (
        <Text style={[styles.muted, { marginTop: 16 }]}>No active SIM detected. Check that a SIM is inserted and enabled.</Text>
      )}
      {!!loadError && <Button title="Retry" onPress={loadSims} busy={busy} />}
      {!loadError && device && sims.length === 0 && <Button title="Refresh" onPress={loadSims} busy={busy} />}
      <Button title="Sync calls from all SIMs" onPress={chooseAll} busy={busy} />
      <Text style={[styles.muted, { marginTop: 8, fontSize: 12, textAlign: 'center' }]}>
        Use this if you only have one work SIM or want every call synced regardless of SIM.
      </Text>
    </ScrollView>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={styles.row}>
      <Text>{label}</Text>
      <Text style={{ color: ok ? '#1b8a4b' : '#c62828', fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function Button({ title, onPress, busy }: { title: string; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable style={[styles.button, busy && { opacity: 0.6 }]} onPress={onPress} disabled={busy}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f6f8' },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  home: { padding: 24, paddingTop: 64 },
  title: { fontSize: 24, fontWeight: '700', color: '#1c2333', marginBottom: 4 },
  muted: { color: '#6b7280' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e6eb', borderRadius: 8, padding: 12, fontSize: 16, marginTop: 12, color: '#0f172a' },
  passwordWrap: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },
  codeInput: { fontSize: 22, letterSpacing: 3, textAlign: 'center', marginTop: 20 },
  error: { color: '#c62828', marginTop: 10 },
  button: { backgroundColor: '#2556d9', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { color: '#2556d9', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e3e6eb', padding: 16, marginTop: 20 },
  cardTitle: { fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
});
