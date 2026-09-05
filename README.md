# Angelic Glam Beauty Bar

A booking website for a nail salon: browse services, register/log in, pick an
open appointment slot on a calendar, and pay a small non-refundable deposit
to confirm the booking.

**Stack:** plain HTML/CSS/JS frontend · [Supabase](https://supabase.com) for
auth + database · [PayFast](https://www.payfast.co.za) for the deposit payment
(ZAR-native — Stripe doesn't support payouts to South African-registered
businesses) · [Netlify](https://netlify.com) for hosting + serverless functions.

---

## 0. Install the tools (one-time setup)

1. **[VS Code](https://code.visualstudio.com/)** — install it, then install these extensions
   (Extensions icon in the left sidebar, search by name):
   - **Live Server** (by Ritwick Dey) — preview HTML with auto-refresh
   - **Prettier** — auto-formats your code
   - **ESLint** — catches JS mistakes
2. **[Node.js](https://nodejs.org/)** — install the LTS version. This gives you `npm`,
   which you'll need for the serverless functions. Verify it worked by opening a terminal
   (VS Code: Terminal → New Terminal) and running:
   ```
   node -v
   npm -v
   ```
3. **[Git](https://git-scm.com/downloads)** — needed to push to GitHub. Verify with:
   ```
   git -v
   ```
4. **A free [GitHub](https://github.com) account** if you don't have one.
5. **A free [Netlify](https://netlify.com) account**, a free **[Supabase](https://supabase.com)
   account**, and a free **[PayFast](https://www.payfast.co.za) account**. You'll
   also want a free **[PayFast Sandbox](https://sandbox.payfast.co.za) account** for
   testing — it's a separate signup from your live account and lets you test payments
   with a dummy wallet, no real money involved.

---

## 1. Open the project in VS Code

Unzip this project, then in VS Code: **File → Open Folder** → select the
`nail-salon-app` folder.

Right-click `index.html` in the file explorer → **Open with Live Server** to preview
the site in your browser as you edit. Right now the pages will load, but Login,
Register, and Booking won't actually work yet — that's what the next steps wire up.

---

## 2. Push it to GitHub

In the VS Code terminal, from inside the project folder:

```bash
git init
git add .
git commit -m "Initial project scaffold"
```

Then create a new **empty** repository on GitHub (no README, no .gitignore — you
already have one), copy the commands GitHub shows you under "…or push an existing
repository", and run them. It'll look like:

```bash
git remote add origin https://github.com/YOUR-USERNAME/angelic-glam-beauty-bar.git
git branch -M main
git push -u origin main
```

From now on, whenever you save progress: `git add .` → `git commit -m "message"` → `git push`.

---

## 3. Set up Supabase (auth + database)

1. At [supabase.com](https://supabase.com), create a new project (pick any name/region,
   set a database password and save it somewhere).
2. Once it's ready, go to **Project Settings → API**. Copy the **Project URL** and the
   **anon public key**.
3. Open `js/supabaseClient.js` in VS Code and paste them in:
   ```js
   const SUPABASE_URL = 'https://your-project-id.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```
4. Go to the **SQL Editor** in Supabase and run this to create the appointments table:
   ```sql
   create table appointments (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references auth.users not null,
     service text not null,
     start_time timestamptz not null,
     status text default 'pending', -- pending | confirmed | cancelled
     deposit_paid boolean default false,
     inspo_photo_urls jsonb default '[]', -- up to 2 client-uploaded reference photo URLs
     created_at timestamptz default now()
   );

   alter table appointments enable row level security;

   create policy "Users can view their own appointments"
     on appointments for select using (auth.uid() = user_id);

   create policy "Users can create their own appointments"
     on appointments for insert with check (auth.uid() = user_id);
   ```
5. Clients can attach up to 2 inspiration photos when booking, so create a storage
   bucket for them: **Storage → New bucket**, name it `inspo-photos`, and toggle
   **Public bucket** on (this lets you view the photos via a plain URL). Then, back
   in the **SQL Editor**, add a policy so people can only upload into their own
   folder within it:
   ```sql
   create policy "Users can upload their own inspo photos"
     on storage.objects for insert
     with check (
       bucket_id = 'inspo-photos'
       and (storage.foldername(name))[1] = auth.uid()::text
     );
   ```
6. In **Project Settings → API**, also copy the **service_role key** (different from
   the anon key — keep this one secret, you'll only use it in Netlify's environment
   variables, never in frontend code).

That's Login/Register and the appointments table working. Test it: open
`register.html` with Live Server, create an account, and check **Authentication →
Users** in Supabase to confirm it appeared.

---

## 4. Set up PayFast (deposit payment)

1. Go to [sandbox.payfast.co.za](https://sandbox.payfast.co.za) and register for a
   free sandbox account — this is separate from your live PayFast account and is
   what you'll build and test against first.
2. In the sandbox dashboard, go to **Settings → Merchant Details** and copy your
   **Merchant ID** and **Merchant Key**. (You can also just use PayFast's public
   test credentials while building: Merchant ID `10000100`, Merchant Key
   `46f0cd694581a`.)
3. Go to **Settings → Account Information** and set a **Passphrase**. This is a
   secret string PayFast uses to sign requests so nobody can tamper with the
   payment amount in transit — you'll set the same passphrase on your server.
4. You'll add the Merchant ID, Merchant Key, and Passphrase as environment
   variables in Netlify in the next step. When you're ready to accept real
   payments, repeat this signup at [payfast.co.za](https://www.payfast.co.za) for
   a live account and swap in those credentials.

---

## 5. Deploy to Netlify and connect everything

1. Push your latest code to GitHub (step 2).
2. At [netlify.com](https://netlify.com): **Add new site → Import an existing project**
   → connect GitHub → pick your repo. Netlify will detect `netlify.toml` automatically.
3. Before deploying, go to **Site settings → Environment variables** and add:
   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service_role key |
   | `PAYFAST_MERCHANT_ID` | your PayFast (sandbox, to start) Merchant ID |
   | `PAYFAST_MERCHANT_KEY` | your PayFast (sandbox, to start) Merchant Key |
   | `PAYFAST_PASSPHRASE` | the passphrase you set in PayFast |
   | `PAYFAST_MODE` | `sandbox` while testing, `live` once you go live |
   | `SITE_URL` | your Netlify site URL, e.g. `https://angelic-glam-beauty-bar.netlify.app` |
4. Deploy the site. PayFast doesn't require you to register the ITN (notification)
   URL in a dashboard the way Stripe does with webhooks — instead, the server code
   in `netlify/functions/create-payment.js` sends it along as a `notify_url`
   parameter with every payment request, pointing to:
   ```
   https://YOUR-SITE.netlify.app/.netlify/functions/payfast-itn
   ```

---

## 6. Test the full flow

1. Open your live Netlify URL.
2. Register a new account, log in.
3. Go to **Book**, pick a service and a time slot on the calendar.
4. Click **Pay deposit & confirm** — you'll land on PayFast's sandbox checkout page.
5. Sandbox payments use a dummy wallet (reset to a large balance every night) instead
   of a real card — click **Pay Now Using Your Wallet** to simulate a successful payment.
6. After paying, check your Supabase **Table Editor → appointments** — the row's
   `status` should flip from `pending` to `confirmed` within a few seconds (that's
   the ITN firing). You can also check **ITN** in your PayFast sandbox dashboard to
   see the notification PayFast sent.

When you're ready to accept real payments, sign up for a live PayFast account,
swap `PAYFAST_MODE` to `live` and update the Merchant ID/Key/Passphrase in Netlify
with your live credentials.

---

## Project structure

```
nail-salon-app/
├── index.html              Home page
├── about.html               Services & pricing
├── login.html                Log in
├── register.html              Create account
├── appointments.html           Booking calendar + deposit checkout
├── policy.html                  Terms & deposit policy
├── css/style.css                 Shared design system
├── js/
│   ├── supabaseClient.js          Supabase connection config
│   ├── auth.js                     Login/register form logic
│   └── booking.js                   Calendar + checkout trigger
├── netlify/functions/
│   ├── create-payment.js          Holds the slot, builds signed PayFast fields
│   └── payfast-itn.js               Confirms booking after PayFast payment
├── netlify.toml
└── package.json
```

## Next steps / ideas

- Add a "My appointments" page for logged-in users (query Supabase for
  `appointments` where `user_id = current user`).
- Block out slots that are already `confirmed` so clients can't double-book
  (partially wired up in `booking.js` — `loadBookedSlots()` needs the real query).
- Add email confirmations via Supabase Edge Functions or a service like Resend.
- Replace the placeholder policy text with your actual terms — consider having
  them reviewed before publishing.
