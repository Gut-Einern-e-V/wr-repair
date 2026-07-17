<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Supabase

- The repository is linked to Supabase project `qzkvxgxxsojidzshixni`.
- The Supabase CLI is not installed globally. Run every Supabase command through `npx supabase@latest ...`, for example `npx supabase@latest db push`.
- Versioned schema changes belong in `supabase/migrations/`. Verify local and remote migration history with `npx supabase@latest migration list` after a push.
