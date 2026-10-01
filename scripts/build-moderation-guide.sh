#!/usr/bin/env bash
# Erzeugt public/downloads/moderation-anleitung.pdf aus
# docs/moderation-onboarding/anleitung.html mit einem lokal installierten Chrome.
# Die Schriften laedt die HTML-Datei von Google Fonts, deshalb braucht der Lauf Netz.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
source="$root/docs/moderation-onboarding/anleitung.html"
target="$root/public/downloads/moderation-anleitung.pdf"

chrome="${CHROME:-}"
if [ -z "$chrome" ]; then
  for candidate in \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "$(command -v google-chrome 2>/dev/null || true)" \
    "$(command -v chromium 2>/dev/null || true)"; do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then chrome="$candidate"; break; fi
  done
fi

if [ -z "$chrome" ]; then
  echo "Kein Chrome gefunden. Pfad per CHROME=... angeben." >&2
  exit 1
fi

mkdir -p "$(dirname "$target")"
"$chrome" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=10000 \
  --print-to-pdf="$target" "file://$source" 2>/dev/null

echo "Geschrieben: ${target#"$root"/}"
