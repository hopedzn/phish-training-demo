# Phishing-awareness training demo

A tiny, zero-dependency click-tracking demo for a **security-awareness class**, plus a
walkthrough of **GoPhish** for running the real thing.

> **Scope / ethics.** This is for *authorised* awareness training only. It tracks
> clicks and shows an educational page. It does **not** capture passwords, does **not**
> impersonate any real company's login, and does **not** hide what it is. Keep it that
> way — clicks are the metric that matters for training, and credential harvesting turns
> a drill into real phishing.

---

## Part 1 — The local demo

### Run it

```bash
node server.js
```

Then open **http://localhost:3000/admin**.

### Use it

1. In the dashboard, type a recipient label (a name or email) and click **Generate link**.
2. Copy the generated `…/t/<token>` link and paste it into an email **you** send.
3. When someone clicks, they see the educational "this was a training test" page, and
   the dashboard records the click + timestamp.
4. Refresh `/admin` to see the running **click rate**.

### How it maps to a real phishing test

| Piece | This demo | Real exercise |
|---|---|---|
| Per-recipient link | `/t/<token>` | unique token per person so clicks are attributable |
| Click logging | `data.json` | a database |
| The "reveal" | `/learn` page | educational landing page |
| Delivery | you paste the link into your own email | a mail server / the tool sends it |

### What to change for your class

- **Hosting:** `localhost` only works on your own computer. To send links to a class,
  deploy to Vercel — see **Part 1b** below.
- **Landing page:** edit `learnPage()` in `lib.js` to add your name/class and your
  org's reporting instructions (shared by both local and Vercel).
- **Lock down `/admin`:** it's open in the demo. Put it behind a password before exposing
  it (ask me and I'll add basic auth).

---

## Part 1b — Deploy to Vercel

Vercel is serverless, so two things differ from the local run:

- The app runs as a function (`api/index.js`), not a long-running server.
- There's no writable disk, so clicks are stored in **Upstash Redis** (free tier)
  instead of `data.json`.

### Steps

1. **Push this folder to a Git repo** (GitHub/GitLab) and **Import** it in Vercel, *or*
   from this folder run:
   ```bash
   npx vercel        # first deploy (preview)
   npx vercel --prod # production
   ```
2. **Add a Redis store.** In the Vercel dashboard → your project → **Storage** →
   **Marketplace** → **Upstash for Redis** → create a database and **Connect** it to the
   project. This auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` as env vars.
3. **Redeploy** (Vercel does this automatically after connecting the store, or run
   `npx vercel --prod` again) so the function picks up the env vars.
4. Open `https://<your-project>.vercel.app/admin`, generate links, and send them.

> The code reads `KV_REST_API_URL`/`KV_REST_API_TOKEN` first, then falls back to
> `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` — so either naming works.

### Test locally against the same code path

`vercel dev` runs the serverless function locally and pulls the linked env vars:

```bash
npx vercel dev   # serves api/index.js on http://localhost:3000
```

(Plain `node server.js` still works offline with the file store, for quick checks.)

---

## Part 2 — Doing it properly with GoPhish

For an actual class exercise with real emails and a proper dashboard, use
[**GoPhish**](https://getgophish.com) — the open-source standard for phishing
simulations. It's free and self-hosted.

### 1. Install

Download the release for your OS from <https://github.com/gophish/gophish/releases>,
unzip, and run:

```bash
./gophish
```

First run prints an **admin URL (https://127.0.0.1:3333)** and a one-time password in the
terminal — log in and change it.

### 2. The five building blocks

GoPhish splits a campaign into pieces you configure once and reuse:

1. **Sending Profile** — the SMTP server the emails go out through (your own test mail
   server, or an SMTP relay you're authorised to use). Send yourself a test first.
2. **Groups** — your recipient list (name + email), imported from CSV.
3. **Email Template** — the training email body. Insert `{{.URL}}` where the link goes
   and `{{.FirstName}}` to personalise. **Keep it benign** — a generic notice, not a
   clone of a real company's login email.
4. **Landing Page** — what people see after clicking. For *click-only* training, use a
   simple "⚠️ this was a training test, here's what to look for" page.
   - **Do not** tick *"Capture Submitted Data" / "Capture Passwords."* That's credential
     harvesting; you don't need it and it raises the stakes a lot. Clicks are enough.
5. **Campaign** — ties the four together and launches. GoPhish adds a unique tracking
   token per recipient automatically.

### 3. Read the results

The campaign dashboard shows, per recipient: **Email Sent → Opened → Clicked Link →
(Submitted Data)**, with a timeline and an overall click rate — exactly the "how many
clicked" number you asked for.

### 4. Ground rules for an authorised exercise

- Get **written sign-off** from whoever owns the people you're testing (instructor,
  manager, IT).
- Use a domain you own for the links — don't register look-alikes of real brands.
- Brief people *afterwards*; the goal is teaching, not catching anyone out.
- Keep logs private — who-clicked-what is sensitive.

---

## Files

- `lib.js` — shared page rendering + helpers (used by both entrypoints).
- `server.js` — local runner; long-running server + `data.json` file store.
- `api/index.js` — Vercel serverless function; Upstash Redis store.
- `vercel.json` — rewrites all paths to the function.
- `package.json` — the one dependency (`@upstash/redis`, only needed on Vercel).
- `data.json` — created locally at runtime; safe to delete to reset.
