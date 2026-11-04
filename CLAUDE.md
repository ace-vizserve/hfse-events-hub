# HFSE Events Hub (Next.js app)

Parents register for school events through a public portal. Staff track each event's nine milestones, evidence files and attendance. Next.js 16 App Router on Vercel, with Supabase for Postgres, Auth and Storage. Setup and deployment steps are in `README.md`.

## Commands

Run from `web/`.

```sh
npm run dev        # needs .env
npm run build
npm run typecheck
npm test           # unit tests for validation and deadline rules
npm run db:seed
npm run db:add-admin -- person@example.com [administrator|controller] [--reset-password]
```

There is no end-to-end suite in this repo. After changing routes, data access or SQL, also run the app and exercise the change.

## Layout

- `app/(admin)/`: staff pages. `app/attendees`, `app/login` and `app/page.tsx` are the public ones.
- `app/auth/callback/`: finishes Microsoft sign-in. It only starts the session; access still needs a row in `hfse_events_hub_event_admins`.
- `app/api/`: route handlers, wrapped in `publicRoute` or `adminRoute` from `lib/api.ts`.
- `components/`: client components. `Workspace.tsx` holds the overview, events table, deadline tracker and calendar views.
- `lib/shared.ts`: types and business rules used by both server and browser.
- `lib/validate.ts`: request validation.
- `lib/data.ts`: all database access. It maps database rows to the API's field names.
- `lib/authorization.ts`: session and admin checks.
- `proxy.ts`: refreshes the session cookie. Next.js 16 uses this name instead of `middleware.ts`.
- `supabase/migrations/`: SQL, pasted into the Supabase SQL editor in order.

## Security rules

- **Access checks:** `createServiceClient()` bypasses row-level security. Staff API routes must use `adminRoute`, and staff pages must call `requireAdminPage` themselves, because layouts don't re-run on navigation.
- **Actor identity:** take `updatedBy` and `checkedBy` from the verified session (`admin.email`), never from the request.
- **Old login header:** never accept `oai-authenticated-user-email`. It was only trustworthy on the old host.
- **Service role key:** it must never be imported into browser code or given a `NEXT_PUBLIC_` prefix.
- **Personal data:** registrations hold parent, student and phone details, protected under PDPA. `/api/portal` returns a fixed list of safe fields, so don't add owners, milestones or attendee data to it.
- **Evidence files:** keep the bucket private and use short-lived signed URLs.

## Database rules

- **Naming:** tables and functions start with `hfse_events_hub_`, and the bucket is `hfse-events-hub-files`. The project may be shared with other apps.
- **Shared project safety:** grant and revoke on named tables only, never `all tables in schema public`.
- **New functions:** they are executable by `PUBLIC` by default and exposed by the Data API, so revoke that and grant only `service_role`.
- **Schema changes:** add a new numbered migration once a file has been applied to a real database.
- **Saving events:** multi-table writes go through the `hfse_events_hub_save_event` transaction, which also records history.
- **Reading rows:** use `fetchAll` in `lib/data.ts` for lists. The Data API silently caps responses at 1,000 rows by default.
- **Seeding:** `db:seed` is a one-time setup step and must not run as part of a deployment.

## Conventions and limits

- **Dates:** the API uses `YYYY-MM-DD` strings and `''` for no date, while the database uses `null`. Deadlines are calculated in Singapore time, and `fmt` formats in UTC so server and browser output match.
- **Uploads:** browsers send files straight to Supabase with a signed URL, because Vercel limits function request bodies to about 4.5 MB. Don't route uploads through an API handler.
- **Server-only imports:** `lib/shared.ts` and `lib/validate.ts` must stay free of `server-only` and `@/` imports, because `npm test` runs them directly in Node.
- **UI:** `app/globals.css` is carried over from the original app. Reuse its classes rather than adding a CSS framework.
- **Milestones:** every event has exactly nine, in positions 0 to 8.
- **Adult totals:** adults registered and submission counts are separate measures. Don't treat adults as total participants.
- **Email:** the app sends no email. The confirmation screen says so, so don't advertise notifications until they exist.
