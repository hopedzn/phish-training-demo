/**
 * Vercel serverless entrypoint.
 *
 * vercel.json rewrites ALL paths to this function. Storage is Upstash Redis
 * (free tier) so click data persists across serverless invocations — the
 * local file store in server.js does NOT survive on Vercel.
 *
 * Env vars (auto-injected by the Vercel "Upstash for Redis" Marketplace
 * integration): KV_REST_API_URL + KV_REST_API_TOKEN, or the UPSTASH_* names.
 */

const { Redis } = require("@upstash/redis");
const { token, learnPage, adminPage } = require("../lib");

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Load the whole dataset in the { recipients, clicks } shape lib.js expects.
async function loadData() {
  const [recipients, clicks] = await Promise.all([
    redis.hgetall("recipients"), // { token: {label, created} }  (JSON auto-parsed)
    redis.lrange("clicks", 0, -1), // [ {token, at, ip, ua}, ... ]
  ]);
  return { recipients: recipients || {}, clicks: clicks || [] };
}

function html(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(body);
}

module.exports = async (req, res) => {
  try {
    const host = req.headers.host;
    const base = `https://${host}`;
    const u = new URL(req.url, base);

    // 1. Click tracking: /t/:token
    if (req.method === "GET" && u.pathname.startsWith("/t/")) {
      const tok = u.pathname.slice(3);
      const recip = await redis.hget("recipients", tok);
      if (recip) {
        await redis.rpush("clicks", {
          token: tok,
          at: new Date().toISOString(),
          ip: req.headers["x-forwarded-for"] || "",
          ua: req.headers["user-agent"] || "",
        });
      }
      res.statusCode = 302;
      res.setHeader("Location", `/learn?l=${encodeURIComponent(recip ? recip.label : "")}`);
      return res.end();
    }

    // 2. Educational landing page
    if (req.method === "GET" && u.pathname === "/learn") {
      return html(res, 200, learnPage(u.searchParams.get("l") || ""));
    }

    // 3. Admin dashboard
    if (req.method === "GET" && (u.pathname === "/admin" || u.pathname === "/")) {
      return html(res, 200, adminPage(await loadData(), base));
    }

    // 4. Add a recipient
    if (req.method === "POST" && u.pathname === "/admin/add") {
      // Vercel pre-parses urlencoded bodies into req.body; fall back to raw read.
      let label = "";
      if (req.body && typeof req.body === "object") {
        label = req.body.label || "";
      } else {
        const raw = await new Promise((r) => {
          let b = "";
          req.on("data", (c) => (b += c));
          req.on("end", () => r(b));
        });
        label = new URLSearchParams(raw).get("label") || "";
      }
      label = label.trim().slice(0, 120);
      if (label) {
        await redis.hset("recipients", {
          [token()]: { label, created: new Date().toISOString() },
        });
      }
      res.statusCode = 302;
      res.setHeader("Location", "/admin");
      return res.end();
    }

    res.statusCode = 404;
    res.end("Not found");
  } catch (err) {
    res.statusCode = 500;
    res.end("Server error: " + (err && err.message ? err.message : "unknown"));
  }
};
