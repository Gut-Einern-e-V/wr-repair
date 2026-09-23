<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Supabase

- The repository is linked to Supabase project `qzkvxgxxsojidzshixni`.
- The Supabase CLI is not installed globally. Run every Supabase command through `npx supabase@latest ...`, for example `npx supabase@latest db push`.
- Versioned schema changes belong in `supabase/migrations/`. Verify local and remote migration history with `npx supabase@latest migration list` after a push.
- The role checks `is_moderator_or_higher()`, `is_admin_or_higher()` and `is_superadmin()` live in the `private` schema since migration `202609170001`, so PostgREST cannot expose them as RPC endpoints. New RLS policies must call them as `private.is_...()`.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `Gut-Einern-e-V/wr-repair`, driven via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root, both created lazily. See `docs/agents/domain.md`.
