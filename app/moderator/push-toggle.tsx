"use client";

import { useCallback, useEffect, useState } from "react";

/* Umschalter fuer Push-Benachrichtigungen bei neuen Einreichungen (Issue #43).
 *
 * Diese Komponente ist der EINZIGE Ort im Projekt, der
 * `Notification.requestPermission()` aufruft, und sie steht ausschliesslich in
 * der Moderationskonsole. Eine oeffentliche Seite registriert weder den Service
 * Worker noch fragt sie nach der Berechtigung - wer die Seite bloss besucht,
 * kann die Browserabfrage also nicht zu sehen bekommen.
 *
 * Gefragt wird ausserdem erst auf Klick, nie beim Laden. Chrome und Safari
 * verlangen fuer die Abfrage eine Nutzeraktion, und ungefragte Abfragen beim
 * Seitenaufbau werten Browser als Missbrauchsmuster.
 */

type State =
  | "loading"
  | "unsupported" // Browser kann kein Push (oder iOS-Safari ohne Installation)
  | "unconfigured" // Server hat keine VAPID-Schluessel
  | "denied" // Berechtigung im Browser abgelehnt
  | "off"
  | "on"
  | "busy";

function urlBase64ToUint8Array(base64: string) {
  /* Der VAPID-Schluessel steht als base64url in der Umgebung, `subscribe`
     erwartet rohe Bytes. */
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

const isSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export default function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let active = true;

    (async () => {
      if (!isSupported() || !publicKey) {
        if (active) setState(isSupported() ? "unconfigured" : "unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        if (active) setState("denied");
        return;
      }

      /* Nur nachsehen, ob dieses Geraet schon angemeldet ist - ohne zu
         registrieren und ohne zu fragen. `getRegistration` legt nichts an. */
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const existing = await registration?.pushManager.getSubscription();
        if (active) setState(existing ? "on" : "off");
      } catch {
        if (active) setState("off");
      }
    })();

    return () => {
      active = false;
    };
  }, [publicKey]);

  const enable = useCallback(async () => {
    if (!publicKey) return;
    setState("busy");
    setMessage(null);

    try {
      // Erst fragen, dann registrieren: Ohne Erlaubnis braucht es den Service
      // Worker gar nicht.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          // Pflicht in Chrome: Jede Push-Nachricht muss sichtbar sein.
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        // Abo im Browser wieder loesen, sonst haelt das Geraet ein Abo, von dem
        // der Server nichts weiss - es kaeme nie eine Nachricht an.
        await subscription.unsubscribe().catch(() => {});
        setState("off");
        setMessage(detail?.error ?? "Anmeldung fehlgeschlagen.");
        return;
      }

      setState("on");
    } catch {
      setState("off");
      setMessage("Anmeldung fehlgeschlagen.");
    }
  }, [publicKey]);

  const disable = useCallback(async () => {
    setState("busy");
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setState("off");
    } catch {
      setState("off");
      setMessage("Abmeldung fehlgeschlagen.");
    }
  }, []);

  if (state === "loading") return null;

  /* Die Hinweistexte nennen den Grund, statt nur einen toten Schalter zu
     zeigen - besonders auf dem iPhone, wo Push ohne Installation gar nicht
     existiert und der Grund sonst nicht zu erraten waere. */
  if (state === "unsupported") {
    return (
      <p className="push-toggle is-note">
        Dieser Browser kann keine Benachrichtigungen. Auf dem iPhone geht das nur,
        wenn die Moderation über <em>Teilen &rarr; Zum Home-Bildschirm</em>
        {" "}installiert ist.
      </p>
    );
  }

  if (state === "unconfigured") {
    return (
      <p className="push-toggle is-note">
        Benachrichtigungen sind für diese Installation nicht eingerichtet: Der
        öffentliche Schlüssel fehlt im Browser-Bundle. Er wird beim Bauen
        eingesetzt, ein Deployment nach dem Setzen der Variable ist also nötig.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="push-toggle is-note">
        Benachrichtigungen sind für diese Seite im Browser blockiert. Das lässt sich
        nur in den Browsereinstellungen wieder erlauben.
      </p>
    );
  }

  const on = state === "on";

  return (
    <div className="push-toggle">
      <button
        className={`button ${on ? "button-primary" : "button-secondary"}`}
        type="button"
        aria-pressed={on}
        disabled={state === "busy"}
        onClick={on ? disable : enable}
      >
        {state === "busy" ? "…" : on ? "Benachrichtigungen an" : "Bei neuen Eintragungen benachrichtigen"}
      </button>
      {message ? <span className="push-toggle-error">{message}</span> : null}
    </div>
  );
}
