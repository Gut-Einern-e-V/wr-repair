/**
 * Freigabeliste fuer IP-Adressen (Issue #80).
 *
 * Zweck: Eine feste Anzeige - der Rechner am Beamer, das Infodisplay im Foyer,
 * ein Server, der die Zahlen weiterverteilt - soll von der Drosselung der
 * oeffentlichen Leseroute nie getroffen werden. Wer sie hier eintraegt, fragt
 * ohne Grenze ab, auch im Schonmodus.
 *
 * Bewusst nur fuer die *Leseroute*. Die Einreichung bleibt aussen vor: Ihr
 * Limit ist die einzige Bremse gegen ein Skript, das ohne Captcha auf die
 * Route eindrischt, und es ist mit 40 Einreichungen je Minute ohnehin auf ein
 * volles Reparatur-Cafe hinter einer IP-Adresse ausgelegt (siehe
 * lib/submission-gate.ts). Eine freigegebene Adresse waere dort eine offene
 * Tuer, kein Komfort.
 *
 * Zwei Schreibweisen sind erlaubt:
 *
 * - eine einzelne Adresse (`203.0.113.4`, `2001:db8::1`)
 * - ein Praefix in CIDR-Schreibweise (`203.0.113.0/24`, `2001:db8::/32`)
 *
 * Das Praefix ist nicht Bequemlichkeit, sondern der Normalfall: Der Anschluss
 * einer Veranstaltung bekommt vom Provider oft taeglich eine neue Adresse aus
 * demselben Netz, und bei IPv6 wechselt regelmaessig der hintere Teil, waehrend
 * das delegierte Praefix stehen bleibt. Ohne Praefix waere die Liste nach einer
 * Nacht wieder falsch.
 *
 * Der Vergleich laeuft auf Bytes und nicht auf Zeichenketten: `2001:db8::1`
 * und `2001:0db8:0000:0000:0000:0000:0000:0001` sind dieselbe Adresse, und ein
 * Textvergleich wuerde das verneinen.
 */

/** So viele Eintraege nimmt die Liste. Reicht fuer Buehnen und Displays. */
export const MAX_ALLOWLIST_ENTRIES = 32;

/** IPv4-mapped IPv6 (`::ffff:a.b.c.d`) traegt dieses Praefix. */
const V4_MAPPED_PREFIX = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff];

function parseIpv4(value: string): Uint8Array | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;

  const bytes = new Uint8Array(4);
  for (let index = 0; index < 4; index += 1) {
    const part = parts[index];
    // Fuehrende Nullen sind abgelehnt: "010" liest sich je nach Werkzeug als 10
    // oder als 8. In einer Freigabeliste hat eine mehrdeutige Angabe nichts zu
    // suchen.
    if (!/^(0|[1-9]\d{0,2})$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    bytes[index] = octet;
  }
  return bytes;
}

function parseIpv6(value: string): Uint8Array | null {
  // Ein Zonenindex (`fe80::1%eth0`) gehoert zum Geraet, nicht zur Adresse.
  const address = value.split("%")[0];
  const halves = address.split("::");
  if (halves.length > 2) return null;

  const readGroups = (text: string): number[] | null => {
    if (!text) return [];
    const groups: number[] = [];
    const parts = text.split(":");

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      // Eine eingebettete IPv4-Adresse darf nur am Ende stehen und zaehlt zwei
      // Gruppen (`::ffff:203.0.113.4`).
      if (part.includes(".")) {
        if (index !== parts.length - 1) return null;
        const embedded = parseIpv4(part);
        if (!embedded) return null;
        groups.push((embedded[0] << 8) | embedded[1], (embedded[2] << 8) | embedded[3]);
        continue;
      }
      if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return null;
      groups.push(Number.parseInt(part, 16));
    }
    return groups;
  };

  const head = readGroups(halves[0]);
  const tail = halves.length === 2 ? readGroups(halves[1]) : [];
  if (!head || !tail) return null;

  if (halves.length === 1) {
    // Ohne "::" muessen alle acht Gruppen ausgeschrieben sein.
    if (head.length !== 8) return null;
  } else if (head.length + tail.length > 7) {
    // Mit "::" muss mindestens eine Gruppe zusammengefasst sein - sonst haette
    // die Adresse ohne "::" geschrieben werden muessen.
    return null;
  }

  const groups = [...head, ...Array(8 - head.length - tail.length).fill(0), ...tail];
  const bytes = new Uint8Array(16);
  groups.forEach((group, index) => {
    bytes[index * 2] = group >> 8;
    bytes[index * 2 + 1] = group & 0xff;
  });
  return bytes;
}

/**
 * Zerlegt eine Adresse in ihre Bytes: vier fuer IPv4, sechzehn fuer IPv6.
 * `null`, wenn der Text keine Adresse ist - etwa das `"unknown"`, das ohne
 * Weiterleitungs-Header entsteht.
 *
 * Eine IPv4-mapped IPv6 wird auf ihre vier Bytes gekuerzt: Vercel liefert je
 * nach Netz dieselbe Verbindung als `203.0.113.4` oder `::ffff:203.0.113.4`,
 * und eine Freigabe soll in beiden Faellen greifen.
 */
export function parseIp(value: string): Uint8Array | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes(":")) {
    const bytes = parseIpv6(trimmed);
    if (!bytes) return null;
    return V4_MAPPED_PREFIX.every((byte, index) => bytes[index] === byte)
      ? bytes.slice(12)
      : bytes;
  }

  return parseIpv4(trimmed);
}

/** Zerlegt eine Regel in Adresse und Praefixlaenge. */
function parseRule(rule: string): { bytes: Uint8Array; bits: number } | null {
  const trimmed = rule.trim();
  if (!trimmed) return null;

  const slash = trimmed.lastIndexOf("/");
  if (slash === -1) {
    const bytes = parseIp(trimmed);
    return bytes ? { bytes, bits: bytes.length * 8 } : null;
  }

  const bytes = parseIp(trimmed.slice(0, slash));
  if (!bytes) return null;

  const suffix = trimmed.slice(slash + 1);
  if (!/^(0|[1-9]\d{0,2})$/.test(suffix)) return null;

  const bits = Number(suffix);
  return bits <= bytes.length * 8 ? { bytes, bits } : null;
}

/** Ist die Schreibweise als Freigabe brauchbar? Fuer die Pruefung im Backend. */
export function isValidIpRule(rule: string): boolean {
  return parseRule(rule) !== null;
}

/**
 * Passt die Adresse auf die Regel?
 *
 * Verglichen werden die ersten `bits` Bits. Eine Regel und eine Adresse aus
 * verschiedenen Familien passen nie zueinander - ein IPv4-Praefix gibt keine
 * IPv6-Verbindung frei, auch wenn sie vom selben Anschluss kommt.
 */
export function ipMatchesRule(address: string, rule: string): boolean {
  const parsed = parseRule(rule);
  const bytes = parseIp(address);
  if (!parsed || !bytes || bytes.length !== parsed.bytes.length) return false;

  const wholeBytes = Math.floor(parsed.bits / 8);
  for (let index = 0; index < wholeBytes; index += 1) {
    if (bytes[index] !== parsed.bytes[index]) return false;
  }

  const remainingBits = parsed.bits % 8;
  if (remainingBits === 0) return true;

  const mask = 0xff << (8 - remainingBits);
  return (bytes[wholeBytes] & mask) === (parsed.bytes[wholeBytes] & mask);
}

/** Steht die Adresse auf der Freigabeliste? */
export function isAllowlisted(address: string | null, rules: readonly string[]): boolean {
  if (!address || rules.length === 0) return false;
  return rules.some((rule) => ipMatchesRule(address, rule));
}

/**
 * Liest die Freigabeliste defensiv - aus der Datenbank wie aus einem
 * Anfragekoerper.
 *
 * Unbrauchbare Eintraege fliegen raus statt die Pruefung zu sprengen: Eine
 * Liste mit einem Tippfehler darf nicht dazu fuehren, dass die Drosselung fuer
 * alle ausfaellt oder die Route mit einem Serverfehler antwortet. Doppelte
 * Eintraege werden zusammengefasst, damit die Anzeige im Backend nicht
 * denselben Eintrag zweimal zeigt.
 */
export function normalizeIpRules(value: unknown, max = MAX_ALLOWLIST_ENTRIES): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const rule = entry.trim();
    if (!rule || !isValidIpRule(rule)) continue;
    seen.add(rule);
    if (seen.size >= max) break;
  }
  return [...seen];
}
