import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
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

import CallLog from './modules/call-log';
import { login, verifyClient } from './src/api';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await login(props.clientCode, username.trim(), password);
      const session: Session = { token: res.token, agentName: res.agent.name, companyName: res.company.name, syncFrom: res.syncFrom };
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
      <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Username" autoCapitalize="none" autoCorrect={false} />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry onSubmitEditing={submit} />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title="Login" onPress={submit} busy={busy} />
      <Pressable onPress={props.onBack} style={{ marginTop: 16 }}>
        <Text style={styles.link}>Change client code</Text>
      </Pressable>
    </View>
  );
}

function HomeScreen({ session, onLoggedOut }: { session: Session; onLoggedOut: () => void }) {
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
    if (result.ok) setMessage(result.uploaded ? `${result.uploaded} new calls sent` : 'Up to date');
    else if (result.reason === 'logged_out') onLoggedOut();
    else if (result.reason === 'no_permission') setMessage('Call log permission is needed');
    else setMessage(result.message ?? 'Sync failed');
  }, [onLoggedOut]);

  const askPermission = async () => {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG, {
      title: 'Call log access',
      message: `${session.companyName} uses your call history (number, time, duration) to show your calls in the company CRM.`,
      buttonPositive: 'Allow',
    });
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
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

  useEffect(() => {
    startBackgroundSync().catch(() => {});
    const kickoff = CallLog.hasPermission() ? sync : askPermission;
    setTimeout(kickoff, 0);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && sync());
    const timer = setInterval(sync, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.home}>
      <Text style={styles.title}>Hi, {session.agentName}</Text>
      <Text style={styles.muted}>{session.companyName}</Text>

      <View style={styles.card}>
        <Row label="Call log permission" value={hasPermission ? 'Allowed' : 'Not allowed'} ok={hasPermission} />
        <Row label="Last sync" value={lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Not yet'} ok={!!lastSyncAt} />
        {!!message && <Text style={[styles.muted, { marginTop: 8 }]}>{message}</Text>}
      </View>

      {!hasPermission && <Button title="Allow call log access" onPress={askPermission} />}
      <Button title="Sync now" onPress={syncNow} busy={busy} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Keep sync running</Text>
        <Text style={styles.muted}>
          Calls are sent when you open the app and about every 15 minutes in the background. On Xiaomi, Vivo, Oppo, Realme and
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
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e6eb', borderRadius: 8, padding: 12, fontSize: 16, marginTop: 12 },
  codeInput: { fontSize: 22, letterSpacing: 3, textAlign: 'center', marginTop: 20 },
  error: { color: '#c62828', marginTop: 10 },
  button: { backgroundColor: '#2556d9', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { color: '#2556d9', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e3e6eb', padding: 16, marginTop: 20 },
  cardTitle: { fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
});
