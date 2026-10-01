"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { MIN_PASSWORD_LENGTH, passwordProblem } from "@/lib/password-policy";

export default function PasswordForm({ email, forced, next }: { email: string; forced: boolean; next: string }) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // "Abmelden" schickt dasselbe Formular an die Abmelderoute - das laeuft normal durch.
    if ((event.nativeEvent as SubmitEvent).submitter?.hasAttribute("formaction")) return;
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const repeat = String(formData.get("repeat") ?? "");

    const problem = passwordProblem(password, repeat);
    if (problem) {
      setError(problem);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: formData.get("currentPassword") ?? undefined, password, repeat }),
      });
      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Das Passwort konnte nicht geändert werden.");
        return;
      }

      // Voller Seitenwechsel: proxy.ts soll das Konto mit geloeschter Markierung sehen.
      window.location.assign(next);
    } catch {
      setError("Das Passwort konnte nicht geändert werden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <Link className="brand" href="/" aria-label="Zur Startseite"><span className="brand-mark">R</span><span>Reparaturrekord<br />NRW</span></Link>
        <p className="brand-kicker">{email}</p>
        <h1 className="sticker-head"><span className="sticker">{forced ? "Eigenes Passwort" : "Passwort ändern"}</span></h1>
        {forced && (
          <p className="form-notice">Du bist mit einem temporären Passwort angemeldet. Wähle jetzt ein eigenes – danach geht es direkt weiter.</p>
        )}
        {!forced && (
          <label>Bisheriges Passwort<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
        )}
        <label>Neues Passwort<input name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} maxLength={72} required /></label>
        <label>Neues Passwort wiederholen<input name="repeat" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} maxLength={72} required /></label>
        <p className="auth-hint">Mindestens {MIN_PASSWORD_LENGTH} Zeichen. Am einfachsten ist ein Satz aus mehreren Wörtern.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Wird gespeichert ..." : "Passwort speichern"}</button>
        {forced
          // Kein eigenes <form> - Formulare duerfen nicht ineinander stecken.
          ? <p className="auth-secondary"><button className="text-button" type="submit" formAction="/api/auth/signout" formMethod="post" formNoValidate>Abmelden</button></p>
          : <p className="auth-secondary"><Link className="text-button" href={next}>Abbrechen</Link></p>}
      </form>
    </main>
  );
}
