-- Highlight-Geschichten aus den Einreichungen.
--
-- Unter den freigegebenen Reparaturen stehen Geschichten, die eine Buehne oder
-- die Seite /stories verdienen. Die Moderation legt sie hier in den
-- Highlight-Eimer, glaettet den Text und gibt sie in zwei Stufen frei:
--
--   candidate  vorgemerkt, Text noch nicht geprueft
--   ready      Text geglaettet und gelesen - erscheint in der Buehnenansicht
--   published  zusaetzlich oeffentlich unter /stories
--
-- Der Originaltext bleibt unangetastet in `repairs.story`. Was hier steht, ist
-- die redigierte Fassung; sie laesst sich jederzeit gegen das Original lesen
-- und verwerfen.
--
-- Ein Highlight je Reparatur, deshalb ist `repair_id` der Schluessel. Wird die
-- Reparatur geloescht, verschwindet ihr Highlight mit.

create table public.story_highlights (
  repair_id uuid primary key references public.repairs(id) on delete cascade,
  status text not null default 'candidate' check (status in ('candidate', 'ready', 'published')),
  title text not null default '' check (char_length(title) <= 120),
  -- Zwei, drei Saetze fuer Buehne und Kachel.
  teaser text not null default '' check (char_length(teaser) <= 400),
  -- Die geglaettete Geschichte, Absaetze durch Leerzeilen getrennt.
  body text not null default '' check (char_length(body) <= 6000),
  -- Interne Notiz, z. B. "Name der Tochter rausgenommen". Wird nie gezeigt.
  note text not null default '' check (char_length(note) <= 1000),
  -- Kleinere Zahl steht weiter vorn - auf der Buehne und auf /stories.
  sort_order integer not null default 100,
  -- Oeffentliche Kopie des Fotos im Bucket `story-images`, erst bei der
  -- Veroeffentlichung angelegt. Das Original bleibt privat in `repair-images`.
  public_image_path text,
  public_image_width integer,
  public_image_height integer,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.story_highlights is
  'Highlight-Geschichten aus repairs: redigierter Text, Reihenfolge und Freigabestufe (candidate, ready, published).';

create index story_highlights_status_idx on public.story_highlights (status, sort_order);

-- Wie alle Verwaltungstabellen nur ueber den Service-Role-Key erreichbar
-- (siehe 202609290002_close_public_table_access.sql).
alter table public.story_highlights enable row level security;

create policy "Moderators read story highlights"
on public.story_highlights for select
to authenticated
using ((select private.is_moderator_or_higher()));

revoke all on public.story_highlights from anon, authenticated;

-- Oeffentliche Fotos veroeffentlichter Highlights. Geschrieben wird nur ueber
-- den Service-Role-Key aus der Moderations-API; lesen darf jede*r.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-images',
  'story-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
