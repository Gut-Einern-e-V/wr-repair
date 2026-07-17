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

Stories are statically generated at `/stories/[slug]` during the production build. Add a new `.md` file, then run `npm run build` to verify its route.

## Reuse this project

This repository is meant to be adaptable for other repair campaigns. Before deploying a copy, replace all campaign dates, responsible organisation details, legal pages, data retention rules, support contacts, branding and partner/funding references.

Do not copy the production secrets, Supabase project, Friendly Captcha keys or administrator accounts. Create a separate Supabase project and apply the migrations in `supabase/migrations/` for each deployment.

The technical privacy data flow and outstanding legal decisions are recorded in `docs/data-protection-concept.md`. Deployment setup is described in `docs/vercel-deployment.md`.

## Quality checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## License

See [LICENSE](LICENSE).
