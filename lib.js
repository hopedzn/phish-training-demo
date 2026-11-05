/**
 * Shared rendering + helpers used by both the local server (server.js)
 * and the Vercel serverless function (api/index.js).
 *
 * Storage is NOT here — each entrypoint plugs in its own store and passes a
 * plain `data` object of the shape:
 *   { recipients: { [token]: { label, created } }, clicks: [ { token, at, ip, ua } ] }
 */

const crypto = require("crypto");

function token() {
  return crypto.randomBytes(6).toString("hex"); // 12 hex chars
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// --- the educational landing page (the "reveal") --------------------------
function learnPage(label) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Security Training</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, sans-serif; margin: 0;
         background: #0f172a; color: #e2e8f0; line-height: 1.6; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 48px 20px; }
  .badge { display: inline-block; background: #f59e0b; color: #1e1b06;
           font-weight: 700; padding: 6px 12px; border-radius: 999px;
           font-size: 13px; letter-spacing: .3px; }
  h1 { font-size: 28px; margin: 20px 0 8px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 14px;
          padding: 24px; margin: 24px 0; }
  ul { padding-left: 20px; } li { margin: 8px 0; }
  .muted { color: #94a3b8; font-size: 14px; }
  code { background: #334155; padding: 2px 6px; border-radius: 6px; }
</style></head>
<body><div class="wrap">
  <span class="badge">⚠️ TRAINING EXERCISE</span>
  <h1>You clicked a simulated phishing link.</h1>
  <p>Don't worry — <strong>nothing was installed and no information was taken.</strong>
     This was a security-awareness test${label ? ` (<code>${esc(label)}</code>)` : ""}.
     In a real attack, this click could have led to a fake login page or malware.</p>

  <div class="card">
    <h2 style="margin-top:0">How to spot the next one</h2>
    <ul>
      <li><strong>Check the real link</strong> — hover before you click; the visible text can lie.</li>
      <li><strong>Mismatched or odd sender address</strong>, especially "reply-to" that differs.</li>
      <li><strong>Urgency &amp; pressure</strong> — "act now or your account is locked".</li>
      <li><strong>Unexpected attachments</strong> or requests for credentials.</li>
      <li><strong>When in doubt, don't click</strong> — open the site yourself from a bookmark.</li>
    </ul>
  </div>

  <p class="muted">Report suspicious emails to your security team. This exercise was
     run with your organisation's authorisation for training purposes.</p>
</div></body></html>`;
}

// --- the admin / dashboard page -------------------------------------------
function adminPage(data, base) {
  const rows = Object.entries(data.recipients).map(([tok, r]) => {
    const clicks = data.clicks.filter((c) => c.token === tok);
    const last = clicks.length ? new Date(clicks[clicks.length - 1].at).toLocaleString() : "—";
    return `<tr>
      <td>${esc(r.label)}</td>
      <td><a href="${base}/t/${tok}">${base}/t/${tok}</a></td>
      <td style="text-align:center">${clicks.length ? "✅ " + clicks.length : "—"}</td>
      <td>${esc(last)}</td>
    </tr>`;
  }).join("");

  const totalClicked = Object.keys(data.recipients)
    .filter((t) => data.clicks.some((c) => c.token === t)).length;
  const totalRecipients = Object.keys(data.recipients).length;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Training Dashboard</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; margin: 0; background: #0f172a;
         color: #e2e8f0; }
  .wrap { max-width: 900px; margin: 0 auto; padding: 32px 20px; }
  h1 { font-size: 24px; }
  .stat { display: inline-block; background: #1e293b; border: 1px solid #334155;
          border-radius: 12px; padding: 16px 24px; margin-right: 12px; }
  .stat b { font-size: 28px; display: block; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
  th, td { text-align: left; padding: 10px; border-bottom: 1px solid #334155; }
  th { color: #94a3b8; font-weight: 600; }
  a { color: #7dd3fc; word-break: break-all; }
  form { background: #1e293b; border: 1px solid #334155; border-radius: 12px;
         padding: 16px; margin-top: 24px; }
  input { background: #0f172a; border: 1px solid #334155; color: #e2e8f0;
          padding: 8px 10px; border-radius: 8px; font-size: 14px; }
  button { background: #f59e0b; color: #1e1b06; border: 0; padding: 9px 16px;
           border-radius: 8px; font-weight: 700; cursor: pointer; }
  .muted { color: #94a3b8; font-size: 13px; }
</style></head>
<body><div class="wrap">
  <h1>Phishing Training — Results</h1>
  <div>
    <span class="stat"><b>${totalRecipients}</b> links generated</span>
    <span class="stat"><b>${totalClicked}</b> clicked</span>
    <span class="stat"><b>${totalRecipients ? Math.round((totalClicked / totalRecipients) * 100) : 0}%</b> click rate</span>
  </div>

  <form method="POST" action="/admin/add">
    <label>Add recipient label (name or email), then paste the generated link into your own email:</label><br><br>
    <input name="label" placeholder="e.g. alice@example.com" size="30" required>
    <button type="submit">Generate link</button>
  </form>

  <table>
    <thead><tr><th>Recipient</th><th>Tracking link</th><th>Clicked</th><th>Last click</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="4" class="muted">No links yet — generate one above.</td></tr>`}</tbody>
  </table>

  <p class="muted" style="margin-top:24px">
    You send these links yourself. Each link logs a click and shows the trainee an
    educational page. No credentials are ever collected.
  </p>
</div></body></html>`;
}

module.exports = { token, esc, learnPage, adminPage };
