#!/usr/bin/env node
/**
 * Single entrypoint for BOTH local and Vercel.
 *
 * Vercel's Node-server detection runs this file directly (it listens on
 * process.env.PORT and receives real paths), so there is no vercel.json
 * rewrite and no separate api/ function to get out of sync.
 *
 * Storage:
 *   - If Upstash Redis env vars are present (on Vercel) -> Redis (persists).
 *   - Otherwise (local) -> a data.json file.
 *
 * Run locally:  node server.js   ->   http://localhost:3000/admin
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { token, learnPage, adminPage } = require("./lib");

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

// --- storage: Redis on Vercel, file locally ------------------------------
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

let redis = null;
if (useRedis) {
  const { Redis } = require("@upstash/redis");
  redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
}

async function loadData() {
  if (useRedis) {
    const [recipients, clicks] = await Promise.all([
      redis.hgetall("recipients"),
      redis.lrange("clicks", 0, -1),
    ]);
    return { recipients: recipients || {}, clicks: clicks || [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { recipients: {}, clicks: [] };
  }
}

async function addRecipient(label) {
  const tok = token();
  const rec = { label, created: new Date().toISOString() };
  if (useRedis) {
    await redis.hset("recipients", { [tok]: rec });
  } else {
    const d = await loadData();
    d.recipients[tok] = rec;
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
  }
  return tok;
}

async function getRecipient(tok) {
  if (useRedis) return await redis.hget("recipients", tok);
  const d = await loadData();
  return d.recipients[tok];
}

async function addClick(click) {
  if (useRedis) {
    await redis.rpush("clicks", click);
  } else {
    const d = await loadData();
    d.clicks.push(click);
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
  }
}

async function updateRecipient(tok, patch) {
  if (useRedis) {
    const cur = (await redis.hget("recipients", tok)) || {};
    await redis.hset("recipients", { [tok]: { ...cur, ...patch } });
  } else {
    const d = await loadData();
    if (d.recipients[tok]) {
      d.recipients[tok] = { ...d.recipients[tok], ...patch };
      fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
    }
  }
}

// --- Resend email transport ----------------------------------------------
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM;

async function sendEmail({ from, to, subject, html }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// --- helpers --------------------------------------------------------------
function send(res, status, type, body) {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => resolve(b));
  });
}

// --- server ---------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const proto = req.headers["x-forwarded-proto"] || "http";
    const u = new URL(req.url, `${proto}://${host}`);
    let pathname = u.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    const base = `${proto}://${host}`;

    // 1. Click tracking: /t/:token
    if (req.method === "GET" && pathname.startsWith("/t/")) {
      const tok = pathname.slice(3);
      const recip = await getRecipient(tok);
      if (recip) {
        await addClick({
          token: tok,
          at: new Date().toISOString(),
          ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
          ua: req.headers["user-agent"] || "",
        });
      }
      res.writeHead(302, { Location: `/learn?l=${encodeURIComponent(recip ? recip.label : "")}` });
      return res.end();
    }

    // 2. Educational landing page
    if (req.method === "GET" && pathname === "/learn") {
      return send(res, 200, "text/html; charset=utf-8", learnPage(u.searchParams.get("l") || ""));
    }

    // 3. Admin dashboard
    if (req.method === "GET" && (pathname === "/admin" || pathname === "/")) {
      const opts = {
        notice: u.searchParams.get("notice") || "",
        defaultFrom: RESEND_FROM || undefined,
        resendReady: !!RESEND_API_KEY,
      };
      return send(res, 200, "text/html; charset=utf-8", adminPage(await loadData(), base, opts));
    }

    // 4. Add recipients (bulk: one per line or comma-separated)
    if (req.method === "POST" && pathname === "/admin/add") {
      const raw = new URLSearchParams(await readBody(req)).get("labels") || "";
      const labels = raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).slice(0, 500);
      for (const label of labels) await addRecipient(label.slice(0, 120));
      const msg = `Added ${labels.length} recipient(s).`;
      res.writeHead(302, { Location: `/admin?notice=${encodeURIComponent(msg)}` });
      return res.end();
    }

    // 5. Send the campaign to all recipients via Resend
    if (req.method === "POST" && pathname === "/admin/send") {
      if (!RESEND_API_KEY) {
        res.writeHead(302, { Location: `/admin?notice=${encodeURIComponent("RESEND_API_KEY not set — sending disabled.")}` });
        return res.end();
      }
      const p = new URLSearchParams(await readBody(req));
      const from = (p.get("from") || "").trim();
      const subject = (p.get("subject") || "").trim();
      const bodyTpl = p.get("body") || "";
      const data = await loadData();
      let sent = 0, failed = 0, firstErr = "";
      for (const [tok, r] of Object.entries(data.recipients)) {
        const link = `${base}/t/${tok}`;
        const html = bodyTpl.split("{{link}}").join(link).split("{{email}}").join(r.label);
        try {
          await sendEmail({ from, to: r.label, subject, html });
          await updateRecipient(tok, { sentAt: new Date().toISOString() });
          sent++;
        } catch (e) {
          failed++;
          if (!firstErr) firstErr = String((e && e.message) || e);
        }
      }
      const msg = `Sent ${sent}${failed ? `, ${failed} failed — ${firstErr}` : ""}.`;
      res.writeHead(302, { Location: `/admin?notice=${encodeURIComponent(msg)}` });
      return res.end();
    }

    send(res, 404, "text/plain", `Not found: ${req.method} ${pathname}`);
  } catch (err) {
    send(res, 500, "text/plain", "Server error: " + (err && err.message ? err.message : "unknown"));
  }
});

server.listen(PORT, () => {
  console.log(`\n  Phishing-training demo (${useRedis ? "Redis" : "file"} store):`);
  console.log(`  Dashboard  ->  http://localhost:${PORT}/admin\n`);
});
