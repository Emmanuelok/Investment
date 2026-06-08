# Deploying PANTHEON to Vercel

PANTHEON is a standard **Next.js 15** app — zero special configuration. Every
route is statically prerendered (~103–106 kB First Load JS), so it deploys and
loads fast anywhere. Pick whichever path is easiest.

## Option A — One-click import (no token needed) ✅ easiest

1. Go to **https://vercel.com/new**
2. **Import** the GitHub repo `Emmanuelok/Investment`
3. Branch: `claude/gracious-faraday-5py7hv` (or merge to `main` first)
4. Framework preset auto-detects **Next.js** — leave defaults
5. **Deploy.** You get a live `*.vercel.app` URL in ~60s.

No environment variables are required (the UI runs on the demo fabric). To light
up live data later, add the keys from `.env.example` in Vercel → Settings →
Environment Variables.

## Option B — Vercel CLI (one command)

```bash
# from the repo root, after `npm install`
npx vercel@latest --prod
```

The first run links the project (prompts for scope/name) and then deploys. For a
non-interactive / CI deploy, use a token:

```bash
npx vercel@latest --prod --yes --token "$VERCEL_TOKEN"
```

`npm run deploy` is wired to the token-based prod deploy.

## Build settings (auto-detected — listed for reference)

| Setting | Value |
|---|---|
| Framework | Next.js |
| Install | `npm install` |
| Build | `next build` |
| Output | `.next` (managed by Vercel) |
| Node | ≥ 20 |

## Notes

- `next.config.mjs` sets light security headers and skips ESLint during the
  build (TypeScript strict remains the source of truth — the build type-checks).
- `src/lib/site.ts` resolves the public origin from `NEXT_PUBLIC_SITE_URL` →
  `VERCEL_URL` → localhost, so `sitemap.xml`/`robots.txt` are correct on Vercel
  automatically.
