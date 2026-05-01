# Mission Control — Security Checklist

_Maintained by Nora / Bob. Last updated: 2026-05-01_

---

## Incident Log

### 303-22 — Canvas iCal URL Exposure (Resolved)

| Field | Detail |
|---|---|
| **Issue** | Canvas iCal feed URL was hardcoded in source code across 3 early commits |
| **Affected commits** | 6671148, 0958b40, 30dd18c (pre-scrub hashes) |
| **Discovery date** | 2026-05-01 |
| **Remediation date** | 2026-05-01 |
| **Tool** | git-filter-repo |
| **Replacement string** | `CANVAS_ICAL_URL_REMOVED` |
| **Status** | ✅ Resolved |

**What happened:** The Canvas iCal feed URL (containing a personal calendar token) was hardcoded directly in `app/api/canvas/route.ts` in the initial commits before `.env.local` was adopted. Three commits contained the live URL.

**What was done:**
- Full repo backup created: `mission-control-backup-pre-filter-20260501`
- `git-filter-repo --replace-text` run with `--force` against all 14 commits
- All occurrences of the URL replaced with `CANVAS_ICAL_URL_REMOVED` in full history
- Tag `v0.1.0-phase0` re-applied to new hash `3c82290`
- Build verified passing post-scrub

**Current HEAD state:** `app/api/canvas/route.ts` uses `process.env.CANVAS_ICAL_URL` — no hardcoded URL. ✅

**Rotation recommendation:** Rotate the Canvas iCal feed URL in Canvas settings (Settings → Calendar → Calendar Feed) to invalidate the previously exposed token. This is a low-risk but recommended hygiene step since the history was only local and never pushed.

---

## Pre-Push Checklist

Before any `git push` or remote creation on this repo:

- [ ] Verify no secrets in current working tree: `git grep -r "canvas.colorado.edu" .` must return empty
- [ ] Verify no secrets in full history: `git grep "canvas.colorado.edu" $(git rev-list --all)` must return empty
- [ ] Verify no `.env.local` or `.env` tracked by git: `git ls-files | grep -E '\.env'`
- [ ] Confirm `.gitignore` covers `.env.local` and `.env`
- [ ] Confirm `MISSION_CONTROL_SECRET` is not hardcoded anywhere in source
- [ ] Anthony explicit approval obtained for remote creation and push

---

## Ongoing Security Notes

- All sensitive config goes in `.env.local` — never committed
- `.env.example` contains only placeholder values, safe to commit
- API routes protected by `MISSION_CONTROL_SECRET` bearer token when set
- See RUNBOOK.md for environment variable reference
