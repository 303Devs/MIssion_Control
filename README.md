# Mission Control

Anthony's private dashboard — agents, tasks, calendar, weather, and project status in one place.

Built with [Next.js](https://nextjs.org) 16, React 19, Tailwind CSS 4.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and set the variables you need:

| Variable | Required | Description |
|---|---|---|
| `CANVAS_ICAL_URL` | For calendar | Canvas iCal feed URL |
| `WEATHER_LAT` / `WEATHER_LON` | For weather | Location coordinates |
| `MISSION_CONTROL_AGENTS_ROOT` | For agents panel | Path to agent workspace root |
| `MISSION_CONTROL_OPENCLAW_ROOT` | For OpenClaw data | Path to OpenClaw workspace |
| `MISSION_CONTROL_HERMES_ROOT` | For Hermes data | Path to Hermes workspace |
| `MISSION_CONTROL_VAULT_ROOT` | For vault data | Path to Agent Memory Vault |
| `OPENCLAW_GATEWAY_URL` | For Gateway API | OpenClaw Gateway base URL |
| `OPENCLAW_GATEWAY_TOKEN` | For Gateway auth | Bearer token for Gateway |
| `MISSION_CONTROL_SECRET` | For remote access | API bearer token (localhost-only if unset) |

### 3. Run dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

### 4. Production-equivalent local build

```bash
npm run build && npm start
```

See [RUNBOOK.md](./RUNBOOK.md) for full local staging instructions, auth setup, and what requires Anthony approval before any deploy step.

---

## Scripts

```bash
npm run dev      # Development server (hot reload)
npm run build    # Production build (TypeScript + Next.js)
npm start        # Start production server (requires build)
npm run lint     # ESLint
```

---

## Project Structure

```
app/          Next.js App Router pages and API routes
components/   React UI components
lib/          Shared utilities and data loaders
data/         Static data files
public/       Static assets
```

---

## Engineering Policy

Mission Control follows Anthony's standing engineering policy:

- Linear issue per task before implementation.
- TDD-oriented work for behavior changes.
- Automated tests for non-trivial changes and regression tests for bug fixes.
- Local tests/build must pass before work is considered complete.
- Turing review is required for non-trivial implementation.
- GitHub Actions CI must pass when GitHub is involved.

See [AGENTS.md](./AGENTS.md) for the full agent-facing policy.

---

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs lint + build on push/PR to `main`.
Branch protection on `main` requires PR review and the `build` status check before normal development merges.

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [RUNBOOK.md](./RUNBOOK.md) — local staging, env vars, and auth

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
