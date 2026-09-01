# Vercel deployment

## First deployment

1. Import the `Gut-Einern-e-V/wr-repair` repository in Vercel.
2. Keep the detected framework preset **Next.js**. The default build command is `npm run build` and the default output configuration is correct.
3. Add the environment variables below in **Settings > Environment Variables**.
4. Create a deployment. Use its generated `vercel.app` URL as the temporary value for `NEXT_PUBLIC_SITE_URL` and deploy once more.
5. When the custom domain is live, update `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, the Supabase Authentication redirect URL, and the Friendly Captcha application domains. Deploy again.

Vercel provides `VERCEL`, `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_BRANCH_URL`, and `VERCEL_REGION` automatically. Do not create those variables manually.

## Environment variables

Copy `.env.example` to `.env.local` for local work. `.env.local` is intentionally ignored by Git. Set the real values in Vercel, never in a committed file.

| Variable | Visibility | Required environments | Source / purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public | Development, Preview, Production | Application URL. In Preview, use the relevant Vercel preview URL when testing redirects. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Development, Preview, Production | Supabase Dashboard > Connect > Project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Development, Preview, Production | Supabase Dashboard > Connect > Publishable key. This key is designed for browser use and is protected by RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Development, Preview, Production | Supabase Dashboard > Connect > Service role key. Server route handlers only; never use `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_FRIENDLY_CAPTCHA_SITEKEY` | Public | Development, Preview, Production | Friendly Captcha v2 application sitekey. It starts with `FC`. |
| `FRIENDLY_CAPTCHA_API_KEY` | Secret | Development, Preview, Production | Friendly Captcha API key used only by the server-side Siteverify request. |
| `NEXT_PUBLIC_CAPTCHA_ENABLED` | Public | Development, Preview, Production | Set to `true` by default. Set to `false` only for a short, deliberate temporary bypass; Friendly Captcha is then skipped in browser and server route, while the upload rate limit remains active. |
| `SUBMISSION_START_AT` | Secret | Preview, Production | Start of the validated participation window in ISO 8601 with timezone. |
| `SUBMISSION_END_AT` | Secret | Preview, Production | End of the validated participation window in ISO 8601 with timezone. |
| `GEOIP_ALLOW_LOCAL` | Secret | Development only | Set to `true` only for local testing when Vercel geo headers are unavailable. Never set this in Preview or Production. |
| `ALLOWED_ORIGINS` | Secret | Development, Preview, Production | Comma-separated allowed website origins for future API CORS checks. |
| `SUBMISSION_RATE_LIMIT` | Secret | Optional | Submissions accepted per internet connection and window. Defaults to 40. The limit keys on the IP address, and at an event every device shares one, so raise it rather than lower it (issues #64 and #59). |
| `SUBMISSION_RATE_WINDOW_SECONDS` | Secret | Optional | Length of that window in seconds. Defaults to 60. Keep it short: a wrongly throttled repair café waits out one window, and a script gets no further per minute either. |
| `SUBMISSION_RATE_SALT` | Secret | Recommended | Salt for the SHA-256 fingerprint the submission counter stores instead of an IP address. Falls back to `SUPABASE_SERVICE_ROLE_KEY`. Changing it resets all running counters. |

Do not set a `NODE_ENV` variable in Vercel. Next.js supplies `production` for builds and runtime automatically.

## Provider configuration

### Supabase

- Apply the versioned SQL migration in `supabase/migrations` to the Supabase project before enabling real submissions.
- Keep the `repair-images` bucket private. The planned Next.js API uses the service-role key after validation; browsers must not receive this key.
- In Supabase Authentication, add the local URL, the Vercel preview domain pattern and the production domain to the allowed redirect URLs before adding moderator login.

### Friendly Captcha and NRW region check

- Create a Friendly Captcha application and register the local, preview and production hostnames before enabling the upload endpoint. Copy its `FC...` sitekey to `NEXT_PUBLIC_FRIENDLY_CAPTCHA_SITEKEY`.
- Create a Friendly Captcha API key and save it only as `FRIENDLY_CAPTCHA_API_KEY`. The server validates `frc-captcha-response` through `https://global.frcapi.com/api/v2/captcha/siteverify` with its `X-API-Key` header.
- Keep `NEXT_PUBLIC_CAPTCHA_ENABLED=true` in public operation. To temporarily accept submissions while the Friendly Captcha configuration is being fixed, set it to `false` and create a new deployment. This is intentionally visible in the submission form and must be changed back to `true` before public promotion.

#### Turning spam protection on (issue #59)

The three captcha variables are all `NEXT_PUBLIC_`/build-time or server-read, and the browser half is **inlined at build time**. Changing them in the Vercel dashboard therefore does nothing until the next deployment — redeploy after every change.

1. In the Friendly Captcha dashboard, open the application and add the production hostname (`reparatur.fab-bergisch.org`) next to `localhost` and the `*.vercel.app` preview host. A sitekey used on an unregistered host makes the widget fail with `sitekey_invalid`, which the submission form now prints verbatim.
2. Set `NEXT_PUBLIC_FRIENDLY_CAPTCHA_SITEKEY`, `FRIENDLY_CAPTCHA_API_KEY` and `NEXT_PUBLIC_CAPTCHA_ENABLED=true` for Production, then redeploy.
3. Open `/admin`. The "Friendly Captcha" card now reports `Gestoert` while the bypass is active, not just a footnote, so a forgotten `false` cannot hide there.
4. Submit one real repair from the production domain. The widget solves itself; a failure names its code.

How failures are handled, deliberately: a **5xx, a timeout, or a 401/403/429 from siteverify is our problem, not the submitter's** — the submission is accepted and written to `submission_failures` (`stage: captcha`), because a rejected real repair is gone for good while a spam entry costs the moderation one click. A wrong API key therefore no longer looks like spam. Hard rejections stay hard: a definitive `success: false` (invalid, expired or reused solution — always HTTP 200) and a `400 bad_request`, because a script could provoke a 400 through the value it submits.
- The upload endpoint accepts only requests with Vercel headers `x-vercel-ip-country=DE` and `x-vercel-ip-country-region=NW`. It does not call a separate geo provider and does not store an IP address; successful entries store only the regional label `Nordrhein-Westfalen`.
- Requests with an unknown or inaccurate geo assignment are rejected with a VPN/proxy hint. This is deliberately fail-closed so that all accepted entries meet the participation rule.
- Use `GEOIP_ALLOW_LOCAL=true` only in `.env.local` while testing locally. This override is limited to `NODE_ENV=development` and must not be configured in Vercel.

## Deployment checks

Run these locally before pushing:

```powershell
npm run lint
npm run build
```

For the current landing-page-only state, Vercel can deploy without the service secrets because no server route reads them yet. Before enabling the upload route, every variable marked required for Preview and Production must be present.
