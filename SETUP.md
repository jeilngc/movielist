# Deploying May & Jay to Cloudflare Workers (free tier)

This project runs as a single Cloudflare **Worker** (the newer unified
Workers + assets deploy path — not classic "Pages"). Since it's one Worker,
all auth/routing logic lives in `src/index.js`, and the static site lives in
`public/`.

## Project layout
```
public/index.html, login.html, script.js, style.css, data.js   <- static site
public/manifest.json, sw.js, icons/                             <- PWA: install + offline + push
src/index.js   <- routes everything: auth gate, /api/login, /api/logout,
                  /api/items, /api/rate, /api/turn, /api/react, /api/push/*,
                  plus a scheduled() handler for the daily reminder cron,
                  then falls through to static assets
src/auth.js    <- shared cookie/HMAC helpers
src/push.js    <- Web Push sending (VAPID + payload encryption)
wrangler.jsonc <- Worker config: assets directory + KV binding + cron trigger
```

## 1. Create a KV namespace
**Workers & Pages → KV → Create namespace** — call it e.g. `mj-library`.
Copy its **Namespace ID** (shown in the KV list).

## 2. Wire the KV ID into `wrangler.jsonc`
Open `wrangler.jsonc` and replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` with
the ID you copied. This file is what actually creates the binding on this
deploy path — the dashboard's "KV namespace bindings" UI you tried earlier
is for classic Pages projects and won't apply here.

## 3. Set the secrets
Your Worker's dashboard page → **Settings → Variables and Secrets** → add:
- `SITE_PASSWORD_MAY` / `SITE_PASSWORD_JAY` — one password per person. Add
  both as **Secret** (encrypted).
- `COOKIE_SECRET` — a long random string (e.g. `openssl rand -hex 32`).
  Add as **Secret** too.

(If you're deploying via the CLI instead of the dashboard, you can set
these with `npx wrangler secret put SITE_PASSWORD_MAY`, `... SITE_PASSWORD_JAY`,
and `npx wrangler secret put COOKIE_SECRET`.)

## 4. Push to GitHub
Commit all of the files above (`public/`, `src/`, `wrangler.jsonc`,
`package.json`) to your repo root and push. If your Worker is connected to
GitHub for auto-deploy, this triggers a new build automatically using
`wrangler deploy`.

## 5. Try it
Visit your site — you should land on `/login.html`. Enter either password.
The cookie lasts 30 days. Open any title → **Rate it** section writes
straight to the shared KV store, same as before.

## 6. (Optional) Enable movie night push reminders
The app can send a push notification to both of you on the day a planned
title is due. This needs three more secrets and a one-time key pair:

1. Generate a VAPID key pair locally (this is a dev tool, it doesn't need
   to run on the Worker itself):
   ```
   npx web-push generate-vapid-keys
   ```
2. Set three more secrets:
   - `VAPID_PUBLIC_KEY` — the public key it printed
   - `VAPID_PRIVATE_KEY` — the private key it printed
   - `VAPID_SUBJECT` — a contact string push services require, e.g.
     `mailto:you@example.com`
   ```
   npx wrangler secret put VAPID_PUBLIC_KEY
   npx wrangler secret put VAPID_PRIVATE_KEY
   npx wrangler secret put VAPID_SUBJECT
   ```
3. Deploy. `wrangler.jsonc` already includes a daily Cron Trigger
   (`triggers.crons`, defaults to 13:00 UTC) that checks for anything
   planned for today and pushes a reminder — adjust the hour to whatever
   local time actually makes sense for you two.
4. In the app, tap **🔔 Remind us** in the navbar (only appears once the
   keys above are set) and allow notifications when your browser asks.
   Each of you needs to tap it once, on the device you want reminders on.

If a reminder never arrives, check the Worker's logs (`wrangler tail`)
around your cron time — the push-sending code (`src/push.js`) implements
the Web Push spec by hand (Workers can't run the usual `web-push` npm
package), and while it's written carefully against the spec, it hasn't
been exercised against a live push service in development. The
subscribe/unsubscribe endpoints and the service worker's notification
display are lower-risk, more conventional code if something needs
debugging.

## Why this looks different from a "classic Pages" setup
Cloudflare has two different deploy models that both live under
"Workers & Pages" in the dashboard:
- **Classic Pages** — static site + a `functions/` folder of small
  file-based route handlers (what we built first).
- **Workers with static assets** — a single Worker script (`src/index.js`)
  that manually handles all routing, with static files served via an
  `env.ASSETS` binding (what this version uses).

Your project turned out to be the second kind (the `wrangler deploy` in
your build log was the giveaway), so the `functions/` folder was silently
ignored — nothing was enforcing the password gate. This version does all of
that inside `src/index.js` instead.

## Notes / limitations
- Same "May" vs "Jay" UI-only toggle as before, same cookie flags
  (`HttpOnly` + `Secure` + `SameSite=Lax`).
- Free tier: 100K Worker requests/day, 100K KV reads/day, 1K KV
  writes/day, 1 GB KV storage — comfortably enough for two people.
  Cron Triggers are also included on the free tier.
- To rotate a password, change the matching `SITE_PASSWORD_MAY` /
  `SITE_PASSWORD_JAY`; rotate `COOKIE_SECRET` too if you want to force
  everyone to log back in immediately.
- "Pass the remote" and push subscriptions are stored under their own KV
  keys (`library:turn`, `push:may`, `push:jay`) alongside `library:items` —
  no schema change to your existing items array.
