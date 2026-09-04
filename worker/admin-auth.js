import { scryptAsync } from "@noble/hashes/scrypt.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

const SESSION_LIFETIME = 8 * 3600000;
const IDLE_LIFETIME = 30 * 60000;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 3, dkLen: 32, maxmem: 48 * 1024 * 1024 };
const TOKEN = /^[a-f0-9]{64}$/;
let hashing = false;
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...headers } });
const randomToken = () => bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
const allowed = (env, email) => (env.ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).includes(email);
const emailValue = (value) => typeof value === "string" && value.length <= 254 ? value.trim().toLowerCase() : "";
const cookieName = (env) => env.LOCAL_PREVIEW ? "aixess_admin_dev" : "__Host-aixess_admin";
function cookie(env, token, maxAge = SESSION_LIFETIME / 1000) {
  return `${cookieName(env)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${env.LOCAL_PREVIEW ? "" : "; Secure"}`;
}
function sessionToken(request, env) {
  const value = (request.headers.get("cookie") || "").split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`${cookieName(env)}=`))?.slice(cookieName(env).length + 1);
  return TOKEN.test(value || "") ? value : null;
}
export async function tokenHash(token) { return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)))); }
function equalHex(a, b) { if (a.length !== b.length) return false; let difference = 0; for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i); return difference === 0; }
function validPassword(password) {
  return typeof password === "string" && [...password].length >= 15 && [...password].length <= 128 && !/^(.)\1+$/.test(password) && !["123456789012345", "passwordpassword", "qwertyuiopasdfgh", "letmeinletmeinletmein"].includes(password.toLowerCase());
}
export async function passwordHash(password, salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)))) {
  // Bound concurrent KDF memory within a 128 MB Worker isolate. No weaker fallback.
  if (hashing) { const error = new Error("Please retry in a moment."); error.status = 429; throw error; }
  hashing = true;
  try { return `scrypt-v1$${salt}$${bytesToHex(await scryptAsync(password, hexToBytes(salt), SCRYPT_OPTIONS))}`; }
  finally { hashing = false; }
}
async function passwordMatches(password, encoded) {
  const [version, salt, hash] = (encoded || "").split("$");
  const valid = version === "scrypt-v1" && /^[a-f0-9]{32}$/.test(salt || "") && TOKEN.test(hash || "");
  const calculated = await passwordHash(password, valid ? salt : "0".repeat(32));
  return valid && equalHex(calculated, encoded);
}

export async function sessionAdmin(request, env) {
  const token = sessionToken(request, env);
  if (!token) return null;
  const now = Date.now();
  const row = await env.DB.prepare("SELECT u.id, u.email, u.credential_version, s.token_hash, s.last_seen_at FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id AND u.credential_version = s.credential_version WHERE s.token_hash = ? AND s.expires_at > ? AND s.last_seen_at > ?").bind(await tokenHash(token), now, now - IDLE_LIFETIME).first();
  if (!row || !allowed(env, row.email)) return null;
  if (now - row.last_seen_at > 60000) await env.DB.prepare("UPDATE admin_sessions SET last_seen_at = ? WHERE token_hash = ?").bind(now, row.token_hash).run();
  return { id: row.id, email: row.email, credentialVersion: row.credential_version };
}

async function startSession(env, user) {
  const token = randomToken(); const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= ? OR last_seen_at <= ?").bind(now, now - IDLE_LIFETIME),
    env.DB.prepare("INSERT INTO admin_sessions (token_hash, user_id, credential_version, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)").bind(await tokenHash(token), user.id, user.credential_version, now, now, now + SESSION_LIFETIME),
  ]);
  return cookie(env, token);
}

async function setupAllowed(request, env, ownerIdentity) {
  const owner = env.LOCAL_PREVIEW ? ownerIdentity(request, env) : null;
  if (owner) return owner.email;
  const key = request.headers.get("x-aixess-setup-key") || "";
  const expires = Number(env.ADMIN_SETUP_EXPIRES_AT);
  if (!TOKEN.test(key) || !TOKEN.test(env.ADMIN_SETUP_TOKEN_HASH || "") || !(expires > Date.now())) return null;
  if (!equalHex(await tokenHash(key), env.ADMIN_SETUP_TOKEN_HASH)) return null;
  // This setup path provisions only the explicitly configured owner, not arbitrary signup.
  return emailValue(env.ADMIN_OWNER_EMAIL) || null;
}

export async function adminAuthApi(request, env, { bodyJson, rateLimit, ownerIdentity }) {
  const path = new URL(request.url).pathname;
  if (request.method === "GET" && path === "/api/admin/auth/state") {
    const existing = await env.DB.prepare("SELECT id FROM admin_users LIMIT 1").first();
    const setupEmail = !existing ? await setupAllowed(request, env, ownerIdentity) : null;
    return json({ setupAvailable: Boolean(setupEmail && allowed(env, setupEmail)), ...(setupEmail ? { email: setupEmail } : {}) });
  }
  if (request.method !== "POST") return json({ error: "Not found" }, 404);
  if (path === "/api/admin/auth/logout") {
    const token = sessionToken(request, env);
    if (token) await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await tokenHash(token)).run();
    return json({ signedOut: true }, 200, { "set-cookie": cookie(env, "", 0) });
  }
  if (!["/api/admin/auth/login", "/api/admin/auth/setup", "/api/admin/auth/recover"].includes(path)) return json({ error: "Not found" }, 404);
  if (!await rateLimit(request, env, "admin-auth", 20)) return json({ error: "Too many attempts. Please try again later." }, 429);
  const body = await bodyJson(request);
  if (typeof body.password !== "string" || [...body.password].length > 128 || !body.password) return json({ error: "Check your email and password." }, 400);
  if (path === "/api/admin/auth/setup") {
    const email = await setupAllowed(request, env, ownerIdentity);
    if (!email || !allowed(env, email)) return json({ error: "A valid owner setup link is required." }, 403);
    if (await env.DB.prepare("SELECT id FROM admin_users LIMIT 1").first()) return json({ error: "Admin setup is already complete. Please sign in." }, 409);
    if (!validPassword(body.password)) return json({ error: "Use a unique password or passphrase between 15 and 128 characters." }, 400);
    const password = await passwordHash(body.password); const recovery = randomToken();
    const result = await env.DB.prepare("INSERT OR IGNORE INTO admin_users (id, email, password_hash, recovery_hash, credential_version, created_at, password_changed_at) VALUES ('owner', ?, ?, ?, 1, ?, ?)").bind(email, password, await tokenHash(recovery), Date.now(), Date.now()).run();
    if (!result.meta.changes) return json({ error: "Admin setup is already complete. Please sign in." }, 409);
    return json({ email, recoveryCode: recovery }, 201);
  }
  const email = emailValue(body.email);
  // A global per-account limit also slows distributed credential guessing.
  if (!await rateLimit(new Request(request.url, { headers: { "cf-connecting-ip": email } }), env, "admin-account", 30)) return json({ error: "Too many attempts. Please try again later." }, 429);
  const user = await env.DB.prepare("SELECT * FROM admin_users WHERE email = ?").bind(email).first();
  if (path === "/api/admin/auth/login") {
    const matches = await passwordMatches(body.password, user?.password_hash);
    if (!matches || !user || !allowed(env, email)) return json({ error: "Email or password is incorrect." }, 401);
    const sessionCookie = await startSession(env, user);
    return json({ signedIn: true, email }, 200, { "set-cookie": sessionCookie });
  }
  const recovery = typeof body.recoveryCode === "string" ? body.recoveryCode.replace(/\s/g, "").toLowerCase() : "";
  if (!user || !allowed(env, email) || !TOKEN.test(recovery) || !equalHex(await tokenHash(recovery), user.recovery_hash)) return json({ error: "Email or recovery code is incorrect." }, 401);
  if (!validPassword(body.password)) return json({ error: "Use a unique password or passphrase between 15 and 128 characters." }, 400);
  const nextPassword = await passwordHash(body.password); const nextRecovery = randomToken();
  const updated = await env.DB.prepare("UPDATE admin_users SET password_hash = ?, recovery_hash = ?, credential_version = credential_version + 1, password_changed_at = ? WHERE id = ? AND recovery_hash = ? RETURNING id").bind(nextPassword, await tokenHash(nextRecovery), Date.now(), user.id, user.recovery_hash).first();
  if (!updated) return json({ error: "This recovery code has already been used." }, 401);
  await env.DB.prepare("DELETE FROM admin_sessions WHERE user_id = ?").bind(user.id).run();
  return json({ email, recoveryCode: nextRecovery, passwordChanged: true }, 200, { "set-cookie": cookie(env, "", 0) });
}
