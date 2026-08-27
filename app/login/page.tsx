"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/** Nur interne Pfade sind als Ziel erlaubt, damit der Parameter nicht zur Weiterleitung nach aussen taugt. */
function safeNext(value: string | null) {
  return value && /^\/[A-Za-z0-9\-_/]*$/.test(value) ? value : null;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    const formData = new FormData(event.currentTarget);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });

      if (loginError) {
        setError("E-Mail oder Passwort sind nicht korrekt.");
        return;
      }

      // /admin schickt reine Moderationskonten selbst weiter zu /moderator.
      window.location.assign(safeNext(searchParams.get("next")) ?? "/admin");
    } catch {
      setError("Der Login ist noch nicht konfiguriert.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <Link className="brand" href="/" aria-label="Zur Startseite"><span className="brand-mark">R</span><span>Reparaturrekord<br />NRW</span></Link>
        <p className="brand-kicker">Moderation und Administration</p>
        <h1 className="sticker-head"><span className="sticker">Einloggen</span></h1>
        <label>E-Mail<input name="email" type="email" autoComplete="email" required /></label>
        <label>Passwort<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Prueft ..." : "Einloggen"}</button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-page"><p className="section-index">Laedt ...</p></main>}>
      <LoginForm />
    </Suspense>
  );
}
