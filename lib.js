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
// opts: { notice, defaultFrom, resendReady }
function adminPage(data, base, opts = {}) {
  const rows = Object.entries(data.recipients).map(([tok, r]) => {
    const clicks = data.clicks.filter((c) => c.token === tok);
    const last = clicks.length ? new Date(clicks[clicks.length - 1].at).toLocaleString() : "—";
    const sent = r.sentAt ? "✅" : "—";
    return `<tr>
      <td>${esc(r.label)}</td>
      <td style="text-align:center">${sent}</td>
      <td style="text-align:center">${clicks.length ? "✅ " + clicks.length : "—"}</td>
      <td>${esc(last)}</td>
      <td><a href="${base}/t/${tok}">/t/${tok}</a></td>
    </tr>`;
  }).join("");

  const totalRecipients = Object.keys(data.recipients).length;
  const totalSent = Object.values(data.recipients).filter((r) => r.sentAt).length;
  const totalClicked = Object.keys(data.recipients)
    .filter((t) => data.clicks.some((c) => c.token === t)).length;
  const rate = totalSent ? Math.round((totalClicked / totalSent) * 100) : 0;

  const defaultFrom = opts.defaultFrom || "IT Helpdesk <onboarding@resend.dev>";
  const defaultBody = `<p>Hi,</p>
<p>Your mailbox is almost full. Verify your account to avoid interruption:</p>
<p><a href="{{link}}">Review my mailbox</a></p>
<p>— IT Helpdesk</p>`;

  const notice = opts.notice
    ? `<div class="notice">${esc(opts.notice)}</div>`
    : "";
  const resendWarn = opts.resendReady
    ? ""
    : `<div class="notice warn">⚠️ RESEND_API_KEY is not set, so sending is disabled.
        Add it as an env var (and verify a sending domain in Resend), then redeploy.</div>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Training Dashboard</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; margin: 0; background: #0f172a;
         color: #e2e8f0; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 32px 20px; }
  h1 { font-size: 24px; } h2 { font-size: 16px; color: #cbd5e1; margin: 0 0 12px; }
  .stat { display: inline-block; background: #1e293b; border: 1px solid #334155;
          border-radius: 12px; padding: 14px 22px; margin: 0 10px 10px 0; }
  .stat b { font-size: 26px; display: block; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
  th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid #334155; }
  th { color: #94a3b8; font-weight: 600; }
  a { color: #7dd3fc; word-break: break-all; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px;
          padding: 18px; margin-top: 22px; }
  label { display:block; font-size: 13px; color:#cbd5e1; margin-bottom: 6px; }
  input, textarea { width: 100%; box-sizing: border-box; background: #0f172a;
          border: 1px solid #334155; color: #e2e8f0; padding: 9px 11px;
          border-radius: 8px; font-size: 14px; font-family: inherit; }
  textarea { resize: vertical; }
  button { background: #f59e0b; color: #1e1b06; border: 0; padding: 10px 18px;
           border-radius: 8px; font-weight: 700; cursor: pointer; margin-top: 12px; }
  .muted { color: #94a3b8; font-size: 13px; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .notice { background:#064e3b; border:1px solid #065f46; color:#d1fae5;
            border-radius:10px; padding:10px 14px; margin-top:16px; font-size:14px; }
  .notice.warn { background:#422006; border-color:#854d0e; color:#fde68a; }
  @media (max-width:640px){ .row{ grid-template-columns:1fr; } }
</style></head>
<body><div class="wrap">
  <h1>Phishing Training</h1>
  ${notice}${resendWarn}
  <div style="margin-top:16px">
    <span class="stat"><b>${totalRecipients}</b> recipients</span>
    <span class="stat"><b>${totalSent}</b> sent</span>
    <span class="stat"><b>${totalClicked}</b> clicked</span>
    <span class="stat"><b>${rate}%</b> click rate</span>
  </div>

  <div class="card">
    <h2>1 · Recipients</h2>
    <form method="POST" action="/admin/add">
      <label>Paste email addresses (one per line, or comma-separated)</label>
      <textarea name="labels" rows="4" placeholder="ama@example.com&#10;kwin@example.com" required></textarea>
      <button type="submit">Add recipients</button>
    </form>
    <table>
      <thead><tr><th>Recipient</th><th>Sent</th><th>Clicked</th><th>Last click</th><th>Link</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5" class="muted">No recipients yet.</td></tr>`}</tbody>
    </table>
  </div>

  <div class="card">
    <h2>2 · Compose &amp; send</h2>
    <form method="POST" action="/admin/send">
      <div class="row">
        <div><label>From (must be on a domain verified in Resend)</label>
          <input name="from" value="${esc(defaultFrom)}" required></div>
        <div><label>Subject</label>
          <input name="subject" value="Action needed: mailbox storage full" required></div>
      </div>
      <div style="margin-top:12px">
        <label>Email body (HTML) — use <code>{{link}}</code> for the tracking link and <code>{{email}}</code> for the address</label>
        <textarea name="body" rows="8" required>${esc(defaultBody)}</textarea>
      </div>
      <button type="submit" ${opts.resendReady ? "" : "disabled style='opacity:.5;cursor:not-allowed'"}>
        Send to all ${totalRecipients} recipients
      </button>
    </form>
    <p class="muted" style="margin-top:14px">
      Each recipient gets their own tracking link in place of <code>{{link}}</code>.
      Clicks log to the dashboard and show an educational page — no passwords are ever collected.
    </p>
  </div>
</div></body></html>`;
}

module.exports = { token, esc, learnPage, adminPage };
