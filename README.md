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

`server.js` is the single entrypoint. Vercel detects it and runs it directly
(no `vercel.json` rewrite, no separate `api/` function). The only difference
from local is storage:

- **Locally** (no Redis env vars): clicks go to a `data.json` file.
- **On Vercel** (filesystem is read-only): clicks go to **Upstash Redis** (free tier),
  selected automatically when the Redis env vars are present.

### Steps

1. **Deploy** — push this folder to a Git repo and **Import** it in Vercel, *or* run
   from this folder:
   ```bash
   npx vercel --prod
   ```
2. **Add a Redis store.** Create an Upstash Redis database (Vercel **Storage** tab →
   Marketplace → Upstash for Redis, or at upstash.com) and set its REST credentials as
   project env vars — either naming works:
   ```bash
   npx vercel env add UPSTASH_REDIS_REST_URL   production   # paste the REST URL
   npx vercel env add UPSTASH_REDIS_REST_TOKEN production   # paste the REST token
   ```
   (The code also accepts `KV_REST_API_URL` / `KV_REST_API_TOKEN`, which Vercel's
   Upstash Marketplace integration injects automatically.)
3. **Redeploy** so the running app picks up the env vars:
   ```bash
   npx vercel --prod --force
   ```
4. Open `https://<your-project>.vercel.app/admin`, generate links, and send them.

> If `/admin` loads but **generating a link returns a 500 (`EROFS … data.json`)**, the
> Redis env vars aren't set — the app fell back to the read-only file store. Re-check
> step 2 and redeploy.

### Local test against Redis

`node server.js` uses the file store. To exercise the Redis path locally, export the
same two env vars first:

```bash
UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... node server.js
```

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

- `server.js` — the whole app (single entrypoint for local **and** Vercel); routes all
  paths and picks Redis-or-file storage automatically.
- `lib.js` — shared page rendering + helpers.
- `package.json` — the one dependency (`@upstash/redis`, used when env vars are present).
- `data.json` — created locally at runtime; safe to delete to reset.
