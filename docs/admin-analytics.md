# Admin analytics

The Sites-hosted app uses Cloudflare D1 for events, enquiries and dedicated AiXESS admin accounts. Open `/#admin` and sign in with your admin email and password. The server requires a valid opaque session cookie and an allowlisted account. ChatGPT identity alone does not grant dashboard access.

Runtime settings (Sites environment variables, not VITE-prefixed client variables):

- `AUTH_PROVIDER`: retained for the local development setup adapter, never for production dashboard authorization or account setup.
- `ADMIN_EMAILS`: explicit comma-separated admin emails; an empty list denies everyone.
- `RATE_LIMIT_SALT`: a random secret used for short-lived abuse-prevention hashes.
- `ADMIN_OWNER_EMAIL`: email provisioned by the protected first-owner setup.
- `ADMIN_SETUP_TOKEN_HASH`: SHA-256 of a random 256-bit private setup key. Never put the raw key in source or the database.
- `ADMIN_SETUP_EXPIRES_AT`: setup-link expiry in Unix milliseconds. Once the owner account exists, every setup link is disabled regardless of expiry.

The first admin is the configured site owner. There is no public signup or arbitrary email provisioning. Production setup requires the private expiring setup key; platform identity headers cannot provision an account. The key is passed in a request header, not a query parameter, and is removed from the browser URL immediately. Other admin accounts require a separate explicitly approved provisioning workflow; changing the email allowlist alone does not create an account. Site sharing and app authorization are separate controls.

## Login and recovery

Passwords are salted and hashed with `@noble/hashes` scrypt using N=32768, r=8, p=3 and a 32-byte derived key. This uses the [OWASP 32 MiB scrypt configuration](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). The Worker bounds concurrent KDF memory rather than reducing hashing strength. Setup/recovery require 15–128-character passwords; passwords are never logged or included in analytics.

Successful logins issue an opaque 256-bit `__Host-aixess_admin` cookie with HttpOnly, Secure, SameSite=Strict and Path=/. Only its SHA-256 hash is stored in D1. Sessions have an eight-hour absolute limit and a 30-minute authenticated-request inactivity limit. Background dashboard requests while visible count as activity. Logout revokes the current session; recovery increments the credential version and revokes every old session. Every admin API validates the session and current email allowlist. State-changing requests also require an exact same-origin Origin header.

Failed attempts are limited by salted hourly network and account keys. Login failures use the same response for unknown accounts and wrong passwords. A server-side memory guard rejects concurrent KDF operations with a retry response.

Setup shows a private single-use recovery code. Save it in a password manager. The Forgot password flow requires the admin email and this code; it does not pretend to send email. Recovery rotates the code and displays the replacement once. If both password and recovery code are lost, a separately authorised operator recovery is necessary; there is no automatic ChatGPT dashboard bypass.

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

The Vite development server uses `.data/analytics.sqlite`, which is gitignored. Set `LOCAL_ADMIN_EMAIL` in the server process for loopback-only first-owner setup. It no longer grants dashboard access without a password. Remote development requests cannot inject admin identity headers. Local HTTP uses a separate development cookie name; production always requires the Secure host-only cookie.

Run `npm run test:analytics`, `npm test`, `npm run build`, and `npm run test:sites`. Generated Drizzle migrations ship under `dist/.openai/drizzle`. Never rewrite an applied migration.

The Vercel configuration remains a static frontend; its hosting alone does not provide these D1 endpoints or verified identity headers. Deploy this server-backed version to Sites. A future Vercel deployment needs an explicit secure backend integration before enabling the same features there; API errors must never be presented as saved leads.
