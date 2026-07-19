# Deploying May & Jay to Cloudflare Workers (free tier)

This project runs as a single Cloudflare **Worker** (the newer unified
Workers + assets deploy path — not classic "Pages"). Since it's one Worker,
all auth/routing logic lives in `src/index.js`, and the static site lives in
`public/`.

## Project layout
```
public/index.html, login.html, script.js, style.css, data.js   <- static site
src/index.js   <- routes everything: auth gate, /api/login, /api/logout,
                  /api/items, /api/rate, then falls through to static assets
src/auth.js    <- shared cookie/HMAC helpers
wrangler.jsonc <- Worker config: assets directory + KV binding
```

## 1. Create a KV namespace
**Workers & Pages → KV → Create namespace** — call it e.g. `mj-library`.
Copy its **Namespace ID** (shown in the KV list).

## 2. Wire the KV ID into `wrangler.jsonc`
Open `wrangler.jsonc` and replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` with
the ID you copied. This file is what actually creates the binding on this
deploy path — the dashboard's "KV namespace bindings" UI you tried earlier
is for classic Pages projects and won't apply here.

## 3. Set the two secrets
Your Worker's dashboard page → **Settings → Variables and Secrets** → add:
- `SITE_PASSWORD` — the shared password. Add as **Secret** (encrypted).
- `COOKIE_SECRET` — a long random string (e.g. `openssl rand -hex 32`).
  Add as **Secret** too.

(If you're deploying via the CLI instead of the dashboard, you can set
these with `npx wrangler secret put SITE_PASSWORD` and
`npx wrangler secret put COOKIE_SECRET`.)

## 4. Push to GitHub
Commit all of the files above (`public/`, `src/`, `wrangler.jsonc`,
`package.json`) to your repo root and push. If your Worker is connected to
GitHub for auto-deploy, this triggers a new build automatically using
`wrangler deploy`.

## 5. Try it
Visit your site — you should land on `/login.html`. Enter `SITE_PASSWORD`.
The cookie lasts 30 days. Open any title → **Rate it** section writes
straight to the shared KV store, same as before.

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
- To rotate the password, change `SITE_PASSWORD`; rotate `COOKIE_SECRET`
  too if you want to force everyone to log back in immediately.
