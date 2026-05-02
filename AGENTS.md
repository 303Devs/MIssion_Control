<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mission Control Engineering Policy

Applied 2026-05-01. These rules apply to all agents working in this repo.

## Work intake

- Every task gets a Linear issue before implementation begins.
- Each branch, PR, commit, and handoff should reference the Linear issue identifier when practical.
- Do not bundle unrelated work into one issue/branch.

## TDD-oriented development

- Use TDD-oriented work for behavior changes: write or update the failing test first, verify RED, implement, verify GREEN, then refactor.
- Non-trivial changes require automated tests.
- Bug fixes require regression tests unless impossible or explicitly waived.
- If a change is genuinely test-exempt, say why in the Linear issue and PR/handoff.

## Definition of done

Implementation is not complete until all applicable gates pass:

- Tests written/updated and passing locally.
- `npm run build` exits 0 locally.
- Turing PASS for non-trivial implementation work.
- GitHub Actions CI passes when GitHub is involved.
- Linear issue is updated with evidence and final status.

## GitHub workflow

- Normal development happens on a feature branch with a PR into `main`.
- Do not push directly to `main` except explicit emergency/administrative exceptions approved by Anthony.
- Branch protection is active: `build` status check required, branch must be up to date, and 1 PR review required.
- CI must pass on the PR before merge.

## Review gates

- Turing reviews implementation work before it is considered done.
- Alice may perform acceptance/gate review when requested or when project policy requires it.
- Code is not complete just because it works locally; it is complete only after review evidence and required checks pass.

## Secrets

- No hardcoded secrets. Use `process.env.*` and `.env.local`.
- `.env.local` is gitignored and must never be committed.
- `.env.example` contains only placeholder values and is safe to commit.

## External action boundary

No deploy, release, public announcement, or external service expansion without Anthony's explicit approval.
