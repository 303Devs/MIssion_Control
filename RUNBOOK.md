# Mission Control — Local Staging Runbook

Nora / Phase 6 · 2026-05-01

---

## Prerequisites

- Node.js 20+
- npm 10+
- `.env.local` configured (see [Environment Variables](#environment-variables))

---

## Running Dev Server

```bash
npm run dev
```

Opens at <http://localhost:3000>. Hot-reloads on file save.

---

## Running Production-Equivalent (Local Staging)

```bash
npm run build && npm start
```

- `npm run build` — TypeScript compile + Next.js production build (outputs to `.next/`)
- `npm start` — Starts the Next.js production server on port 3000

To use a different port:

```bash
PORT=3001 npm start
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

### Required for full functionality

| Variable | Description |
|---|---|
| `CANVAS_ICAL_URL` | Canvas calendar iCal feed URL |
| `WEATHER_LAT` | Latitude for weather API |
| `WEATHER_LON` | Longitude for weather API |
| `MISSION_CONTROL_AGENTS_ROOT` | Path to agent workspace root |
| `MISSION_CONTROL_OPENCLAW_ROOT` | Path to OpenClaw workspace |
| `MISSION_CONTROL_HERMES_ROOT` | Path to Hermes workspace |
| `MISSION_CONTROL_VAULT_ROOT` | Path to Agent Memory Vault |

### Phase 5 additions

| Variable | Description |
|---|---|
| `OPENCLAW_GATEWAY_URL` | OpenClaw Gateway base URL (e.g. `http://localhost:4000`) |
| `OPENCLAW_GATEWAY_TOKEN` | Bearer token for Gateway API auth |

### Auth / security

| Variable | Description |
|---|---|
| `MISSION_CONTROL_SECRET` | Bearer token for API auth. If set, all `/api/*` routes require `Authorization: Bearer <secret>`. If unset, API is restricted to localhost only. |

### Running with MISSION_CONTROL_SECRET

```bash
MISSION_CONTROL_SECRET=mysecret npm run dev
```

Or add to `.env.local`:

```
MISSION_CONTROL_SECRET=mysecret
```

Then all API requests must include the header:

```
Authorization: Bearer mysecret
```

---

## Lint + Type Check

```bash
npm run lint      # ESLint
npm run build     # Includes TypeScript compile (tsc)
```

---

## What Requires Anthony Approval Before Any Next Step

The following actions are **NOT authorized** without explicit Anthony approval:

- Creating or configuring a GitHub remote (`git remote add`, `gh repo create`)
- Pushing any branch to GitHub (`git push`)
- Configuring branch protection rules
- Any CI/CD pipeline activation or GitHub Actions trigger
- Deployment to any staging or production environment (Vercel, Railway, etc.)
- Any `sudo` or elevated commands

**Current state:** CI config exists locally (`.github/workflows/ci.yml`) and is committed, but will not run until the repo is pushed to GitHub with Anthony's approval.

---

## Troubleshooting

**Build fails with missing env vars:**
Check that `.env.local` exists and has the required variables. The build does not fail on missing optional vars, but API routes will return errors at runtime.

**Port already in use:**
```bash
PORT=3001 npm start
```

**Fresh dependency install:**
```bash
rm -rf node_modules .next
npm install
npm run build
```
