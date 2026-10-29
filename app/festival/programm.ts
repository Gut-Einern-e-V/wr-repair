/**
 * Das Programm des Repair & Share Festivals (Issue #163).
 *
 * Zusammengetragen aus den Uebersichtspostern fuer Utopiastadt und Wiesenwerke
 * und aus dem Programm auf der Festivalseite der FAB Region. Die Texte sind
 * nachformuliert und auf "ihr" gebracht wie der Rest der Website.
 *
 * Gegliedert wie die Poster: Ort, Raum, Anbieter, Angebote. So findet man vor
 * Ort, was im Raum nebenan passiert, und nicht nur eine lange Liste.
 */

export type FestivalVenueName = "Utopiastadt" | "Wiesenwerke" | "Nordbahntrasse";

/**
 * Rallye: kurze Mitmachstation. Workshop: Rallye-Station, die mehr Zeit und
 * Geschick braucht. Beides steht auf dem Rallye-Plan, den es an den
 * Infostaenden gibt.
 */
export type FestivalOfferKind = "rallye" | "workshop";

export type FestivalOffer = { kind: FestivalOfferKind; title: string; text: string };

export type FestivalProvider = {
  name: string;
  /** Wer das ist - nur wo es mehr sagt als der Name. */
  about?: string;
  offers?: readonly FestivalOffer[];
};

export type FestivalRoom = {
  name: string;
  /** Wo der Raum liegt, wenn der Name allein nicht reicht. */
  where?: string;
  intro?: string;
  providers: readonly FestivalProvider[];
};

export type FestivalArea = { venue: FestivalVenueName; intro: string; rooms: readonly FestivalRoom[] };

export type FestivalSlot = {
  /** "HH:MM", damit die Liste sich nach der Zeit sortieren laesst. */
  start: string;
  end: string;
  title: string;
  by?: string;
  venue: FestivalVenueName;
  room: string;
  text: string;
};

/** Das Rahmenprogramm mit festen Zeiten, nach Beginn sortiert. */
export const festivalSchedule: readonly FestivalSlot[] = [
  { start: "11:00", end: "11:15", title: "Eröffnung des Festivals", by: "David Becher und Nils Kreft", venue: "Utopiastadt", room: "Wartesaal 1", text: "Moderator David Becher begrüßt euch und stellt mit Nils Kreft die Highlights des Tages vor." },
  { start: "11:00", end: "11:15", title: "Eröffnung des Festivals (Live-Stream)", by: "David Becher und Nils Kreft", venue: "Wiesenwerke", room: "TalTonTheater", text: "Die Eröffnung aus der Utopiastadt, live übertragen ins TalTonTheater." },
  { start: "11:15", end: "11:55", title: "Theaterstück „Zirkus Stinknich“", by: "Patrick Strohm alias Herr Stinknich", venue: "Wiesenwerke", room: "TalTonTheater", text: "Humorvolles für Groß und Klein ab 4 Jahren: wie aus vermeintlichem Müll Neues entsteht und warum Reparieren Spaß macht." },
  { start: "11:15", end: "12:15", title: "Utopiastadt entdecken – Führung über das Gelände", by: "Amanda Steinborn, Utopiastadt", venue: "Nordbahntrasse", room: "Treffpunkt vor Utopiastadt", text: "Ein Rundgang über das Gelände, auf dem Menschen gemeinsam Stadt gestalten – und das an diesem Tag Festivalort ist." },
  { start: "12:00", end: "13:00", title: "Gib alten Geräten Superkräfte – mit deiner Stimme & KI", by: "Seeed Studio", venue: "Wiesenwerke", room: "Workshopraum", text: "Ohne Programmierkenntnisse einem alten elektronischen Gerät mit KI neue Funktionen geben." },
  { start: "12:00", end: "13:15", title: "ZukunftsTalk: Kaputt – und jetzt? Wie Reparieren uns unabhängiger macht", by: "u. a. Dominik Stingl (Gut Einern) und Prof. Dr. Christa Liedtke (Wuppertal Institut)", venue: "Wiesenwerke", room: "TalTonTheater", text: "Moderiert von David Becher – und wie gewohnt herausgefordert von launigen KI-Einwürfen." },
  { start: "12:30", end: "12:45", title: "Versteigerung von Brautmode", by: "Brautpoesie", venue: "Utopiastadt", room: "Wartesaal 1", text: "Die Kleider der stillen Versteigerung werden vorgestellt. Danach habt ihr eine Stunde Zeit, am Stand von Brautpoesie mitzubieten; der Erlös geht an einen guten Zweck." },
  { start: "13:00", end: "13:40", title: "Theaterstück „Zirkus Stinknich“", by: "Patrick Strohm alias Herr Stinknich", venue: "Utopiastadt", room: "Wartesaal 1", text: "Noch einmal das Theaterstück für Groß und Klein ab 4 Jahren, diesmal in der Utopiastadt." },
  { start: "13:00", end: "13:30", title: "Führung durch das „Circular Office“", by: "Neue Effizienz", venue: "Wiesenwerke", room: "Bauwagen auf dem Parkplatz", text: "Wie sieht ein Büro nach den Prinzipien von New Work und Kreislaufwirtschaft aus – und was geht schon erstaunlich gut?" },
  { start: "13:00", end: "14:00", title: "Die klingende Ballerina – Reparieren, Hacken & Musik machen", by: "Seeed Studio", venue: "Wiesenwerke", room: "Workshopraum", text: "Eine Audio-Ballerina wieder zum Klingen und Tanzen bringen und dabei mit Musik und Technik experimentieren." },
  { start: "13:00", end: "14:00", title: "Das BUGA-Haus besichtigen, Hängebrücke und Seilbahn mit der VR-Brille erleben", by: "BUGA Wuppertal 2031", venue: "Nordbahntrasse", room: "Treffpunkt vor Utopiastadt", text: "Führung durch das ehemalige Solar-Decathlon-Haus und ein virtueller Blick auf die geplante Hängebrücke und Seilbahn." },
  { start: "13:00", end: "16:00", title: "Entdecke das Bandwebermuseum", by: "Bandwebermuseum Wuppertal", venue: "Wiesenwerke", room: "Bandwebermuseum", text: "Historische Maschinen und laufende Webstühle – und für Kinder eine Entdeckungsreise mit dem Webvogel Friedolin." },
  { start: "13:30", end: "15:00", title: "Live-Reparatur", by: "Lars Gauster (Gausterhaus) u. a.", venue: "Wiesenwerke", room: "TalTonTheater", text: "Knifflige Fälle aus der Elektro-Werkstatt, live auf der Bühne: wie man Defekte aufspürt und repariert." },
  { start: "14:00", end: "14:40", title: "Abriss oder Weiternutzung?", by: "Santana Ahmadifar, UmBauLabor Gelsenkirchen", venue: "Utopiastadt", room: "Wartesaal 1", text: "Aus der Reihe „Bauen, aber anders!“: an einem echten Gebäude gezeigt, wie sich Räume und Material erhalten und neu nutzen lassen." },
  { start: "14:00", end: "15:00", title: "Utopiastadt entdecken – Führung über das Gelände", by: "Eberhard Fahle, Utopiastadt", venue: "Nordbahntrasse", room: "Treffpunkt vor Utopiastadt", text: "Die zweite Führung über das Gelände der Utopiastadt." },
  { start: "14:00", end: "15:00", title: "Digitales Walkie-Talkie: Nachrichten ohne Internet", by: "Seeed Studio", venue: "Wiesenwerke", room: "Workshopraum", text: "Mit Meshtastic Nachrichten über ein unabhängiges Funknetz verschicken – ohne Internet, WLAN oder Mobilfunk." },
  { start: "14:40", end: "15:20", title: "Wie passen Lehmbau und Robotik zusammen?", by: "Aleksandra Konopek und Frank Andresen", venue: "Utopiastadt", room: "Wartesaal 1", text: "Aus der Reihe „Bauen, aber anders!“: ein Roboterarm, ein Lehmbauer und die Frage, wie alte Baustoffe und neue Technik zusammenkommen." },
  { start: "15:00", end: "15:30", title: "Führung durch das „Circular Office“", by: "Neue Effizienz", venue: "Wiesenwerke", room: "Bauwagen auf dem Parkplatz", text: "Die zweite Führung durch das Büro nach den Prinzipien der Kreislaufwirtschaft." },
  { start: "15:20", end: "16:00", title: "Alte Bauteile – Müll oder Ressource?", by: "Eva-Lucia Kleesiek, Baustoffbörse Gelsenkirchen", venue: "Utopiastadt", room: "Wartesaal 1", text: "Aus der Reihe „Bauen, aber anders!“: wie alte Fenster, Türen und andere Bauteile gerettet und wiederverwendet werden." },
  { start: "16:00", end: "17:00", title: "Die große Countdown-Show zum Reparaturweltrekord", venue: "Wiesenwerke", room: "TalTonTheater", text: "Schaffen wir den Rekord? Gefeiert wird so oder so – mit Spiel und Spaß, Rudelsingen und Reparaturgeschichten." },
];

/* Die Werkstaetten des ReparaturCafe XXL. Sie stehen gesondert, weil sie der
   Grund sind, mit einem kaputten Gegenstand zu kommen - auf den Postern stehen
   sie unter "Wiesenwerke", hier zusaetzlich oben auf der Seite. */
export const repairWorkshops = [
  { name: "Elektro-Werkstatt", where: "Wiesenwerke, Projektraum (2. OG)", text: "Hilfe zur Selbsthilfe für Elektrogeräte aller Art, von der Stehlampe über den Mixer bis zur Stereoanlage." },
  { name: "Fahrrad-Werkstatt", where: "Wiesenwerke, neben der Nordbahntrasse", text: "Schaltung rattert, Bremse quietscht? Gemeinsam behebt ihr den Fehler und lernt euer Rad besser kennen." },
  { name: "Textil-Werkstatt", where: "Wiesenwerke, Seminarraum im Bahnhof Blo", text: "Lose Knöpfe, Löcher in Socken und Pullis – und wer will, lernt neue Techniken an der Nähmaschine." },
  { name: "Holz-Werkstatt", where: "Wiesenwerke, Nebengebäude", text: "Sägen, schrauben, bauen: Grundfertigkeiten im Umgang mit Holz und Werkzeug. Möbel reparieren geht hier nicht – das dauert meist länger als ein Festivaltag." },
] as const;

const NETZWERK = "Netzwerk Reparatur Wuppertal";
const FAB = "Fab Region Bergisches Städtedreieck";
const MACHBAR = "MACHBAR ReparaturCafé";
const INFO: FestivalProvider = { name: `Infostand: ${FAB}`, about: "Startpunkt der Rallye. Hier beantwortet das Festivalteam eure Fragen, und hier gibt es den Rallye-Plan." };

export const festivalAreas: readonly FestivalArea[] = [
  {
    venue: "Utopiastadt",
    intro: "Im ehemaligen Bahnhof Mirke: Stände, Secondhand, kreative Workshops und Vorträge zum Bauen im Kreislauf.",
    rooms: [
      {
        name: "Wartesaal 1",
        intro: "Mit Infostand, Eröffnung und Bühnenprogramm. Getränke gibt es vom Hutmacher.",
        providers: [
          INFO,
          { name: "Bandwirkermuseum Ronsdorf", about: "Wie sieht eine Maschine aus, die Armbänder weben kann? Das Museum zeigt es." },
          { name: "Brockenhaus", about: "Secondhand-Kaufhaus in Wuppertal mit Kleidung, Möbeln, Hausrat und Büchern, eigener Reparatur und Verleih.", offers: [{ kind: "rallye", title: "Kinderschminken", text: "Es ist Halloween: tierisch, märchenhaft oder gruselig – ihr entscheidet." }] },
          {
            name: "Gut Einern",
            about: "Lernort für Permakultur und Vertical Farming in Wuppertal, der lokale Kreisläufe mit KI, Sensorik und Coding erlebbar macht.",
            offers: [
              { kind: "rallye", title: "Lernspiele entdecken", text: "Selbst entwickelte Lernspiele zu Kreisläufen und Nachhaltigkeit am Monitor. Schafft ihr es, den Kreislauf zu schließen?" },
              { kind: "rallye", title: "Wie wachsen Lebensmittel in Kreisläufen?", text: "Frische Salate aus der Vertical Farm probieren und erfahren, wie Lebensmittel lokal im Kreislauf wachsen." },
            ],
          },
        ],
      },
      {
        name: "Mehrzweckraum",
        providers: [
          { name: "Brautpoesie – First & Second Hand Brautmode", about: "Gespendete Brautkleider, Anzüge und Accessoires mit stiller Versteigerung für einen guten Zweck.", offers: [{ kind: "rallye", title: "Aus Alt mach Lieblingsstück: Kreatives aus Kleidung", text: "Aus Stoffresten, Bändern und Kordeln Anhänger, Scrunchies oder kleine Körbe gestalten. Eigene aussortierte Textilien dürft ihr mitbringen." }] },
          {
            name: FAB,
            about: "Verbindet digitale Fertigung mit lokalen Initiativen – in zirkulärer Textilwirtschaft, nachhaltigem Bauen, regionaler Ernährung und Reparatur.",
            offers: [
              { kind: "rallye", title: "Wie zirkulär bist du?", text: "Was heißt Kreislaufwirtschaft im Alltag – und wie bereit seid ihr dafür?" },
              { kind: "workshop", title: "Textiler Escape-Koffer", text: "Die Modedesignerin „Bella Balance“ ist verschwunden und hinterlässt einen verschlossenen Koffer. Mit eurem Wissen über Kleidung knackt ihr die Zahlenschlösser." },
            ],
          },
          { name: "Kabäusken", about: "Secondhand-Laden in Elberfeld für Kleidung, Accessoires und Kuriositäten.", offers: [{ kind: "workshop", title: "Perlenworkshop: vom Armband bis zum Schlüsselanhänger", text: "Euer Rallye-Armband mit Perlen zum Lieblings-Accessoire machen – oder ein Lesezeichen oder einen Anhänger gestalten." }] },
          { name: "TalGut – Second-Hand-Style aus Wuppertal (GESA)", about: "Boutique für hochwertige Secondhand-Kleidung.", offers: [{ kind: "workshop", title: "Taschen aus ausgedienten T-Shirts machen", text: "Aus T-Shirts, die keiner mehr trägt, werden praktische Taschen." }] },
        ],
      },
      {
        name: "Tanzsaal",
        where: "1. OG",
        providers: [
          { name: "Forum soziale Innovationen (FSI)", about: "Entwickelt in Solingen praktische Ideen für eine nachhaltige, faire Region.", offers: [{ kind: "rallye", title: "Hingeschaut beim Kleiderkauf", text: "Ein Quiz zu fairer Kleidung, nachhaltigem Konsum und den Menschen hinter eurer Mode." }] },
          { name: "Kleidertausch.de", about: "Veranstaltungskalender für Kleidertausch-Partys.", offers: [{ kind: "workshop", title: "Linoldruck – Pimp your Shirt", text: "Motive auf Kleidung drucken, etwa über Flecken, die nicht mehr rausgehen. Bringt am besten etwas aus festerem Stoff oder einen Jutebeutel mit." }] },
          { name: "NIKAO – Upcycling für eine Welt ohne Abfall", about: "Upcycling-Workshops und Unikate aus Solingen.", offers: [{ kind: "workshop", title: "Kreatives aus alten Fahrradschläuchen", text: "Aus ausrangierten Fahrradschläuchen werden Fledermaus-Schlüsselanhänger." }] },
          { name: "REpairABLE", about: "Hilft dabei, schnell eine passende Reparaturmöglichkeit für defekte Geräte zu finden." },
          {
            name: "Ronsdorfer Bücherstube",
            about: "Buchhandlung mit Lesungen und Veranstaltungen, die den Stadtteil verbinden.",
            offers: [
              { kind: "rallye", title: "Schreibmaschine: Nachrichten wie zu Großmutters Zeiten", text: "Eine liebe Nachricht auf der alten Schreibmaschine tippen – und sie danach digital verschicken." },
              { kind: "rallye", title: "Die Papiergirlande", text: "Was würdet ihr in der Welt gern reparieren? Jedes Wort wird Teil einer Girlande, die über den Tag wächst." },
            ],
          },
          { name: "Verbraucherzentrale Umweltberatung Wuppertal", about: "Unabhängige Beratung zu Energie, nachhaltigem Konsum und Abfallvermeidung.", offers: [{ kind: "rallye", title: "Bügelflicken kreativ gestalten", text: "Eigene Bügelflicken gestalten und erfahren, wer was an einer Jeans verdient und welche Siegel helfen." }] },
          { name: "Wuppertal Institut für Klima, Umwelt, Energie", offers: [{ kind: "rallye", title: "Ressourcen-Rechner", text: "In zehn Minuten den eigenen ökologischen Rucksack berechnen – mit Tipps für einen ressourcenleichteren Alltag." }] },
          { name: "zdi-Zentrum BeST Wuppertal", about: "Begeistert Schüler:innen für MINT-Fächer.", offers: [{ kind: "workshop", title: "Basteltiere unter Strom", text: "Aus alten Kartons werden kleine Tiere, die ein Motor zum Leben erweckt." }] },
        ],
      },
    ],
  },
  {
    venue: "Wiesenwerke",
    intro: "In der früheren Gold-Zack-Fabrik: das ReparaturCafé XXL, die Zukunfts-Werkstatt und die Bühne im TalTonTheater.",
    rooms: [
      { name: "Bauwagen", where: "auf dem Parkplatz", intro: "Treffpunkt für die Führungen durch das „Circular Office“.", providers: [INFO] },
      {
        name: "Bahnhof Blo",
        where: "Bouldercafé",
        intro: "Für veganes Essen und Getränke ist hier gesorgt.",
        providers: [
          INFO,
          { name: "Smart Circular Wuppertal", about: "Erprobt in Pilotprojekten neue Ansätze für Kreislaufwirtschaft in Wuppertal, etwa vernetzte Reparaturangebote.", offers: [{ kind: "rallye", title: "Welcher Reparaturtyp bist du?", text: "Mit ein paar Fragen herausfinden, welcher von vier Reparaturtypen ihr seid – und welcher ihr sein wollt." }] },
        ],
      },
      {
        name: "Elektro-Werkstatt",
        where: "Projektraum (2. OG)",
        intro: "Teil des ReparaturCafé XXL.",
        providers: [
          { name: NETZWERK, about: "Hilfe zur Selbsthilfe für Elektrogeräte aller Art." },
          { name: "ASTA RepairCafé Bochum & MACHBAR ReparaturCafé", offers: [{ kind: "workshop", title: "Drähte verbinden und löten", text: "Kabel fest verbinden – und als erstes Projekt einen „heißen Draht“ löten, der bei Berührung klingelt." }] },
          { name: MACHBAR, offers: [{ kind: "rallye", title: "Elektro-Detektiv: Finde den Fehler", text: "Mitmach-Experimente rund um Strom, Elektronik und Reparatur." }] },
          { name: "iFixit – Die Zukunft ist reparierbar", about: "Die größte Online-Reparaturcommunity der Welt, mit freien Anleitungen, Werkzeug und Ersatzteilen.", offers: [{ kind: "rallye", title: "Smartphone reinigen", text: "Wie eine Grundreinigung geht und wie ihr damit Defekten vorbeugt." }] },
        ],
      },
      {
        name: "Fahrrad-Werkstatt",
        where: "neben der Nordbahntrasse",
        intro: "Teil des ReparaturCafé XXL.",
        providers: [
          { name: NETZWERK, about: "Hilfe zur Selbsthilfe bei allem, was am Rad rattert und quietscht." },
          { name: "Arrenbergstatt", offers: [{ kind: "rallye", title: "Fahrrad-Flicken", text: "Mit dem „Lochschnüffler“ ein kleines Loch im Schlauch finden und flicken – die Superkraft aller Radfahrenden." }] },
          { name: MACHBAR, offers: [{ kind: "rallye", title: "PowerBike: Energie mit Muskelkraft", text: "Mit Muskelkraft eine Lampe zum Leuchten bringen oder das eigene Handy laden." }] },
        ],
      },
      {
        name: "Textil-Werkstatt",
        where: "Seminarraum im Bahnhof Blo",
        intro: "Teil des ReparaturCafé XXL.",
        providers: [
          { name: NETZWERK, about: "Hilfe zur Selbsthilfe für kaputte Kleidungsstücke." },
          {
            name: MACHBAR,
            offers: [
              { kind: "rallye", title: "Nähmaschine einfach ausprobieren", text: "Mit ruhigem Fuß und ruhiger Hand Linien auf Papiervorlagen nachnähen." },
              { kind: "workshop", title: "Visible Mending: Kunstvoll Löcher stopfen", text: "Löcher verschwinden lassen – oder in kleine Kunstwerke verwandeln." },
              { kind: "workshop", title: "T-Shirt bedrucken: Kreatives Upcycling", text: "T-Shirts mit Stempel- oder Transferdruck ein neues Design geben." },
            ],
          },
          { name: "Repair & Share Ruhr", offers: [{ kind: "workshop", title: "Notizbücher gestalten aus Altpapier", text: "Ein eigenes Notizbuch aus Altpapier gestalten." }] },
          { name: FAB, offers: [{ kind: "rallye", title: "Textil-Archiv: Reparieren, gestalten & Wissen teilen", text: "Reparaturtechniken an Textilstücken dokumentieren und digitalisieren – vielleicht ergänzt ihr eine eigene." }] },
        ],
      },
      {
        name: "Holz-Werkstatt",
        where: "Nebengebäude",
        intro: "Teil des ReparaturCafé XXL. Möbelreparaturen sind hier nicht möglich – sie dauern meist länger als das Festival.",
        providers: [
          { name: NETZWERK, offers: [{ kind: "workshop", title: "Vogel- oder Fledermaushäuschen bauen", text: "Ein Projekt für Einsteiger:innen und Fortgeschrittene – die Tiere werden es euch danken." }] },
          { name: "wasbauen | Steffen Hübner", offers: [{ kind: "workshop", title: "Kleine Holzflitzer bauen", text: "Kinder ab 4 Jahren bauen mit Hilfe der Großen aus Modulen ein eigenes Holzfahrzeug: sägen, schleifen, anmalen, Räder dran, losfahren." }] },
        ],
      },
      {
        name: "Zukunfts-Werkstatt",
        where: "Obergeschoss",
        intro: "Ein Ort zum Durchatmen und Weiterdenken: Setzt euch hin, entwickelt eure Vision einer kreislauffähigen Zukunft – oder spielt eine Runde Minigolf.",
        providers: [
          { name: "Zentrum für gute Taten", about: "Bringt Menschen und passende Ehrenämter in Wuppertal zusammen.", offers: [{ kind: "rallye", title: "Ehrenamts-Quiz", text: "Welche Art von Engagement passt zu euch?" }] },
          { name: "MUSE LAB", offers: [{ kind: "rallye", title: "Entdecke Material der Zukunft", text: "Ungewöhnliche Materialien fühlen, vergleichen und überlegen, was sich daraus machen ließe." }] },
          { name: "GOOD NEWS", offers: [{ kind: "rallye", title: "Nachrichten, die Mut machen", text: "Gute Nachrichten vorlesen und sammeln – bringt gern eigene mit." }] },
          { name: "Joris Bijkerk | MakerSpace Bocholt", about: "Bringt Erfahrungen aus ungewöhnlichen Maker- und Repair-Projekten mit – was daraus entsteht, entwickelt ihr vor Ort gemeinsam." },
          { name: "Inga Baldus & Team", about: "Mit dem Kunstprojekt IN DEN TIEFEN wird die Zukunfts-Werkstatt zum Cozy Space zum Ankommen, Begegnen und Ideenspinnen.", offers: [{ kind: "rallye", title: "Blickkontakt-Challenge", text: "30 Sekunden Blickkontakt mit einem fremden Menschen, auf Augenhöhe. Traut ihr euch?" }] },
          { name: "SupaGolf", offers: [{ kind: "rallye", title: "Spiel die coolsten Wuppertaler Bahnen", text: "Minigolf mit Hockeyschlägern auf selbstgebauten Upcycling-Bahnen. Gewinnen ist Nebensache." }] },
          { name: FAB, offers: [{ kind: "rallye", title: "Baue deine Vision einer Kreislaufregion mit LEGO", text: "Mit Lego® Serious Play® die eigene Vision einer zirkulären Zukunft auf den Tisch bauen." }] },
        ],
      },
      {
        name: "Workshopraum",
        where: "im WSV-Fanprojekt",
        intro: "Dazu drei Workshops von Seeed Studio zu festen Zeiten, siehe Zeitplan.",
        providers: [
          { name: "WeWomen", about: "Community, die besonders Frauen mit Migrationsgeschichte vernetzt und unterstützt.", offers: [{ kind: "rallye", title: "Schmuck aus getrockneten Blumen", text: "Eigene Schmuckstücke aus getrockneten Blumen gestalten." }] },
          { name: "Arrenbergstatt", offers: [{ kind: "rallye", title: "Schraube locker? Die große Werkzeug-Challenge", text: "Schraubendreher oder Maulschlüssel? Schrauben mit dem richtigen Werkzeug lösen und woanders wieder festmachen." }] },
          { name: MACHBAR, offers: [{ kind: "rallye", title: "RecyclingBar: getrennt sammeln, direkt nutzen", text: "Materialien, die mehr wert sind, wenn man sie getrennt sammelt und weitergibt." }] },
        ],
      },
    ],
  },
  {
    venue: "Nordbahntrasse",
    intro: "Zwischen den beiden Orten, rund 700 Meter auf der Trasse. Vor der Utopiastadt starten die Führungen; veganes Essen gibt es von der Street-Kitchen, Kaffee und Kuchen vom Kulturkindergarten.",
    rooms: [
      {
        name: "An der Trasse",
        providers: [
          { name: "Nachbarschaftsheim Wuppertal", about: "Fährt den Rikscha-Shuttle: Eine Fahrradrikscha pendelt zwischen Utopiastadt und Wiesenwerken – für alle, die nicht gut zu Fuß sind, und für müde Beine." },
          { name: "Gut Einern Zukunftsmobil", about: "Einblicke in Sensorik, mobile Bildung und den neuen Lerngarten 2027.", offers: [{ kind: "rallye", title: "Sensor-Check: Wer misst hier was?", text: "Zukunftsmobil und Vertical Farm im Container besuchen und herausfinden, was die Sensoren einer Vertical Farm messen." }] },
          { name: "Förderverein Utopiastadt", offers: [{ kind: "rallye", title: "Triff Utopiastadt!", text: "Alles über das Projekt Utopiastadt und den Förderverein." }] },
        ],
      },
    ],
  },
];
