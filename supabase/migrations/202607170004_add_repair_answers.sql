-- Persist category-specific answers from the public submission form.
alter table public.repairs
add column answers jsonb not null default '{}'::jsonb;