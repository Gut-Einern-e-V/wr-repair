# Repair Record NRW

Repair Record NRW is an open-source platform for collecting, moderating and publishing repair stories during a public repair campaign. It is built with Next.js, Supabase and Vercel.

The application accepts a repair description and a privacy-sanitised image, places every entry in a moderation queue, and shows only approved entries in public statistics and the gallery.

## Run locally

Use Node.js 20.9 or later.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Configure the Supabase and Friendly Captcha values described in `.env.example` before testing real submissions. The application intentionally blocks public submissions until Friendly Captcha is configured.

## Quick submission and QR poster

`/mitmachen` is a standalone, mobile-first page that shows the submission form directly — it is the landing page for QR codes so scanners do not have to scroll the home page. The home page modal renders the same `RepairSubmissionForm` component, so both stay identical.

`/aufsteller` is a printable A4 stand. It generates a QR code for `NEXT_PUBLIC_SITE_URL + /mitmachen` at request time, so a domain change only requires updating that environment variable. Print it with the browser print dialog.

After a submission the confirmation screen links to `/reparatur/<id>`. That page shows the moderation state and only offers the native share dialog (Web Share API, clipboard fallback) once the entry is approved, so nothing unmoderated can be shared. Approved entries also get a branded Open Graph image at `/reparatur/<id>/opengraph-image`.

## Consent

The public pages load exactly one non-essential third party: `va.vercel-scripts.com` for Vercel Web Analytics. There is no advertising, no cross-site tracking and no social media embed, so the banner has one real thing to gate.

Without a decision, rejection applies: `components/consent-analytics.tsx` does not render `<Analytics />` at all, so the provider's script is never fetched. A `beforeSend` filter would be too late — the connection would already exist. The model lives in `lib/consent.ts`, browser access in `lib/consent-store.ts`, and the decision is stored under `reparaturrekord.consent` in `localStorage` rather than a cookie, because only the browser needs it.

Adding a category means raising `CONSENT_VERSION`; stored decisions from an older version are treated as undecided so visitors are asked again. Accept and reject are styled identically and the banner has no close button — rejecting must not be harder than accepting. Visitors change or withdraw the decision through "Cookie-Einstellungen" in every footer.

Nunito and Playfair Display are self-hosted through `next/font`, so no request reaches Google. The previous `@import` from `fonts.googleapis.com` in `app/globals.css` was silently dropped by the bundler, which meant no web font was delivered at all.

## Finding a repair cafe

`/repair-cafes` answers "where do I get help?" without maintaining a second event database. It deep-links into the two directories that already keep their own listings: `reparatur-initiativen.de/termine?provinceId=10` for all North Rhine-Westphalia dates, plus one `?keyword=<city>` link per major city, and `repaircafe.org/de/besuchen/` for the international map. The city list and both directory URLs live in `lib/repair-cafes.ts` — the parameters were verified against the live sites, so change them only after re-checking.

## Content

Repair stories are versioned Markdown files in `content/stories/`. Each story requires this frontmatter:

```md
---
title: A short, descriptive title
summary: One-sentence introduction
category: Repair category
date: 2026-10-01
readingTime: 3 min
---

Opening paragraph.

## Section heading

Further text.
```

Stories are statically generated at `/stories/[slug]` during the production build, and the home page mosaic reads the same files at build time, so a page view triggers no extra request. Add a new `.md` file, then run `npm run build` to verify its route. Files named `README.md` or starting with an underscore are ignored, so drafts can stay in the repository.

`content/stories/README.md` is the German step-by-step guide for the editorial team on adding a new blog entry.

## Reuse this project

This repository is meant to be adaptable for other repair campaigns. Before deploying a copy, replace all campaign dates, responsible organisation details, legal pages, data retention rules, support contacts, branding and partner/funding references.

Do not copy the production secrets, Supabase project, Friendly Captcha keys or administrator accounts. Create a separate Supabase project and apply the migrations in `supabase/migrations/` for each deployment.

The technical privacy data flow and outstanding legal decisions are recorded in `docs/data-protection-concept.md`. Deployment setup is described in `docs/vercel-deployment.md`.

For a complete independent campaign setup, including Supabase, Vercel, Friendly Captcha and launch checks, see `docs/campaign-adaptation-guide.md`. Public counter displays for ESP32, Arduino and Raspberry Pi can use the documented aggregate API in `docs/hardware-display-api.md`.

## Quality checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## License

See [LICENSE](LICENSE).
