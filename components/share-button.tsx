"use client";

import { useState } from "react";

type ShareButtonProps = {
  title: string;
  text: string;
  /** Absolute URL. Bleibt leer, solange die Basis-URL erst im Browser bekannt ist. */
  url: string;
  label?: string;
  className?: string;
};

/**
 * Oeffnet das native Teilen-Fenster (Web Share API). Browser ohne Unterstuetzung
 * bekommen den Link in die Zwischenablage kopiert.
 */
export function ShareButton({ title, text, url, label = "Teilen", className = "button button-primary" }: ShareButtonProps) {
  const [status, setStatus] = useState("");

  async function share() {
    const shareUrl = url || (typeof window === "undefined" ? "" : window.location.href);

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      setStatus("Link kopiert. Füge ihn in deine Story oder deinen Beitrag ein.");
    } catch {
      setStatus(`Teilen wird hier nicht unterstützt. Link: ${shareUrl}`);
    }
  }

  return <>
    <button className={className} type="button" onClick={() => void share()}>
      {label} <span aria-hidden="true">&#8599;</span>
    </button>
    {status && <p className="form-notice" role="status">{status}</p>}
  </>;
}
