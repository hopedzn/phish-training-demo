# Running a phishing-awareness exercise for a class with GoPhish

Goal: **write one email, send it to the whole class, and see who clicked.**
GoPhish does all of this — sending, per-recipient tracking, and a results dashboard.

> **Authorised training only.** This is for a class that has consented to a security
> exercise as part of the course. Keep it **click-only**: an educational landing page, no
> password capture, and no impersonation of a real company's login. Debrief students
> afterwards — the point is to teach, not to catch anyone out.

---

## 0. What you need first

1. **A host students can reach.** GoPhish's "phishing server" has to be reachable from
   wherever your students open their mail, or the tracking links won't resolve. Two ways:
   - **A small VPS with a domain** (recommended) — e.g. a $5 droplet, with a domain like
     `learn.lantan.property` pointed at it. Clean and stable.
   - **Run locally + a tunnel** — run GoPhish on your laptop and expose the phishing
     port with a tunnel:
     ```bash
     cloudflared tunnel --url http://localhost:8080      # or: ngrok http 8080
     ```
     Use the public URL the tunnel prints as your landing URL (step 5).
2. **An SMTP account to send through.** GoPhish doesn't send mail itself — it relays
   through SMTP. Options:
   - **Google Workspace** (`lantan.property`): create an **App Password** for your
     account and use host `smtp.gmail.com:587`. (Workspace may flag phishing-styled mail;
     for an internal class it usually delivers. Keep volume low.)
   - A transactional relay you control (Mailgun / SendGrid / Postmark SMTP).

---

## 1. Install and start GoPhish

Download the release for your OS from
<https://github.com/gophish/gophish/releases>, unzip, and run:

```bash
./gophish
```

On first run the terminal prints the **admin URL** (`https://127.0.0.1:3333`) and a
**one-time admin password**. Log in and change it.

- **Admin server** (`:3333`) — where you build the campaign. Keep this private to you.
- **Phishing server** (`:80` / `:8080`) — serves the landing page and records clicks.
  This is the one that must be publicly reachable (the VPS or tunnel above).

---

## 2. Sending Profile (how mail goes out)

Admin UI → **Sending Profiles → New Profile**:

- **Name:** e.g. "Class SMTP"
- **From:** the address students will see, e.g. `IT Helpdesk <it@lantan.property>`
- **Host:** `smtp.gmail.com:587` (or your relay's host:port)
- **Username / Password:** your SMTP user + **App Password**
- Click **Send Test Email** to yourself and confirm it arrives before going further.

---

## 3. Group (your class list)

Admin UI → **Users & Groups → New Group**:

- Import a CSV with these headers:
  ```csv
  First Name,Last Name,Email,Position
  Ama,Mensah,ama@example.com,Student
  Kwin,Osei,kwin@example.com,Student
  ```
- Or add students one by one. The names let you personalise the email.

---

## 4. Email Template (the email you write)

Admin UI → **Email Templates → New Template**:

- **Subject:** your training email's subject (e.g. "Action needed: mailbox storage full").
- **Body:** write the email. Use these GoPhish variables:
  - `{{.FirstName}}` — personalises the greeting.
  - `{{.URL}}` — **the per-student tracking link.** Put it on the button/link students
    would click. GoPhish gives each recipient a unique URL automatically.
  - `{{.TrackingURL}}` / a tracking pixel is added for open-tracking (optional).
- Keep it **benign and generic** — do not paste a real company's exact login email or
  logo. A plausible generic notice is enough to teach the lesson.

Example body (HTML):
```html
<p>Hi {{.FirstName}},</p>
<p>Your mailbox is almost full. Verify your account to avoid interruption:</p>
<p><a href="{{.URL}}">Review my mailbox</a></p>
<p>— IT Helpdesk</p>
```

---

## 5. Landing Page (what they see after clicking)

Admin UI → **Landing Pages → New Page**:

- Make a simple **"⚠️ This was a training exercise"** page that explains the red flags
  (you can paste the HTML from this repo's `lib.js` `learnPage()` as a starting point).
- **Leave "Capture Submitted Data" and "Capture Passwords" UNCHECKED.** You don't need
  credentials — a click is the whole metric, and capturing passwords turns a drill into
  real phishing.

---

## 6. Campaign (send it)

Admin UI → **Campaigns → New Campaign**:

- **Name:** e.g. "Class exercise — Week 3"
- **Email Template:** the one from step 4
- **Landing Page:** the one from step 5
- **URL:** the **public** base URL of your phishing server (your VPS domain or the tunnel
  URL) — this is what `{{.URL}}` is built from, so it must be reachable by students.
- **Sending Profile:** step 2
- **Groups:** your class from step 3
- **Launch.**

---

## 7. See who clicked

Open the campaign dashboard. For each student you get a timeline:

**Email Sent → Email Opened → Clicked Link** (→ Submitted Data, which you left off).

The dashboard shows an overall **click rate** and a per-recipient breakdown — exactly the
"who clicked the email I sent them" view you wanted. Export to CSV for your records.

---

## Ground rules for the class

- Get the exercise **signed off** by the course owner / department.
- Use a domain you own for the links — never register a look-alike of a real brand.
- **Debrief** right after: show the red flags, make it a learning moment.
- Keep the results private; who-clicked-what is sensitive.
