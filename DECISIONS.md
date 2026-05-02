# Mission Control — Architecture Decision Records

_ADR log for significant decisions. Most recent first._

---

## ADR-002: Git History Scrub Before Remote Push (303-22)

| Field | Detail |
|---|---|
| **ID** | ADR-002 / Linear 303-22 |
| **Date** | 2026-05-01 |
| **Status** | Accepted |
| **Decided by** | Anthony (explicit approval) |
| **Executed by** | Nora / Bob subagent |

### Context

Before pushing the Mission Control repo to any GitHub remote, a Canvas iCal feed URL (containing a personal calendar token) was discovered hardcoded in 3 early commits. The URL needed to be removed from all git history to prevent token exposure on a public or private remote.

### Decision

Scrub the Canvas iCal URL from all git history using `git-filter-repo` before any remote is created or any push occurs.

- **Tool:** `git-filter-repo` (preferred over `git filter-branch` — faster, safer, no temp refs)
- **Replacement:** Full URL → literal string `CANVAS_ICAL_URL_REMOVED`
- **Scope:** Local repo only (`/Users/anthony/Projects/mission-control`)
- **Backup:** Full `cp -R` backup created at `mission-control-backup-pre-filter-20260501` before scrub

### Outcome

- All 14 commits rewritten; no occurrences of the URL remain in any object
- Tag `v0.1.0-phase0` re-applied to new hash `3c82290` (previously `30dd18c`)
- Build passes post-scrub (`npm run build` exit 0)
- `SECURITY_CHECKLIST.md` created with rotation recommendation

### Consequences

- Commit hashes changed for all 14 commits (expected and acceptable — no remote exists)
- Canvas iCal feed URL rotation is **not available** — Canvas provides no practical rotation path. Anthony accepted residual risk on 2026-05-01: the feed exposes calendar/assignment timing only (not a password or API key); history was never pushed remotely. This does not block Phase 6.
- **Backup sensitivity:** `mission-control-backup-pre-filter-20260501` preserves original unmodified history and must not be pushed or shared.
- **Next required actions (Anthony approval needed):**
  - GitHub remote creation (`gh repo create` or `git remote add`)
  - First push to GitHub
  - Branch protection rule configuration
  - Any CI/CD activation

---

## ADR-001: Local-First, No Remote Until Phase 6

| Field | Detail |
|---|---|
| **ID** | ADR-001 |
| **Date** | 2026-04 |
| **Status** | Accepted |

### Context

Mission Control is a personal dashboard for Anthony's agent workforce. During initial development phases (0–5), keeping the repo local-only was sufficient and avoided the overhead of remote setup.

### Decision

Defer GitHub remote creation, branch protection, and CI activation until Phase 6. All prior phase work committed locally only.

### Outcome

All phases 0–5 completed and committed locally. CI workflow (`.github/workflows/ci.yml`) exists and is committed but has not triggered — it will activate on first push to GitHub with Anthony's approval.
