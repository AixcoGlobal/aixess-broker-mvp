import assert from "node:assert/strict";
import test from "node:test";
import { analyticsApi, normalizeEvent } from "../worker/analytics.js";
import { sqliteBinding } from "../scripts/local-analytics.mjs";
import { tokenHash } from "../worker/admin-auth.js";

const origin = "https://example.test";
const approved = { "oai-authenticated-user-id": "verified-site-user", "oai-authenticated-user-email": "owner@example.test" };
const event = (type = "page_view", session = crypto.randomUUID()) => ({ id: crypto.randomUUID(), session, type, page: "home", locale: "en", device: "mobile", detail: {} });
const lead = () => ({ id: crypto.randomUUID(), name: "Test Contact", email: "contact@example.test", privacyAccepted: true, locale: "en" });
function setup(t) {
  const DB = sqliteBinding();
  t.after(() => DB.close());
  const env = { DB, AUTH_PROVIDER: "sites", ADMIN_EMAILS: "owner@example.test", RATE_LIMIT_SALT: "unit-test-only" };
  return { DB, env, authorize: async () => {
    const token = "f".repeat(64); const now = Date.now();
    await DB.prepare("INSERT INTO admin_users VALUES ('owner', 'owner@example.test', 'test-fixture', 'test-fixture', 1, ?, ?)").bind(now, now).run();
    await DB.prepare("INSERT INTO admin_sessions VALUES (?, 'owner', 1, ?, ?, ?)").bind(await tokenHash(token), now, now, now + 3600000).run();
    return { cookie: `__Host-aixess_admin=${token}` };
  }, request: (path, body, options = {}) => analyticsApi(new Request(`${origin}${path}`, { method: body === undefined ? "GET" : "POST", ...(body !== undefined ? { body: JSON.stringify(body) } : {}), ...options, headers: { origin, "content-type": "application/json", ...options.headers } }), env) };
}

test("admin APIs deny anonymous, non-admin and unverified email-only requests", async (t) => {
  const { request } = setup(t);
  for (const headers of [{}, { ...approved, "oai-authenticated-user-email": "visitor@example.test" }, { "oai-authenticated-user-email": approved["oai-authenticated-user-email"] }]) {
    for (const path of ["session", "overview", "leads"]) assert.equal((await request(`/api/admin/${path}`, undefined, { headers })).status, 401);
  }
});

test("password sessions require the allowlist but are independent of ChatGPT", async (t) => {
  const { env, request, authorize } = setup(t);
  const headers = await authorize();
  env.ADMIN_EMAILS = "";
  assert.equal((await request("/api/admin/session", undefined, { headers })).status, 401);
  env.ADMIN_EMAILS = "owner@example.test"; env.AUTH_PROVIDER = "unknown";
  assert.equal((await request("/api/admin/session", undefined, { headers })).status, 200);
});

test("events require opt-in and reject foreign-origin requests", async (t) => {
  const { request, DB } = setup(t);
  assert.equal((await request("/api/events", { consent: false, events: [event()] })).status, 400);
  assert.equal((await request("/api/events", { consent: true, events: [event()] }, { headers: { origin: "https://evil.test" } })).status, 403);
  assert.equal((await DB.prepare("SELECT COUNT(*) AS n FROM analytics_events").first()).n, 0);
});

test("whitelist strips personal data and rejects unsupported events and admin-page tracking", () => {
  const value = event(); value.detail = { floor: 9, unit: "901", email: "private@example.test", password: "secret", url: "https://example.test/?private=1" }; value.ip = "192.0.2.1";
  const normalized = normalizeEvent(value);
  assert.deepEqual(JSON.parse(normalized.detail), { floor: 9, unit: "901" });
  assert.equal(normalized.ip, undefined);
  assert.equal(normalizeEvent({ ...value, page: "admin" }), null);
  assert.equal(normalizeEvent({ ...value, type: "password_input" }), null);
});

test("events are durable, deduplicated and use server timestamps", async (t) => {
  const { request, DB } = setup(t);
  const value = { ...event(), created: 1 };
  const body = { consent: true, events: [value] };
  assert.equal((await request("/api/events", body)).status, 200);
  assert.equal((await request("/api/events", body)).status, 200);
  const rows = (await DB.prepare("SELECT * FROM analytics_events").all()).results;
  assert.equal(rows.length, 1); assert.ok(rows[0].created_at > Date.now() - 10000);
});

test("event payload limits and malformed bodies are enforced", async (t) => {
  const { request } = setup(t);
  for (const body of [null, [], { consent: true, events: Array.from({ length: 21 }, () => event()) }, { consent: true, events: [null] }, { padding: "a".repeat(17000) }]) assert.equal((await request("/api/events", body)).status, 400);
});

test("lead submission works without analytics consent and is idempotent", async (t) => {
  const { request, DB } = setup(t);
  const body = lead();
  assert.equal((await request("/api/leads", body)).status, 201);
  assert.equal((await request("/api/leads", body)).status, 201);
  assert.equal((await DB.prepare("SELECT COUNT(*) AS n FROM leads").first()).n, 1);
  assert.equal((await DB.prepare("SELECT COUNT(*) AS n FROM analytics_events").first()).n, 0);
});

test("lead validation, acknowledgement and bot trap reject invalid submissions", async (t) => {
  const { request } = setup(t);
  for (const patch of [{ name: "" }, { email: "wrong" }, { privacyAccepted: false }, { website: "spam" }, { name: "x".repeat(121) }]) assert.equal((await request("/api/leads", { ...lead(), ...patch })).status, 400);
});

test("lead endpoint applies an hourly abuse limit", async (t) => {
  const { request } = setup(t);
  for (let i = 0; i < 10; i++) assert.equal((await request("/api/leads", lead())).status, 201);
  assert.equal((await request("/api/leads", lead())).status, 429);
});

test("aggregations reconcile actual events, sessions, demand and saved leads", async (t) => {
  const { request, authorize } = setup(t); const approved = await authorize(); const session = crypto.randomUUID();
  const values = [event("page_view", session), event("portal_login_click", session), event("lead_submitted", session), { ...event("floor_open", session), detail: { floor: 9 } }, { ...event("residence_open", session), detail: { unit: "901" } }];
  await request("/api/events", { consent: true, events: values }); await request("/api/leads", lead());
  const response = await request("/api/admin/overview?days=7", undefined, { headers: approved });
  assert.equal(response.status, 200); const body = await response.json();
  assert.equal(body.sessions, 1); assert.equal(body.leads, 1); assert.equal(body.convertedSessions, 1);
  assert.equal(body.trend[0].views, 1); assert.deepEqual(body.floors, [{ label: 9, count: 1 }]);
  assert.deepEqual(body.units, [{ label: "901", count: 1 }]);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("lead status changes and deletion require admin access and same-origin writes", async (t) => {
  const { request, authorize } = setup(t); const approved = await authorize(); const body = lead(); await request("/api/leads", body);
  const path = `/api/admin/leads/${body.id}`;
  assert.equal((await request(path, { status: "qualified" }, { method: "PATCH" })).status, 401);
  assert.equal((await request(path, { status: "qualified" }, { method: "PATCH", headers: { ...approved, origin: "https://evil.test" } })).status, 403);
  assert.equal((await request(path, { status: "invalid" }, { method: "PATCH", headers: approved })).status, 400);
  assert.equal((await request(path, { status: "qualified" }, { method: "PATCH", headers: approved })).status, 200);
  const listing = await (await request("/api/admin/leads?status=qualified", undefined, { headers: approved })).json();
  assert.equal(listing.total, 1); assert.equal(listing.rows[0].status, "qualified");
  assert.equal((await request(path, undefined, { method: "DELETE", headers: approved })).status, 200);
  assert.equal((await (await request("/api/admin/leads", undefined, { headers: approved })).json()).total, 0);
});

test("data retention removes expired records without removing current data", async (t) => {
  const { request, DB, env } = setup(t);
  const body = lead(); await request("/api/leads", body);
  await DB.prepare("UPDATE leads SET created_at = ?").bind(Date.now() - 366 * 86400000).run();
  await request("/api/events", { consent: true, events: [event()] });
  await DB.prepare("UPDATE analytics_events SET created_at = ?").bind(Date.now() - 91 * 86400000).run();
  const jobs = [];
  await analyticsApi(new Request(`${origin}/api/events`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ consent: true, events: [event()] }) }), env, { waitUntil: (job) => jobs.push(job) });
  await Promise.all(jobs);
  assert.equal((await DB.prepare("SELECT COUNT(*) AS n FROM leads").first()).n, 0);
  assert.equal((await DB.prepare("SELECT COUNT(*) AS n FROM analytics_events").first()).n, 1);
});
