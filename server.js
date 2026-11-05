#!/usr/bin/env node
/**
 * LOCAL runner — long-running Node server with a JSON-file store.
 * Good for offline testing on your own machine.
 * For hosting (Vercel), see api/index.js + README.
 *
 * Run:  node server.js   ->   http://localhost:3000/admin
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { token, learnPage, adminPage } = require("./lib");

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { recipients: {}, clicks: [] };
  }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function send(res, status, type, body) {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const base = `http://${req.headers.host}`;
  let pathname = u.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  const data = loadData();

  // 1. Click tracking: /t/:token
  if (req.method === "GET" && pathname.startsWith("/t/")) {
    const tok = pathname.slice(3);
    const recip = data.recipients[tok];
    if (recip) {
      data.clicks.push({
        token: tok,
        at: new Date().toISOString(),
        ip: req.socket.remoteAddress,
        ua: req.headers["user-agent"] || "",
      });
      saveData(data);
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
    return send(res, 200, "text/html; charset=utf-8", adminPage(data, base));
  }

  // 4. Add a recipient (generate a token)
  if (req.method === "POST" && pathname === "/admin/add") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const label = (new URLSearchParams(body).get("label") || "").trim().slice(0, 120);
      if (label) {
        data.recipients[token()] = { label, created: new Date().toISOString() };
        saveData(data);
      }
      res.writeHead(302, { Location: "/admin" });
      res.end();
    });
    return;
  }

  send(res, 404, "text/plain", `Not found: ${req.method} ${pathname}`);
});

server.listen(PORT, () => {
  console.log(`\n  Phishing-training demo (local):`);
  console.log(`  Dashboard  ->  http://localhost:${PORT}/admin`);
  console.log(`  (Ctrl+C to stop)\n`);
});
