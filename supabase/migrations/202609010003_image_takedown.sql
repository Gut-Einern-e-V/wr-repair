-- Bild loeschen, Reparatur behalten (Issue #49).
--
-- `image_deleted_at` kam mit Migration 202609010001 und meinte dort genau
-- einen Fall: Das Bild wurde mit der Ablehnung entfernt. Seit Issue #49 gibt
-- es einen zweiten, der datenschutzrechtlich der wichtigere ist - jemand ist
-- auf dem Foto zu erkennen und moechte es nicht mehr veroeffentlicht sehen.
-- Dann nimmt die Moderation das Bild aus dem Speicher, und die Reparatur
-- zaehlt trotzdem weiter fuer den Rekord.
--
-- Die Spalte selbst reicht fuer beides; nur ihre Bedeutung war zu eng
-- beschrieben. Ein Grund je Loeschung wird bewusst nicht gespeichert: Er
-- waere selbst eine Angabe ueber die Person, die sich gemeldet hat, und die
-- Moderation braucht ihn nicht, um zu wissen, dass das Bild weg bleibt.
comment on column public.repairs.image_deleted_at is
  'Zeitpunkt, zu dem das Bild geloescht wurde - durch eine Ablehnung oder auf Wunsch. Null heisst: Es gab nie eines, oder es liegt noch da.';
