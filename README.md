# HFSE Events Hub

Next.js app for event registration and event monitoring, hosted on Vercel, with data in Supabase. It replaces the Cloudflare Worker in `../source`.

| Old | New |
| --- | --- |
| Cloudflare R2 records | Supabase Postgres |
| Cloudflare R2 files | Private Supabase Storage bucket |
| Hosting platform's login header | Supabase Auth, plus the `hfse_events_hub_event_admins` table |

## 1. Create the database

1. Create a Supabase project, or use an existing one. Everything this app creates is prefixed: tables and the function start with `hfse_events_hub_`, and the storage bucket is `hfse-events-hub-files`. For a new project, choose a Singapore region if your PDPA review requires local storage.
2. In the Supabase SQL editor, run `supabase/migrations/0001_schema.sql`, then `supabase/migrations/0002_app.sql`.
3. Under **Authentication > Providers > Email**, turn off public sign-ups so only people you add have accounts. Sign-ups and logins apply to the whole project, so if other apps share it, check they don't rely on public sign-ups. A signed-up account still can't reach the workspace unless it's listed in `hfse_events_hub_event_admins`.
4. Copy `.env.example` to `.env` and fill it in from **Project Settings > API**.

## 2. Load data and add the first administrator

```sh
npm install
npm run db:seed
npm run db:add-admin -- person@example.com
```

- `db:seed` loads the 47 starter events. Re-running it never overwrites existing records.
- `db:add-admin` prints a generated password once. Add `--reset-password` to replace a forgotten one.

## 3. Run locally

```sh
npm run dev
```

Open http://localhost:3000.

## 4. Deploy to Vercel

1. Push this folder to a Git repository and import it into Vercel. If the repository also holds the old source, set **Root Directory** to `web`.
2. Add the three values from `.env.example` under **Settings > Environment Variables**. Never prefix the service role key with `NEXT_PUBLIC_`.
3. Deploy to a staging URL first and work through the acceptance checks in `../README_IT_HANDOVER.md`.

## Before going live

- **Limit registration abuse.** `/api/register` is public and has no rate limit yet. Add a Vercel Firewall rate-limit rule for it.
- **Have IT review the migrations**, as the handover document requires.
- **Turn on backups.** Check what your Supabase plan includes, because the database will hold parents' personal data.

The database starts fresh with the 47 starter events. Live data from the old site is not being migrated.

## Microsoft sign-in

The login page offers email and password, and Microsoft. Supabase handles the Microsoft side through its `azure` provider.

1. In Supabase, turn on the Azure provider under **Authentication > Providers**, using an app registered in Microsoft Entra ID. Its redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Under **Authentication > URL Configuration**, add each site's callback to **Redirect URLs**, for example `http://localhost:3000/auth/callback**`. Without this, Supabase sends people to the project's Site URL instead.
3. Grant access with `npm run db:add-admin -- person@example.com`. A Microsoft account alone doesn't grant access.

## How access works

- Public: `/`, `/attendees`, `GET /api/portal`, `POST /api/register`.
- Everything else needs a signed-in user listed in `hfse_events_hub_event_admins`. Both the `administrator` and `controller` roles currently have full access.
- The browser never reads tables directly. Row-level security is on with no policies, and server routes use the service role key after checking access.
- Files upload straight to Supabase with a short-lived signed URL, because Vercel limits function request bodies to about 4.5 MB. Downloads also use short-lived signed URLs, issued after an access check.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm test` | Validation and deadline-rule tests |
| `npm run typecheck` | TypeScript check |
| `npm run db:seed` | Load starter events |
| `npm run db:add-admin -- <email> [administrator\|controller] [--reset-password]` | Grant access |
