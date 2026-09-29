/* Ersatz fuer `server-only` in den Tests. Next.js loest den Import selbst auf
   und bricht den Build ab, sobald eine Client-Komponente ein so markiertes
   Modul zieht. Vitest kennt diese Aufloesung nicht; hier gibt es nichts zu
   schuetzen. */
export {};
