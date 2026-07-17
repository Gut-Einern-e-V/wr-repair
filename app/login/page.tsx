"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
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

      window.location.assign("/moderator");
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
        <p className="section-index">Moderation</p>
        <h1>Einloggen</h1>
        <label>E-Mail<input name="email" type="email" autoComplete="email" required /></label>
        <label>Passwort<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Prueft ..." : "Einloggen"}</button>
      </form>
    </main>
  );
}