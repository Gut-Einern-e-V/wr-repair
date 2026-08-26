const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isRepairId(value: string) {
  return uuidPattern.test(value);
}

/**
 * Basis-URL fuer geteilte Links. `NEXT_PUBLIC_SITE_URL` hat Vorrang, damit ein
 * Domainwechsel nur einmal konfiguriert werden muss; im Browser bleibt der
 * aktuelle Origin als Rueckfallebene.
 */
export function getSiteUrl(origin?: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base = configured || origin || "";
  return base.replace(/\/+$/, "");
}

export function buildRepairUrl(repairId: string, origin?: string) {
  return `${getSiteUrl(origin)}/reparatur/${repairId}`;
}

export function buildShareText(categoryLabel?: string) {
  return categoryLabel
    ? `Ich habe etwas repariert: ${categoryLabel}. Mach mit beim Reparaturrekord NRW!`
    : "Ich habe etwas repariert. Mach mit beim Reparaturrekord NRW!";
}
