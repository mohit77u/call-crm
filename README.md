# call-crm

Call tracking CRM for small teams.

- `apps/web`: Next.js CRM + REST API for the app (PostgreSQL). Companies sign up, get a unique **client code**, add agents and see every call agents make or receive, with status and duration.
- `apps/mobile`: Expo (React Native) Android app. The agent enters the client code, logs in with their username and password, allows call log access, and the app sends the phone's call log to the CRM.

## How it works

1. A company signs up on the web (`/signup`). A unique 8-character client code is generated (Settings page).
2. The company admin adds agents (name, username, password) on the Agents page.
3. The agent installs the APK, enters the client code, then their username and password. A device record is created and the app gets a token.
4. The app reads `CallLog.Calls` with a small local Expo module (`apps/mobile/modules/call-log`, Kotlin) and uploads new calls:
   - when the app is opened and every minute while it is open,
   - about every 15 minutes in the background (`expo-background-task`, Android WorkManager).
   Only calls made after the agent logged in are sent.
5. The CRM shows calls per agent with status and talk time. Status is derived on the server:

| Call type | Duration | Status |
|---|---|---|
| outgoing | > 0 | Connected |
| outgoing | 0 | Not Connected |
| incoming | > 0 | Received |
| incoming/missed | 0 | Missed |
| rejected | – | Rejected |
| blocked | – | Blocked |

The admin can disconnect a phone or disable an agent; the app is logged out on its next sync.

## Web setup

Requirements: Node.js 24, PostgreSQL 14+.

```bash
sudo -u postgres psql -c "CREATE USER callcrm WITH PASSWORD 'change-me';"
sudo -u postgres psql -c "CREATE DATABASE call_crm OWNER callcrm;"

cd apps/web
cp .env.example .env.local   # set DATABASE_URL and AUTH_SECRET
npm install
npm run dev                  # http://localhost:3000
```

Tables are created automatically on the first request. For production: `npm run build && npm run start`, behind HTTPS.

### App API

| Endpoint | Body | Notes |
|---|---|---|
| `POST /api/app/verify-client` | `{clientCode}` | returns `{companyName}` |
| `POST /api/app/login` | `{clientCode, username, password, device}` | returns `{token, agent, company, syncFrom}` |
| `POST /api/app/calls` | `{calls: [{id, number, name, type, timestamp, durationSec, sim}]}` | Bearer token; upsert on `(device_id, id)` |
| `POST /api/app/heartbeat` | `{permissionsOk, appVersion}` | Bearer token |

## Mobile app

The call log module is native code, so the app does **not** run in Expo Go. Build an APK:

```bash
cd apps/mobile
npm install
# set EXPO_PUBLIC_API_URL in eas.json (preview profile) to your CRM URL (HTTPS)
npx eas-cli@latest build -p android --profile preview
```

Share the APK link from EAS with agents. On first open the app asks for call log permission. On Xiaomi, Vivo, Oppo, Realme and Samsung phones, set Battery to "No restrictions" for the app so background sync keeps running.

Local development on an emulator: start the web app, then `npx expo run:android` (the default API URL `http://10.0.2.2:3000` points at the host machine).
