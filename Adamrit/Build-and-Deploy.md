# Build & Deploy — Adamrit

## npm scripts (`package.json`)

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build. Runs `check:finalbill` automatically via the wider build chain (see [[Known-Issues-and-Gotchas]]) |
| `npm run build:dev` | Vite build in `development` mode |
| `npm run preview` | Preview the built bundle locally |
| `npm run lint` | ESLint over the whole repo |
| `npm run check:finalbill` | **Pre-deploy guard.** Runs `scripts/check-finalbill-locked.cjs` to ensure `src/pages/FinalBill.tsx` matches the locked SHA256. Blocks the build if changed without explicit unlock. |
| `npm run verify:finalbill-lock` | Same gate, separate script (`scripts/verify-finalbill-lock.cjs`) |
| `npm run generate-types` | Regenerate `src/integrations/supabase/types.ts` from the Supabase schema (`ts-node scripts/generate-types.ts`) |
| `npm run tally:sync` | Export accounting ledger to Tally format (`scripts/sync-tally-export.js`) |
| `npm run tally:direct-sync` | Direct-sync variant (`scripts/tally-direct-sync.js`) |

## Build chain (Vercel)

`vite build` is the production build command. Vercel runs:

1. `npm install`
2. `npm run build` → Vite produces `dist/`
3. `dist/` is served as a static SPA

> Earlier commits show a `prebuild` script was removed because it was blocked by `.vercelignore` (commit `038c361`). FinalBill SHA-check now runs inside the standard chain via `check:finalbill`.

## Build config

- **`vite.config.ts`** — Vite 5 + `@vitejs/plugin-react-swc` (SWC for faster transforms).
- **`tsconfig.json`** — strict TypeScript.
- **`tailwind.config.ts`** / `postcss.config.js` — Tailwind + autoprefixer.
- **`eslint.config.js`** — flat-config ESLint with react-hooks and react-refresh plugins.

## Environment variables

The app reads Supabase config from Vite-prefixed envs (`VITE_*`). Look for `.env.example` at the repo root for the canonical list. Vercel project → Settings → Environment Variables should mirror these.

Twilio (`twilio ^5.12.2`) is used for telephony features — those keys are server-side only (`api/` Vercel functions).

## Hosting

- **Frontend:** Vercel (auto-deploy on push to `main` of `chatgptnotes/adamrit.com`).
- **Backend:** Supabase project (Postgres + Storage + Edge Functions). Vault-fed SOPs land in the `agent-corpus` Storage bucket per [[0001-obsidian-as-source-of-truth]].
- **Serverless functions:** `api/` directory deployed as Vercel Node functions (`@vercel/node`).

## Pre-deploy checklist (do not skip)

1. `npm run lint` — must pass.
2. `npm run check:finalbill` — must pass (FinalBill SHA matches lock).
3. Manual smoke test of `/final-bill/:visitId` if anything near billing was changed.
4. Confirm Supabase migrations applied to the target environment (Lovable / dashboard).
5. `git push origin main` → Vercel picks up automatically.

## E2E tests

Playwright config in repo root + tests under `e2e/`. Not in the default `npm run` script list — run with `npx playwright test` when you need them.

## Type generation flow

After adding a Supabase migration:

```
npm run generate-types
git diff src/integrations/supabase/types.ts   # sanity check
git add src/integrations/supabase/types.ts
```

Commit with the migration in the same PR.

## Related

- [[Architecture]] — what the build produces.
- [[Known-Issues-and-Gotchas]] — FinalBill freeze, the Vercel prebuild incident, sidebar restore.
