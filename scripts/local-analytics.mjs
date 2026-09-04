import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { analyticsApi } from "../worker/analytics.js";

// Local-only D1 adapter. Production always uses the managed Sites DB binding.
export function sqliteBinding(filename = ":memory:") {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec("CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)");
  for (const name of readdirSync("drizzle").filter((file) => file.endsWith(".sql")).sort()) {
    if (!sqlite.prepare("SELECT name FROM _local_migrations WHERE name = ?").get(name)) {
      sqlite.exec("BEGIN");
      try {
        sqlite.exec(readFileSync(path.join("drizzle", name), "utf8"));
        sqlite.prepare("INSERT INTO _local_migrations (name) VALUES (?)").run(name);
        sqlite.exec("COMMIT");
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    }
  }
  const prepare = (sql) => {
    let args = [];
    const statement = sqlite.prepare(sql);
    const binding = {
      bind(...values) { args = values; return binding; },
      async first() { return statement.get(...args) || null; },
      async all() { return { results: statement.all(...args), success: true }; },
      async run() { return { meta: statement.run(...args), success: true }; },
      execute() { return statement.columns().length ? { results: statement.all(...args), success: true } : { meta: statement.run(...args), success: true }; },
    };
    return binding;
  };
  return { prepare, async batch(statements) { sqlite.exec("BEGIN"); try { const results = statements.map((stmt) => stmt.execute()); sqlite.exec("COMMIT"); return results; } catch (error) { sqlite.exec("ROLLBACK"); throw error; } }, close() { sqlite.close(); } };
}

export function localAnalytics() {
  return {
    name: "aixess-local-analytics",
    configureServer(server) {
      mkdirSync(".data", { recursive: true });
      const DB = sqliteBinding(".data/analytics.sqlite");
      server.httpServer?.once("close", () => DB.close());
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(",") : value);
        // Never trust caller-supplied platform identity in a local server.
        headers.delete("oai-authenticated-user-id"); headers.delete("oai-authenticated-user-email");
        const peer = req.socket.remoteAddress;
        const loopback = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(peer);
        const email = process.env.LOCAL_ADMIN_EMAIL;
        if (loopback && email) { headers.set("oai-authenticated-user-id", "local-development"); headers.set("oai-authenticated-user-email", email); }
        headers.set("cf-connecting-ip", peer || "local");
        try {
          const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers, ...(req.method !== "GET" && req.method !== "HEAD" ? { body: req, duplex: "half" } : {}) });
          const response = await analyticsApi(request, { DB, AUTH_PROVIDER: "sites", ADMIN_EMAILS: email || "", RATE_LIMIT_SALT: "local-development-only", LOCAL_PREVIEW: true });
          if (!response) return next();
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch { res.statusCode = 503; res.end("Service unavailable"); }
      });
    },
  };
}
