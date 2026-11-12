# call-crm

Call tracking CRM for small teams.

- `apps/web/frontend`: Next.js CRM web app (deployed on Vercel). Company admins log in, manage agents and view call logs. The platform admin creates companies and toggles their features/plans.
- `apps/web/backend`: Express + TypeScript + TypeORM REST API (PostgreSQL). Serves both the CRM frontend and the Android app. Deployed on Render.
- `apps/mobile`: Expo (React Native) Android app. The agent enters the client code, logs in with their username and password, allows call log access, and the app sends the phone's call log to the CRM API.

## Architecture

```
apps/web/
  frontend/   Next.js 16 — server components call the API with the admin's JWT (httpOnly cookie)
  backend/    Express + TypeORM — modules/<feature>/{entity,service,controller}
    modules/auth        admin / platform / app login, password reset
    modules/app         mobile endpoints (/api/app/*)
    modules/agents      CRM agent CRUD + device revoke
    modules/call-logs   dashboard, calls list, CSV export, filters
    modules/settings    company name + client code
    modules/superadmin  platform admin: companies CRUD, feature flags, exports
    modules/companies   company entity + feature/plan helpers
    shared/             jwt, password, mail, csv, features, calls utils
```

Auth: the backend issues JWTs (admin 7d, platform 7d, app 365d). The frontend stores them in httpOnly cookies and forwards them as `Authorization: Bearer` server-side — tokens never reach the browser JS. The mobile app stores its token in secure storage.

## How it works

1. Only the **platform admin** creates companies (Admin panel → New company), choosing which features/limits are enabled (call sync, location tracking, CSV exports, reports, max agents — the base for future subscription plans).
2. Company admins get a unique 8-character **client code** and log in to the CRM (login / forgot password / reset password only — no public signup).
3. The company admin adds agents (name, username, password) on the Agents page.
4. The agent installs the APK, enters the client code, then their username and password. A device record is created and the app gets a token.
5. The app reads `CallLog.Calls` with a small local Expo module (`apps/mobile/modules/call-log`, Kotlin) and uploads new calls:
   - when the app is opened and every minute while it is open,
   - about every 15 minutes in the background (`expo-background-task`, Android WorkManager).
   Only calls made after the agent logged in are sent. On dual-SIM phones the agent picks which SIM's call logs sync.
6. The CRM shows calls per agent with status and talk time. Status is derived on the server:

| Call type | Duration | Status |
|---|---|---|
| outgoing | > 0 | Connected |
| outgoing | 0 | Not Connected |
| incoming | > 0 | Received |
| incoming/missed | 0 | Missed |
| rejected | – | Rejected |
| blocked | – | Blocked |

The admin can disconnect a phone or disable an agent; the app is logged out on its next sync.

## Local setup

Requirements: Node.js 22+, PostgreSQL 14+.

```bash
# 1. Database
sudo -u postgres psql -c "CREATE USER callcrm WITH PASSWORD 'callcrm';"
sudo -u postgres psql -c "CREATE DATABASE call_crm OWNER callcrm;"

# 2. Backend API  → http://localhost:4000
cd apps/web/backend
cp .env.example .env      # set DATABASE_URL and AUTH_SECRET
npm install
npm run dev

# 3. Frontend CRM  → http://localhost:3050
cd ../frontend
cp .env.example .env.local   # set API_URL=http://localhost:4000
npm install
npm run dev
```

Tables are created automatically on API startup. Seed the first platform admin via `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD` in `apps/web/backend/.env`.

Mobile dev: set `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000` in `apps/mobile/.env` (emulator) or your LAN/backend URL, then `npm run mobile`.

## API endpoints

### App (mobile)

| Endpoint | Body | Notes |
|---|---|---|
| `POST /api/app/verify-client` | `{clientCode}` | returns `{companyName}` |
| `POST /api/app/login` | `{clientCode, username, password, device}` | returns `{token, agent, company, syncFrom}` |
| `POST /api/app/calls` | `{calls: [...]}` | Bearer token; requires `callSync` feature; upsert on `(device_id, id)` |
| `POST /api/app/heartbeat` | `{permissionsOk, appVersion, location}` | Bearer token; location stored only if `locations` feature on |
| `GET /api/app/me` | – | Bearer token |

### CRM (company admin, Bearer = admin JWT)

`GET /api/crm/dashboard`, `GET|POST /api/crm/agents`, `POST /api/crm/agents/:id/active`, `POST /api/crm/agents/:id/password`, `POST /api/crm/devices/:id/revoke`, `GET /api/crm/calls`, `GET /api/crm/calls/export` (needs `exports`), `GET /api/crm/settings`, `POST /api/crm/settings/name`, `POST /api/crm/settings/client-code`.

### Platform admin (Bearer = platform JWT)

`GET /api/admin/overview`, `GET|POST /api/admin/companies`, `GET|PATCH /api/admin/companies/:id`, `POST /api/admin/companies/:id/client-code`, `GET /api/admin/agents`, `GET /api/admin/calls`, `GET /api/admin/exports/{companies,agents,calls}.csv`, `GET /api/admin/features`.

### Auth

`POST /api/auth/admin/login`, `GET /api/auth/admin/me`, `POST /api/auth/platform/login`, `GET /api/auth/platform/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`.

## Deploy

### Backend → Render (+ Postgres)

`render.yaml` at the repo root is a Render Blueprint: it creates the web service (`apps/web/backend`) and a Postgres database. Render dashboard → **New → Blueprint** → pick this repo.

Env vars to set after first deploy: `CORS_ORIGIN` and `APP_URL` (your Vercel URL), `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, and SMTP vars for password-reset emails.

Note: Render's free Postgres expires after 30 days — upgrade or migrate before then.

### Frontend → Vercel

Import `apps/web/frontend` as the project root on Vercel. Set env var:

```
API_URL=https://<your-render-api>.onrender.com
```

No build config needed — Next.js defaults work.

### Mobile

Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` (or `eas.json` build profile) to the Render API URL, then build:

```bash
cd apps/mobile
npx eas-cli@latest build -p android --profile preview
```

On first open the app asks for call log permission. On Xiaomi, Vivo, Oppo, Realme and Samsung phones, set Battery to "No restrictions" for the app so background sync keeps running.

Local development on an emulator: `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000` points at the host machine.
