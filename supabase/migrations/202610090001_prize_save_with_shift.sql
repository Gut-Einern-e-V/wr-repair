-- Gewinnspiel: Preise einfuegen, ohne Plaetze von Hand freizuraeumen (Issue #152).
--
-- Seit Issue #119 gehoert jeder Platz hoechstens einem Preis. Wer nachtraeglich
-- einen Hauptpreis auf Platz 1 setzen wollte, musste vorher jeden anderen Preis
-- einzeln nach hinten schieben - die Route lehnte die Ueberschneidung ab.
--
-- `save_prize` schiebt stattdessen alle Preise ab dem gewuenschten Platz um so
-- viel nach hinten, wie der neue Bereich braucht, und schreibt den Preis in
-- derselben Transaktion. Schlaegt das Speichern fehl, bleibt auch die
-- Verschiebung aus.

create or replace function public.save_prize(
  p_id uuid,
  p_values jsonb,
  p_place_from integer,
  p_place_to integer
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_first integer;
  v_delta integer := 0;
  v_row record;
  v_rec public.lottery_prizes;
begin
  if p_place_from < 1 or p_place_to < p_place_from then
    raise exception 'Ungueltiger Platzbereich' using errcode = '22023';
  end if;

  -- Gleichzeitige Speichervorgaenge nacheinander abarbeiten, sonst rechnen
  -- zwei Verschiebungen mit demselben Stand.
  lock table public.lottery_prizes in share row exclusive mode;

  -- Ein bestehender Preis raeumt seinen alten Platz zuerst, sonst koennte ein
  -- verschobener Nachbar darauf landen. Sein Platz wird unten ohnehin gesetzt.
  update public.lottery_prizes
  set place_from = place_from + 100000, place_to = place_to + 100000
  where id = p_id;

  -- Was ab dem neuen Platz liegt (oder in ihn hineinragt), rueckt nach hinten.
  select min(place_from) into v_first
  from public.lottery_prizes
  where id <> p_id and place_to >= p_place_from;

  if v_first is not null and v_first <= p_place_to then
    v_delta := p_place_to - v_first + 1;
  end if;

  if v_delta > 0 then
    if exists (
      select 1 from public.lottery_prizes
      where id <> p_id and place_to >= p_place_from and place_to + v_delta > 50
    ) then
      raise exception 'Platzgrenze ueberschritten' using errcode = '22003';
    end if;

    -- Von hinten nach vorn, damit eine Zeile nie auf den noch alten Platz der
    -- naechsten rutscht (die Ausschlussbedingung prueft je Zeile).
    for v_row in
      select id from public.lottery_prizes
      where id <> p_id and place_to >= p_place_from
      order by place_from desc
    loop
      update public.lottery_prizes
      set place_from = place_from + v_delta,
          place_to = place_to + v_delta
      where id = v_row.id;
    end loop;
  end if;

  v_rec := jsonb_populate_record(null::public.lottery_prizes, p_values);

  if exists (select 1 from public.lottery_prizes where id = p_id) then
    update public.lottery_prizes
    set title = v_rec.title,
        description = v_rec.description,
        sponsor_name = v_rec.sponsor_name,
        sponsor_kind = v_rec.sponsor_kind,
        sponsor_website = v_rec.sponsor_website,
        is_main = v_rec.is_main,
        quantity = p_place_to - p_place_from + 1,
        place_from = p_place_from,
        place_to = p_place_to,
        logo_path = case when p_values ? 'logo_path' then v_rec.logo_path else logo_path end,
        image_path = case when p_values ? 'image_path' then v_rec.image_path else image_path end
    where id = p_id;
  else
    insert into public.lottery_prizes (
      id, title, description, sponsor_name, sponsor_kind, sponsor_website,
      is_main, quantity, place_from, place_to, logo_path, image_path
    ) values (
      p_id, v_rec.title, v_rec.description, v_rec.sponsor_name, v_rec.sponsor_kind,
      v_rec.sponsor_website, v_rec.is_main, p_place_to - p_place_from + 1,
      p_place_from, p_place_to, v_rec.logo_path, v_rec.image_path
    );
  end if;
end;
$$;

comment on function public.save_prize(uuid, jsonb, integer, integer) is
  'Legt einen Preis an oder aendert ihn und schiebt dabei die Preise ab dem gewuenschten Platz nach hinten. Nur fuer die Backend-Route (service_role).';

-- Die Funktion schreibt ohne Rollenpruefung - sie ist nichts fuer /rest/v1/rpc.
revoke execute on function public.save_prize(uuid, jsonb, integer, integer) from public, anon, authenticated;
grant execute on function public.save_prize(uuid, jsonb, integer, integer) to service_role;
