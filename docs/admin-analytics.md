# Admin analytics

The Sites-hosted app uses Cloudflare D1 for events and enquiries. Open `/#admin` and sign in with the approved ChatGPT account. The server requires both Sites' verified user ID and an allowlisted email. Keep the production `AUTH_PROVIDER=sites`; never expose this worker behind a proxy that forwards untrusted identity headers.

Runtime settings (Sites environment variables, not VITE-prefixed client variables):

- `AUTH_PROVIDER`: `sites`.
- `ADMIN_EMAILS`: explicit comma-separated admin emails; an empty list denies everyone.
- `RATE_LIMIT_SALT`: a random secret used for short-lived abuse-prevention hashes.

The first admin is the verified site owner. Other admins require explicit approval and their own authenticated accounts. Site sharing and app admin authorization are separate controls.

## Metrics and limitations

- Optional analytics only run after consent. They count page views, navigation, portal/contact/resource clicks, floor opens, apartment selections, enlarged plans and filter/language actions. Hover and pointer movement are not captured.
- Sessions are random per-tab IDs, expiring after 30 minutes of inactivity. They are not unique users. Page views count actual route views after consent; rejecting analytics removes queued events and the session ID.
- Workwise clicks are **not** successful logins, registrations or Workwise leads. Actual outcomes require a verified Workwise integration; none is configured.
- Materials enquiries are saved independently of optional analytics. Success is displayed only after server acknowledgement. Repeated retries with the same form ID are deduplicated. This does not automatically send email; admins must follow up from the dashboard.
- The reporting window is inclusive of today in UTC (7, 30 or 90 days). The lead pipeline covers all retained dates and is separately filtered by follow-up status.
- Empty means zero collected records, not a simulated dataset. Consent, network interruption, ad blockers and endpoint abuse can affect coverage. Client-side activity is a directional measurement, not an audited financial source.

## Privacy and retention

No passwords, free-text form contents, full URLs, advertising IDs, exact locations or raw IP addresses are stored as analytics. Event details are server-allowlisted. Leads store name, email, locale, request date and follow-up status. The required form acknowledgement is separate from optional analytics consent; no marketing subscription is created.

The local privacy choice lasts 180 days. Events older than 90 days and enquiries older than 365 days are purged on the next successful ingestion. Short-lived salted rate-limit hashes are also purged. Admins can delete a lead sooner with a confirmation. Historical aggregate event counts cannot be linked back to a person's email.

The privacy notice describes these defaults, hosting and Workwise boundaries. AIXCO should have its legal/privacy owner review the controller identity, provider arrangements, retention and jurisdiction-specific obligations before widening public access. This is not a blanket legal-compliance certification.

## Local development and verification

The Vite development server uses `.data/analytics.sqlite`, which is gitignored. Set `LOCAL_ADMIN_EMAIL` in the server process for explicit loopback-only development access. Remote development requests cannot inject admin identity headers. No production authentication bypass is bundled.

Run `npm run test:analytics`, `npm test`, `npm run build`, and `npm run test:sites`. Generated Drizzle migrations ship under `dist/.openai/drizzle`. Never rewrite an applied migration.

The Vercel configuration remains a static frontend; its hosting alone does not provide these D1 endpoints or verified identity headers. Deploy this server-backed version to Sites. A future Vercel deployment needs an explicit secure backend integration before enabling the same features there; API errors must never be presented as saved leads.
