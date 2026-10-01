# Onboarding für neue Moderator*innen

Drei Teile, alle aus der Verwaltung erreichbar (`/admin` → **Team**):

| Teil | Quelle | Ausgeliefert als |
| --- | --- | --- |
| Anleitung (3 Seiten A4) | `docs/moderation-onboarding/anleitung.html` | `public/downloads/moderation-anleitung.pdf` |
| Willkommensmail | `lib/moderation-onboarding.ts` | Knöpfe „Willkommensmail öffnen“ / „Mailtext kopieren“ nach dem Anlegen eines Kontos |
| Passwort ändern / zurücksetzen | `lib/password-policy.ts` | Seite `/moderator/passwort`, Knopf „Passwort zurücksetzen“ im Team-Tab |

Die Mail verschickt nicht der Server: Sie öffnet sich im Mailprogramm der Person,
die das Konto angelegt hat. Das Passwort steht nicht darin, es wird persönlich
weitergegeben.

## PDF neu erzeugen

Nach jeder Änderung an `anleitung.html` (braucht einen lokalen Chrome und Netz für
die Schriften):

    scripts/build-moderation-guide.sh

Ändert sich die Oberfläche der Moderation — Beschriftung des Push-Schalters,
Knöpfe der Schnellprüfung, Login — müssen Anleitung und Mailtext mitziehen.
