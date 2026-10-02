# AGENTS.md — AI agent workflow for KWL Nexus

Read in this order before any change: `docs/MASTER-SPEC.md` → `docs/project-state.md` →
`docs/DECISION-LOG.md` → current source → `git status` / `git log --oneline -10`.

## Rules

1. Current code is the source of truth: `CODE > TESTS > GIT HISTORY > DOCS > OLD AI PLANS`.
2. Work phase-by-phase (phases in `docs/project-state.md`). Implement one phase, verify, update state, stop.
3. Never push. Local commits only (`--no-verify` is the repo norm for WIP speed; CI runs the gates).
4. Never: force-push, delete releases/history, expose secrets, `NEXT_PUBLIC_*` secrets, fake verification.
5. Verification per change: `npx tsc --noEmit`, `npm run lint` (exit 0), `npm test`, `npm run build`.
   Report PASS/FAIL/BLOCKED/UNVERIFIED with real output — never "should work".
6. Record architecture changes in `docs/DECISION-LOG.md`. Update `docs/project-state.md` when area status changes.
7. Keep it a single-root Next.js app. No monorepo, no Redis/K8s/microservices without demonstrated need.
8. Additive, idempotent changes: backfill on verify paths, never destructive migration without backup.
