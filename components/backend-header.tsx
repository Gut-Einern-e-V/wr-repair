import Link from "next/link";

export type BackendArea = "moderation" | "admin";

/**
 * Kopfzeile fuer Moderation und Administration. Beide Bereiche sind getrennt,
 * aber Admins wechseln von hier aus in die Moderationsansicht (Issue #10).
 */
export default function BackendHeader({ area, email, logoUrl, canAdminister }: { area: BackendArea; email: string; logoUrl: string | null; canAdminister: boolean }) {
  return (
    <header className="moderator-header">
      <Link className="brand" href="/">
        {logoUrl
          // eslint-disable-next-line @next/next/no-img-element -- Das Logo liegt in Supabase Storage und hat keine bekannte Groesse.
          ? <img className="brand-logo" src={logoUrl} alt="Reparaturrekord NRW" />
          : <span className="brand-mark">R</span>}
        <span>Reparaturrekord<br />NRW</span>
      </Link>
      <div className="backend-nav">
        {canAdminister && (
          <nav aria-label="Backend-Bereiche">
            <Link className={area === "moderation" ? "is-current" : ""} href="/moderator">Moderation</Link>
            <Link className={area === "admin" ? "is-current" : ""} href="/admin">Administration</Link>
          </nav>
        )}
        <span className="backend-user">{email}</span>
        <form action="/api/auth/signout" method="post"><button className="text-button" type="submit">Abmelden</button></form>
      </div>
    </header>
  );
}
