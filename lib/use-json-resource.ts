"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Loaded<T> = { key: string; data: T | null; error: string };

/**
 * Laedt eine JSON-Ressource des Backends und haelt Fehler bei der Ressource.
 *
 * Der Effekt setzt den Zustand ausschliesslich in der Promise-Fortsetzung; ein
 * direktes `setState` im Effektkoerper wuerde Kaskadenrenders ausloesen (siehe
 * react-hooks/set-state-in-effect).
 */
export function useJsonResource<T>(url: string, fallbackError: string) {
  const [nonce, setNonce] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const key = useMemo(() => `${url}#${nonce}`, [url, nonce]);

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then(async (response) => {
        const payload = await response.json() as T & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? fallbackError);
        }
        return payload;
      })
      .then((payload) => { if (!cancelled) setLoaded({ key, data: payload, error: "" }); })
      .catch((loadError: Error) => { if (!cancelled) setLoaded({ key, data: null, error: loadError.message || fallbackError }); });

    return () => { cancelled = true; };
  }, [url, key, fallbackError]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  const patch = useCallback((update: (current: T) => T) => {
    setLoaded((current) => (current?.data ? { ...current, data: update(current.data) } : current));
  }, []);

  return {
    data: loaded?.key === key ? loaded.data : null,
    error: loaded?.key === key ? loaded.error : "",
    // Solange der geladene Schluessel nicht zum aktuellen passt, laeuft die Abfrage.
    isLoading: loaded?.key !== key,
    reload,
    patch,
  };
}
