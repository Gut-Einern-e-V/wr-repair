/**
 * Ein Feld fuer die CSV-Exporte der Verwaltung, in Anfuehrungszeichen.
 *
 * Die Inhalte stammen aus dem oeffentlichen Formular - Name, Geschichte,
 * Marke - und werden in einer Tabellenkalkulation geoeffnet. Beginnt ein Feld
 * mit einem Rechenzeichen, macht Excel oder LibreOffice daraus eine Formel,
 * die beim Oeffnen laeuft. Ein vorangestelltes Hochkomma haelt es als Text.
 * Tabulator und Wagenruecklauf zaehlen dazu, weil manche Programme sie am
 * Feldanfang verwerfen und das Zeichen dahinter dann wieder vorne steht
 * (OWASP, "CSV Injection").
 */
export function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll("\"", "\"\"")}"`;
}
