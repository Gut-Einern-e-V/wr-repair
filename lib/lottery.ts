/**
 * Wer bei der Verlosung gezogen werden darf - und wer gezogen wird (Issue #45).
 *
 * Die Regeln stehen hier und nicht in der Route, weil sie die einzige Stelle
 * des Projekts sind, an der eine Zufallsentscheidung rechtlich zaehlt. Sie
 * muessen einzeln pruefbar sein, ohne dass eine Datenbank laeuft.
 *
 * Die Regeln, wie sie in den Teilnahmebedingungen stehen:
 *
 * - Gezogen wird nur unter Anmeldungen zu freigegebenen Reparaturen. Was die
 *   Moderation nicht geprueft hat, nimmt nicht teil.
 * - Jede eingereichte Reparatur ist ein Los. Wer mehrfach einreicht, hat
 *   damit eine hoehere Chance.
 * - Gewinnen kann jede Person nur einmal. Nach einem Gewinn scheiden alle
 *   ihre weiteren Lose aus - sonst raeumt bei kleinen Teilnehmerzahlen eine
 *   einzige fleissige Person alles ab.
 * - Das Projektteam und die Durchfuehrenden sind ausgeschlossen. Das steht in
 *   der Ausschlussliste und wird nicht bei jeder Ziehung von Hand geprueft.
 *
 * "Dieselbe Person" heisst hier: dieselbe E-Mail-Adresse. Der Name taugt
 * nicht - er ist ein Freitextfeld -, und mehr Daten erhebt das Formular
 * bewusst nicht.
 */

export type LotteryEntry = {
  id: string;
  repairId: string;
  name: string;
  email: string;
  /** Hat mit diesem Los schon gewonnen. */
  winner: boolean;
  /** Von der Ziehung ausgenommen, etwa nach einer zurueckgenommenen Ziehung. */
  excluded: boolean;
  /** Die zugehoerige Reparatur ist von der Moderation freigegeben. */
  approved: boolean;
};

/** Schreibweise vereinheitlichen, damit "Anna@Example.org " und "anna@example.org" dieselbe Person sind. */
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Passt eine Adresse auf einen Eintrag der Ausschlussliste?
 *
 * Zwei Schreibweisen, beide bewusst simpel gehalten: eine ganze Adresse, oder
 * eine mit `@` beginnende Domain fuer ein ganzes Haus. Keine Platzhalter -
 * eine Regel, die niemand mehr liest, schliesst am Ende die Falschen aus.
 */
export function matchesExclusion(email: string, pattern: string) {
  const address = normalizeEmail(email);
  const rule = normalizeEmail(pattern);
  if (!rule) return false;
  return rule.startsWith("@") ? address.endsWith(rule) : address === rule;
}

export function isExcludedAddress(email: string, patterns: string[]) {
  return patterns.some((pattern) => matchesExclusion(email, pattern));
}

/**
 * Alle Lose, die gezogen werden duerfen.
 *
 * Die Adressen der bisherigen Gewinner*innen kommen aus derselben Liste: Ein
 * Los mit `winner` schliesst nicht nur sich selbst aus, sondern jedes weitere
 * Los derselben Person.
 */
export function eligibleEntries(entries: LotteryEntry[], exclusions: string[] = []) {
  const wonAlready = new Set(
    entries.filter((entry) => entry.winner).map((entry) => normalizeEmail(entry.email)),
  );

  return entries.filter((entry) =>
    entry.approved
    && !entry.winner
    && !entry.excluded
    && !wonAlready.has(normalizeEmail(entry.email))
    && !isExcludedAddress(entry.email, exclusions));
}

/**
 * Ein Los ziehen. `random` liefert eine Zahl in [0, 1) - austauschbar, damit
 * ein Test die Ziehung nachrechnen kann statt sie zu glauben.
 */
export function pickEntry(entries: LotteryEntry[], random: () => number = Math.random) {
  if (entries.length === 0) return null;
  const index = Math.floor(random() * entries.length);
  // Ein `random()`, das 1 liefert oder minimal darueber liegt, wuerde sonst
  // hinter das Ende greifen und `undefined` als Gewinn ausgeben.
  return entries[Math.min(Math.max(index, 0), entries.length - 1)];
}

/**
 * Mehrere Lose auf einmal ziehen - fuer einen Preis, den es mehrfach gibt.
 *
 * Nach jedem Zug faellt die ganze Person aus dem Topf, nicht nur ihr Los:
 * Sonst gewaenne jemand mit zehn Einreichungen denselben Preis zweimal.
 */
export function pickEntries(entries: LotteryEntry[], count: number, random: () => number = Math.random) {
  const picked: LotteryEntry[] = [];
  let pool = entries;

  for (let round = 0; round < count && pool.length > 0; round += 1) {
    const winner = pickEntry(pool, random);
    if (!winner) break;
    picked.push(winner);
    const address = normalizeEmail(winner.email);
    pool = pool.filter((entry) => normalizeEmail(entry.email) !== address);
  }

  return picked;
}

/** Wie viele Exemplare eines Preises noch offen sind. */
export function openSlots(quantity: number, drawn: number) {
  return Math.max(quantity - drawn, 0);
}
