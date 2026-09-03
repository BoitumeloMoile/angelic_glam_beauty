# Angelic Glam beauty bar

A booking website for a nail salon: browse services, register/log in, pick an
open appointment slot on a calendar, and pay a small non-refundable deposit
to confirm the booking.

**Stack:** plain HTML/CSS/JS frontend · [Supabase](https://supabase.com) for
auth + database · [PayFast](https://www.payfast.co.za) for the deposit payment
(ZAR-native — Stripe doesn't support payouts to South African-registered
businesses) · [Netlify](https://netlify.com) for hosting + serverless functions.

---

## 0. Install the tools (one-time setup)

1. **[Node.js](https://nodejs.org/)** — install the LTS version. This gives you `npm`,
   which you'll need for the serverless functions. Verify it worked by opening a terminal
   (VS Code: Terminal → New Terminal) and running:
   ```
   node -v
   npm -v
   ```
2. **A free [GitHub](https://github.com) account** if you don't have one.
3. **A free [Netlify](https://netlify.com) account**, a free **[Supabase](https://supabase.com)
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

## Project structure

```
nail salon-app/
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
│   ├── create-checkout-session.js    Currently Stripe — needs rewriting for PayFast
│   └── stripe-webhook.js               Currently Stripe — needs rewriting as an ITN handler
├── netlify.toml
└── package.json
```

