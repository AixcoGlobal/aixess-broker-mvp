import test from "node:test";
import assert from "node:assert/strict";
import { analyticsApi } from "../worker/analytics.js";
import { tokenHash } from "../worker/admin-auth.js";
import { sqliteBinding } from "../scripts/local-analytics.mjs";

const origin = "https://example.test";
const setupKey = "a".repeat(64);
const password = "A unique test passphrase 2026!";
async function fixture(t) {
  const DB = sqliteBinding(); t.after(() => DB.close());
  const env = { DB, AUTH_PROVIDER: "sites", ADMIN_EMAILS: "owner@example.test", ADMIN_OWNER_EMAIL: "owner@example.test", ADMIN_SETUP_TOKEN_HASH: await tokenHash(setupKey), ADMIN_SETUP_EXPIRES_AT: String(Date.now() + 3600000), RATE_LIMIT_SALT: "test-salt" };
  const request = (action, body, headers = {}, method = body ? "POST" : "GET") => analyticsApi(new Request(`${origin}/api/admin/${action}`, { method, headers: { origin, "content-type": "application/json", ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) }), env);
  const setup = () => request("auth/setup", { password }, { "x-aixess-setup-key": setupKey });
  const login = async (value = password) => {
    const response = await request("auth/login", { email: "owner@example.test", password: value });
    return { response, cookie: response.headers.get("set-cookie")?.split(";")[0] };
  };
  return { DB, env, request, setup, login };
}

test("owner setup is protected and cannot be replayed or used as open signup", async (t) => {
  const { request, setup, DB } = await fixture(t);
  assert.deepEqual(await (await request("auth/state")).json(), { setupAvailable: false });
  assert.equal((await request("auth/setup", { password })).status, 403);
  const claimedOwner = { "oai-authenticated-user-id": "owner", "oai-authenticated-user-email": "owner@example.test" };
  assert.deepEqual(await (await request("auth/state", undefined, claimedOwner)).json(), { setupAvailable: false });
  assert.equal((await request("auth/setup", { password }, claimedOwner)).status, 403);
  assert.equal((await request("auth/sign-up", { password, email: "attacker@example.test" })).status, 404);
  const state = await (await request("auth/state", undefined, { "x-aixess-setup-key": setupKey })).json();
  assert.equal(state.setupAvailable, true); assert.equal(state.email, "owner@example.test");
  assert.equal((await request("auth/setup", { password: "short" }, { "x-aixess-setup-key": setupKey })).status, 400);
  const response = await setup(); assert.equal(response.status, 201);
  const body = await response.json(); assert.match(body.recoveryCode, /^[a-f0-9]{64}$/);
  const user = await DB.prepare("SELECT * FROM admin_users").first();
  assert.notEqual(user.password_hash, password); assert.match(user.password_hash, /^scrypt-v1\$/);
  assert.notEqual(user.recovery_hash, body.recoveryCode);
  assert.equal((await setup()).status, 409);
});

test("expired setup links fail closed", async (t) => {
  const { env, setup } = await fixture(t); env.ADMIN_SETUP_EXPIRES_AT = "1";
  assert.equal((await setup()).status, 403);
});

test("real password login, secure cookie and logout protect the dashboard", async (t) => {
  const { request, setup, login } = await fixture(t); await setup();
  assert.equal((await request("session")).status, 401);
  assert.equal((await request("session", undefined, { "oai-authenticated-user-id": "owner", "oai-authenticated-user-email": "owner@example.test" })).status, 401);
  assert.equal((await login("wrong password")).response.status, 401);
  const { response, cookie } = await login(); assert.equal(response.status, 200);
  for (const flag of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/", "__Host-aixess_admin="]) assert.ok(response.headers.get("set-cookie").includes(flag));
  assert.equal((await request("session", undefined, { cookie })).status, 200);
  assert.equal((await request("session", undefined, { cookie: `${cookie}f` })).status, 401);
  const logout = await request("auth/logout", {}, { cookie }); assert.equal(logout.status, 200); assert.ok(logout.headers.get("set-cookie").includes("Max-Age=0"));
  assert.equal((await request("session", undefined, { cookie })).status, 401);
});

test("idle and absolute session expiry are enforced by the server", async (t) => {
  const { DB, request, setup, login } = await fixture(t); await setup();
  let { cookie } = await login();
  await DB.prepare("UPDATE admin_sessions SET last_seen_at = ?").bind(Date.now() - 31 * 60000).run();
  assert.equal((await request("session", undefined, { cookie })).status, 401);
  ({ cookie } = await login());
  await DB.prepare("UPDATE admin_sessions SET expires_at = 1").run();
  assert.equal((await request("session", undefined, { cookie })).status, 401);
});

test("recovery rotates its one-time code and revokes every old session", async (t) => {
  const { request, setup, login } = await fixture(t);
  const { recoveryCode } = await (await setup()).json();
  const { cookie } = await login(); const nextPassword = "A different safe passphrase 2026!";
  assert.equal((await request("auth/recover", { email: "owner@example.test", password: nextPassword, recoveryCode: "b".repeat(64) })).status, 401);
  const recovered = await request("auth/recover", { email: "owner@example.test", password: nextPassword, recoveryCode });
  assert.equal(recovered.status, 200); assert.notEqual((await recovered.json()).recoveryCode, recoveryCode);
  assert.equal((await request("session", undefined, { cookie })).status, 401);
  assert.equal((await login()).response.status, 401);
  assert.equal((await login(nextPassword)).response.status, 200);
  assert.equal((await request("auth/recover", { email: "owner@example.test", password, recoveryCode })).status, 401);
});

test("cross-origin authentication writes are blocked", async (t) => {
  const { request } = await fixture(t);
  for (const action of ["setup", "login", "logout", "recover"]) assert.equal((await request(`auth/${action}`, { password }, { origin: "https://evil.test" })).status, 403);
});

test("too many attempts are rejected before expensive hashing", async (t) => {
  const { DB, request } = await fixture(t);
  for (let i = 0; i < 20; i++) await request("auth/login", { password: "" });
  assert.equal((await request("auth/login", { email: "owner@example.test", password })).status, 429);
  const limits = (await DB.prepare("SELECT * FROM request_limits").all()).results;
  assert.ok(limits.every((row) => /^[a-f0-9]{64}$/.test(row.key)));
});
