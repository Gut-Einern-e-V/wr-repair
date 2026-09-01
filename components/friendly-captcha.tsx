"use client";

import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import { FriendlyCaptchaSDK, type FRCWidgetErrorEventData } from "@friendlycaptcha/sdk";

let sdk: FriendlyCaptchaSDK | undefined;

function getSdk() {
  sdk ??= new FriendlyCaptchaSDK();
  return sdk;
}

type FriendlyCaptchaProps = {
  sitekey: string;
  onError: (message: string) => void;
  /**
   * Wird mit einer Funktion belegt, die das Widget zuruecksetzt und damit ein
   * frisches Token loest.
   *
   * Gebraucht fuer die Wiederholungsversuche des Formulars: Ein Token von
   * Friendly Captcha ist einmalig. Erreichte ein Sendeversuch den Server und
   * scheiterte erst danach, ist das Token verbraucht - der naechste Versuch
   * bekaeme sonst eine Absage vom Spam-Schutz statt einer zweiten Chance
   * (siehe submitRepair in components/repair-submission-form.tsx).
   */
  resetRef?: RefObject<(() => void) | null>;
};

export function FriendlyCaptcha({ sitekey, onError, resetRef }: FriendlyCaptchaProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const reportError = useEffectEvent(onError);
  const exposeReset = useEffectEvent((reset: (() => void) | null) => {
    if (resetRef) resetRef.current = reset;
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const widget = getSdk().createWidget({ element: mount, sitekey, startMode: "auto" });
    const handleComplete = () => reportError("");

    /**
     * Der Fehlercode steht in der Meldung, und zwar mit Absicht.
     *
     * Vorher hiesz jeder Fehler des Widgets "Bitte versuche es erneut" - auch
     * der, bei dem ein zweiter Versuch nie hilft: ein Sitekey, der nicht zu
     * dieser Domain gehoert. Beim Aktivieren des Spam-Schutzes auf einer neuen
     * Adresse ist das der wahrscheinlichste Fehler ueberhaupt, und er sieht von
     * auszen wie eine Stoerung aus. Mit `sitekey_invalid` im Text genuegt ein
     * Screenshot aus dem Reparatur-Cafe, um ihn zu erkennen.
     */
    const handleError = (event: Event) => {
      const error = (event as CustomEvent<FRCWidgetErrorEventData>).detail?.error;
      const code = error?.code ?? "other";
      console.warn(`[captcha] ${code}`, error?.detail ?? "");
      reportError(code === "sitekey_invalid" || code === "sitekey_missing"
        ? `Der Spam-Schutz ist für diese Seite nicht richtig eingerichtet (${code}). Bitte melde uns das – ein neuer Versuch ändert daran nichts.`
        : `Der Spam-Schutz konnte nicht geladen werden (${code}). Bitte versuche es erneut.`);
    };

    const handleExpiry = () => reportError("Der Spam-Schutz ist abgelaufen. Bitte starte ihn erneut.");

    mount.addEventListener("frc:widget.complete", handleComplete);
    mount.addEventListener("frc:widget.error", handleError);
    mount.addEventListener("frc:widget.expire", handleExpiry);
    // startMode "auto" laesst das Widget nach dem Zuruecksetzen von selbst
    // wieder loesen, deshalb genuegt hier reset().
    exposeReset(() => widget.reset());

    return () => {
      mount.removeEventListener("frc:widget.complete", handleComplete);
      mount.removeEventListener("frc:widget.error", handleError);
      mount.removeEventListener("frc:widget.expire", handleExpiry);
      exposeReset(null);
      widget.destroy();
    };
  }, [sitekey]);

  return <div ref={mountRef} className="frc-captcha" />;
}
