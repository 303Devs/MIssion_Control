<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Engineering Policy

Applied 2026-05-01. These rules apply to all agents working in this repo.

## TDD-Oriented Development
- Write or update tests alongside non-trivial implementation.
- Tests are not optional. A task is not done until tests pass.

## Definition of Done
- Tests written/updated and passing locally
- `npm run build` exit 0 locally
- Turing PASS (for all non-trivial implementation)
- PR opened against main (no direct pushes to main except emergency doc-only fixes)
- CI green on GitHub before task is marked complete
- Linear issue updated

## GitHub Workflow
- All work happens on a feature branch.
- Open a PR against `main`. Do not push directly to `main`.
- CI must pass on the PR before merge.
- Branch protection is active: `build` check required, 1 PR reviewer required.

## Linear
- Every non-trivial task has a Linear issue before work starts.
- Include the Linear issue ID in commit messages (e.g. `feat: add X [303-24]`).

## Secrets
- No hardcoded secrets. Use `process.env.*` and `.env.local`.
- `.env.local` is gitignored and must never be committed.
- `.env.example` contains only placeholder values and is safe to commit.
