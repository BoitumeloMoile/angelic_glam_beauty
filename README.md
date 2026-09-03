# Bloom & Co. Nail Studio

A booking website for a nail salon: browse services, register/log in, pick an
open appointment slot on a calendar, and pay a small non-refundable deposit
to confirm the booking.

**Stack:** plain HTML/CSS/JS frontend · [Supabase](https://supabase.com) for
auth + database · [Stripe](https://stripe.com) for the deposit payment ·
[Netlify](https://netlify.com) for hosting + serverless functions.

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
   account**, and a **[Stripe](https://stripe.com) account** (Stripe is free to create;
   you only get charged fees when real payments run through it, and test mode is
   entirely free).

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
git remote add origin https://github.com/YOUR-USERNAME/bloom-and-co.git
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
     created_at timestamptz default now()
   );

   alter table appointments enable row level security;

   create policy "Users can view their own appointments"
     on appointments for select using (auth.uid() = user_id);

   create policy "Users can create their own appointments"
     on appointments for insert with check (auth.uid() = user_id);
   ```
5. In **Project Settings → API**, also copy the **service_role key** (different from
   the anon key — keep this one secret, you'll only use it in Netlify's environment
   variables, never in frontend code).

That's Login/Register and the appointments table working. Test it: open
`register.html` with Live Server, create an account, and check **Authentication →
Users** in Supabase to confirm it appeared.

---

## 4. Set up Stripe (deposit payment)

1. At [stripe.com](https://stripe.com), create an account. Stay in **Test mode**
   (toggle top-right) while you build.
2. Go to **Developers → API keys**. Copy the **Publishable key** and **Secret key**
   (test mode versions). You won't need the publishable key for this setup since
   Checkout is hosted entirely by Stripe — just the secret key, used server-side.
3. You'll add the secret key as an environment variable in Netlify in the next step.

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
   | `STRIPE_SECRET_KEY` | your Stripe test secret key |
   | `STRIPE_WEBHOOK_SECRET` | (added in the next sub-step) |
   | `SITE_URL` | your Netlify site URL, e.g. `https://bloom-and-co.netlify.app` |
4. Deploy the site. Once it's live, go back to **Stripe → Developers → Webhooks →
   Add endpoint**. Set the URL to:
   ```
   https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook
   ```
   Select the event `checkout.session.completed`. Stripe will show you a **signing
   secret** — copy it into Netlify's `STRIPE_WEBHOOK_SECRET` environment variable
   and redeploy.

---

## 6. Test the full flow

1. Open your live Netlify URL.
2. Register a new account, log in.
3. Go to **Book**, pick a service and a time slot on the calendar.
4. Click **Pay deposit & confirm** — you'll land on Stripe's test checkout.
5. Use Stripe's test card: `4242 4242 4242 4242`, any future expiry, any CVC.
6. After paying, check your Supabase **Table Editor → appointments** — the row's
   `status` should flip from `pending` to `confirmed` within a few seconds (that's
   the webhook firing).

When you're ready to accept real payments, switch Stripe out of test mode, swap
in your live secret key, and update the webhook endpoint with your live signing
secret.

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
│   ├── create-checkout-session.js    Starts Stripe Checkout
│   └── stripe-webhook.js               Confirms booking after payment
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
