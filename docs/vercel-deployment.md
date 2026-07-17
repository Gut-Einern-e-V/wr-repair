# Vercel deployment

## First deployment

1. Import the `Gut-Einern-e-V/wr-repair` repository in Vercel.
2. Keep the detected framework preset **Next.js**. The default build command is `npm run build` and the default output configuration is correct.
3. Add the environment variables below in **Settings > Environment Variables**.
4. Create a deployment. Use its generated `vercel.app` URL as the temporary value for `NEXT_PUBLIC_SITE_URL` and deploy once more.
5. When the custom domain is live, update `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, the Supabase Authentication redirect URL, and the hCaptcha allowed hostnames. Deploy again.

Vercel provides `VERCEL`, `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_BRANCH_URL`, and `VERCEL_REGION` automatically. Do not create those variables manually.

## Environment variables

Copy `.env.example` to `.env.local` for local work. `.env.local` is intentionally ignored by Git. Set the real values in Vercel, never in a committed file.

| Variable | Visibility | Required environments | Source / purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public | Development, Preview, Production | Application URL. In Preview, use the relevant Vercel preview URL when testing redirects. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Development, Preview, Production | Supabase Dashboard > Connect > Project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Development, Preview, Production | Supabase Dashboard > Connect > Publishable key. This key is designed for browser use and is protected by RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Development, Preview, Production | Supabase Dashboard > Connect > Service role key. Server route handlers only; never use `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | Public | Preview, Production | hCaptcha site configuration. For local development, use hCaptcha's published test site key. |
| `HCAPTCHA_SECRET` | Secret | Preview, Production | Matching hCaptcha secret. Use the matching test secret locally. |
| `SUBMISSION_START_AT` | Secret | Preview, Production | Start of the validated participation window in ISO 8601 with timezone. |
| `SUBMISSION_END_AT` | Secret | Preview, Production | End of the validated participation window in ISO 8601 with timezone. |
| `GEOIP_API_URL` | Secret | Preview, Production | Chosen GDPR-reviewed server-side geo lookup endpoint. |
| `GEOIP_API_TOKEN` | Secret | Preview, Production | Credential for the chosen geo provider, if required. |
| `ALLOWED_ORIGINS` | Secret | Development, Preview, Production | Comma-separated allowed website origins for future API CORS checks. |

Do not set a `NODE_ENV` variable in Vercel. Next.js supplies `production` for builds and runtime automatically.

## Provider configuration

### Supabase

- Apply the versioned SQL migration in `supabase/migrations` to the Supabase project before enabling real submissions.
- Keep the `repair-images` bucket private. The planned Next.js API uses the service-role key after validation; browsers must not receive this key.
- In Supabase Authentication, add the local URL, the Vercel preview domain pattern and the production domain to the allowed redirect URLs before adding moderator login.

### hCaptcha and geo lookup

- Register all preview and production hostnames with hCaptcha before enabling the upload endpoint.
- Select and document a GDPR-reviewed geo provider before adding its token. The UI may deploy without this provider, but the public submission endpoint must remain disabled until the NRW check is implemented.

## Deployment checks

Run these locally before pushing:

```powershell
npm run lint
npm run build
```

For the current landing-page-only state, Vercel can deploy without the service secrets because no server route reads them yet. Before enabling the upload route, every variable marked required for Preview and Production must be present.
