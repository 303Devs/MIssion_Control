# Mission Control — Architecture Decision Records

_ADR log for significant decisions. Most recent first._

---

## ADR-003: Standing Engineering Policy for Normal Development

| Field | Detail |
|---|---|
| **ID** | ADR-003 |
| **Date** | 2026-05-01 |
| **Status** | Accepted |
| **Decided by** | Anthony |

### Context

After GitHub remote setup and CI activation, Mission Control needs a normal development policy that prevents agent-driven work from drifting into unreviewed, untested direct changes.

### Decision

Mission Control follows Anthony's standing engineering policy:

- Every task gets a Linear issue before implementation begins.
- Behavior changes use TDD-oriented work: failing test first, implementation second, refactor only after green.
- Non-trivial changes require automated tests; bug fixes require regression tests unless impossible or explicitly waived.
- Local tests/build must pass before handoff.
- Turing reviews non-trivial implementation before it is considered done.
- Normal GitHub development uses feature branches and PRs into `main`.
- GitHub Actions CI must pass before GitHub-involved work is considered complete.

### Consequences

- Direct pushes to `main` are not normal workflow and require an explicit exception.
- Docs/config-only changes may be test-exempt, but the exemption must be stated in the handoff.
- A task is not done just because code was written; it is done only when Linear, tests/build, review, and CI evidence are complete.

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
- **Backup:** A private local backup was created before scrub and must not be published or shared

### Outcome

- All 14 commits rewritten; no occurrences of the URL remain in any object
- Tag `v0.1.0-phase0` re-applied after history rewrite
- Build passes post-scrub (`npm run build` exit 0)
- Public documentation updated with safe environment-variable guidance

### Consequences

- Commit hashes changed for all 14 commits (expected and acceptable — no remote exists)
- Canvas iCal feed URL rotation is **not available** — Canvas provides no practical rotation path. Anthony accepted residual risk on 2026-05-01: the feed exposes calendar/assignment timing only (not a password or API key); history was never pushed remotely. This does not block Phase 6.
- **Backup sensitivity:** private local backups from before the rewrite must not be pushed, shared, or published.
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
