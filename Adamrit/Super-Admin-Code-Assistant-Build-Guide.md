# Build Guide — Super-Admin Code Assistant (Phase 1 MVP)

> **What this is.** A step-by-step build guide for the Phase 1 MVP described in [[Super-Admin-Code-Assistant-Plan]]. Concrete commands, file contents, and verification at every step. Designed to be followed start-to-finish in ~3 working days.

> **Companion docs.**
> - [[Super-Admin-Code-Assistant-Plan]] — the WHAT (architecture, error catalog, contracts, design)
> - This file — the HOW (commands, sequence, milestones)

> ## 🚫 HARD RULE — no deployment without per-action permission
>
> Every step that lands code on `main` or affects production must be a **conscious individual choice asked of the user**. One blanket approval does not carry over.
>
> Always ask before:
> - `git push origin main`
> - `gh pr merge` (or merging via the GitHub UI)
> - `supabase db push` against the live project
> - `vercel deploy --prod`
> - Any of the build-chain safety guards being removed
>
> Allowed freely:
> - feature-branch pushes (Vercel preview only, main untouched)
> - all local commands (`dev`, `lint`, `build`, `test`)
>
> Same rule lives in `adamrit/CLAUDE.md` and in the Claude memory store.

---

## Day 0 — Prerequisites (before you start)

You'll need:

| # | Item | How to get it |
|---|---|---|
| 1 | **DeepSeek API key** | Sign up at https://platform.deepseek.com → API Keys → Create new |
| 2 | **GitHub Personal Access Token** | github.com/settings/tokens → "Generate (classic)" → check `repo` scope |
| 3 | **Vercel API token** | vercel.com/account/tokens → Create token |
| 4 | **Vercel project ID** | Vercel dashboard → Adamrit project → Settings → General → "Project ID" |
| 5 | **Supabase service-role key** | Supabase dashboard → Project Settings → API → `service_role` |
| 6 | **Local checkout of adamrit** | `cd ~/Desktop/adarith/adamrit` (you already have this) |
| 7 | **Supabase CLI** (optional but useful) | `brew install supabase/tap/supabase` |

Add the keys to a local `.env.local` for testing (NEVER commit this file — it's already in `.gitignore`):

```bash
# .env.local in adamrit repo root
DEEPSEEK_API_KEY=sk-deepseek-...
DEEPSEEK_MODEL=deepseek-coder
GITHUB_TOKEN=ghp_...
VERCEL_API_TOKEN=...
VERCEL_PROJECT_ID=prj_...
CODE_ASSIST_HOURLY_LIMIT=20
CODE_ASSIST_DAILY_COST_USD=5
CODE_ASSIST_MONTHLY_COST_USD=50
CODE_ASSIST_CONTEXT_BUDGET_CHARS=200000
```

After Phase 1 ships, set the same vars in **Vercel → Settings → Environment Variables** for both Production and Preview scopes.

---

## Day 0 — Create the feature branch

```bash
cd ~/Desktop/adarith/adamrit
git checkout main
git pull
git checkout -b feat/super-admin-code-assistant
```

All Phase 1 work commits to this branch. Production stays untouched until everything is verified.

---

# Day 1 — Foundation (migration + backend skeleton)

## Step 1.1 — Install dependencies

```bash
cd ~/Desktop/adarith/adamrit
npm install openai @octokit/rest minimatch react-diff-viewer-continued
npm install --save-dev @types/minimatch
```

Verify:

```bash
grep -E '"openai"|"@octokit/rest"|"minimatch"|"react-diff-viewer-continued"' package.json
```

Expect 4 matches.

## Step 1.2 — Create the Supabase migration

Create `supabase/migrations/20260515120000_code_assistant.sql` with the SQL from §23 of the plan. The migration creates:

- `code_assistant_generations` (main table)
- `code_assistant_messages` (multi-turn — used in Phase 3 but created now)
- `code_assistant_templates` (used in Phase 2)
- `code_assistant_pipeline_events` (real-time — Phase 3)
- `code_assistant_rate_limits`
- `code_assistant_provider_config` (multi-provider — Phase 3)
- RLS policies + the `touch_updated_at` trigger

Apply the migration:

```bash
# Via Supabase CLI (recommended)
supabase link --project-ref xvkxccqaopbnkvwgyfjv
supabase db push

# OR via the Supabase dashboard:
# 1. Open SQL Editor
# 2. Paste the contents of the migration file
# 3. Click Run
```

Regenerate the TypeScript types:

```bash
npm run generate-types
git diff src/integrations/supabase/types.ts
```

Expect the diff to include the 6 new tables. Commit:

```bash
git add supabase/migrations/20260515120000_code_assistant.sql src/integrations/supabase/types.ts
git commit -m "feat(code-assistant): supabase migration + types"
```

## Step 1.3 — Create the allowlist module

Create `api/lib/allowlist.ts` and `src/lib/code-assistant/allowlist.ts` (mirror). Use the lists from §22 of the plan.

Smoke test:

```bash
node -e "
const { validatePath } = require('./api/lib/allowlist');
console.log(validatePath('src/pages/Patients.tsx'));      // { ok: true }
console.log(validatePath('src/pages/FinalBill.tsx'));     // { ok: false, reason: 'file-in-locklist' }
console.log(validatePath('.github/workflows/x.yml'));     // { ok: false, reason: 'file-in-locklist' }
console.log(validatePath('random.txt'));                  // { ok: false, reason: 'file-not-in-allowlist' }
"
```

Commit.

## Step 1.4 — Create the DeepSeek client wrapper

Create `api/lib/deepseek.ts` per §24.1 of the plan. Includes:
- `AIError` class with error codes from §10
- `callDeepSeek()` function
- `parseJsonBlock()` and `estimateCost()` helpers
- The full SYSTEM_PROMPT from §12.2

Smoke test (uses the API key, so won't work in CI without secrets):

```bash
# Make sure .env.local has DEEPSEEK_API_KEY set, then:
npx tsx -e "
import { callDeepSeek } from './api/lib/deepseek';
const r = await callDeepSeek('Add a comment to LandingPage saying hello', []);
console.log(JSON.stringify(r, null, 2));
"
```

Expect a parsed response with `plan`, `files`, `warnings`.

Commit.

## Step 1.5 — Create the GitHub commit helper

Create `api/lib/github.ts` per §24.7 of the plan.

Smoke test against a throwaway branch:

```bash
npx tsx -e "
import { commitToGitHub } from './api/lib/github';
const r = await commitToGitHub('test-user', 'test-gen', [{
  path: 'docs/test.md',
  action: 'create',
  content: 'hello from code-assistant test\n'
}]);
console.log(r);
"

# Then delete the test branch:
gh api -X DELETE /repos/chatgptnotes/adamrit.com/git/refs/heads/<branch-name>
```

Commit.

## Step 1.6 — Create the rate-limit helper

Create `api/lib/ratelimit.ts`. Functions:
- `checkAndIncrementRateLimit(userId)` — increments hourly counter; throws on cap
- `addCost(userId, costUsd)` — adds to daily + monthly counters
- `getUsage(userId)` — returns current windows + caps

All operations use Supabase service role.

Smoke test:

```bash
npx tsx -e "
import { checkAndIncrementRateLimit, getUsage } from './api/lib/ratelimit';
const u = '00000000-0000-0000-0000-000000000001'; // test user
for (let i = 0; i < 21; i++) {
  try { await checkAndIncrementRateLimit(u); console.log('ok', i); }
  catch (e) { console.log('blocked at', i, e.code); }
}
console.log(await getUsage(u));
"
```

Expect first 20 to pass, 21st to throw `rate-limit-prompts`.

Commit.

## Step 1.7 — Create the context loader

Create `api/lib/context.ts`. Reads:
- `CLAUDE.md` (always)
- `src/components/AppRoutes.tsx` (always)
- `src/components/AppSidebar.tsx` (always)
- Each attached file from the request

Bounded by `CODE_ASSIST_CONTEXT_BUDGET_CHARS`.

Smoke test:

```bash
npx tsx -e "
import { loadContext } from './api/lib/context';
const c = await loadContext(['src/pages/Patients.tsx']);
console.log('files loaded:', c.length);
console.log('total chars:', c.reduce((sum, f) => sum + f.content.length, 0));
"
```

Commit.

## Step 1.8 — Wire the main generate endpoint

Create `api/superadmin/code-assistant/generate.ts` per §24.6 of the plan.

This is the longest file — combines all the helpers above into the 8-stage pipeline.

Smoke test (after setting env vars):

```bash
npm run dev

# In another terminal:
curl -X POST http://localhost:3000/api/superadmin/code-assistant/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <supabase-jwt-for-a-superadmin>" \
  -d '{
    "prompt": "Add a comment saying hello at the top of LandingPage.tsx",
    "attached_files": []
  }'
```

Expect a JSON response with `plan`, `files`, `branch_name`, `commit_sha`. The branch will be visible at github.com/chatgptnotes/adamrit.com/branches.

If anything fails, the response includes a structured error matching §10.

Commit.

## Step 1.9 — Wire the health endpoint

Create `api/superadmin/code-assistant/health.ts`. Returns the status of every dependency.

```bash
curl http://localhost:3000/api/superadmin/code-assistant/health
```

Expect all-green when env vars are set, red when any are missing.

Commit.

## Step 1.10 — Wire the preview-status endpoint

Create `api/superadmin/code-assistant/preview-status.ts`. Polls Vercel API to check whether the preview deploy is ready.

```bash
curl http://localhost:3000/api/superadmin/code-assistant/preview-status/<generation-id>
```

Expect `{status: 'building', elapsed_sec: N}` followed by `{status: 'ready', preview_url: 'https://...'}` after ~2 minutes.

Commit.

## Step 1.11 — Wire the files endpoint

Create `api/superadmin/code-assistant/files.ts`. Returns a filtered list of repo files matching a search query, with allowlist/locklist flags.

```bash
curl "http://localhost:3000/api/superadmin/code-assistant/files?q=pharmacy"
```

Expect ~5 results: `src/pages/Pharmacy.tsx`, `src/components/pharmacy/*`, etc.

Commit.

## Step 1.12 — Wire the usage endpoint

Create `api/superadmin/code-assistant/usage.ts`. Returns current windows + caps for the calling admin.

```bash
curl http://localhost:3000/api/superadmin/code-assistant/usage -H "Authorization: Bearer <jwt>"
```

Expect a JSON shape per §11.7 of the plan.

Commit.

**End of Day 1.** Push the branch:

```bash
git push -u origin feat/super-admin-code-assistant
```

Vercel will deploy a preview of the backend. Open the preview URL + `/api/superadmin/code-assistant/health` to verify.

---

# Day 2 — Frontend (the visible part)

## Step 2.1 — Scaffold the admin page shell

Create `src/pages/admin/AdminPanel.tsx`:

```tsx
import { Outlet, Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { AdminTabNav } from '@/components/admin/AdminTabNav';

export default function AdminPanel() {
  const { isSuperAdmin, isLoading } = usePermissions();
  if (isLoading) return <div className="p-8">Loading…</div>;
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen">
      <AdminTabNav />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
```

Create `src/components/admin/AdminTabNav.tsx` with 8 tabs (most are stubs for now).

Create `src/pages/admin/CodeAssistant.tsx` — empty for now, just a page title.

Wire into `src/components/AppRoutes.tsx`:

```tsx
{
  path: '/admin',
  element: <AdminPanel />,
  children: [
    { path: 'code-assistant', element: <CodeAssistant /> },
    { path: 'logic-studio', element: <ComingSoon name="Logic Studio" /> },
    // ... other tabs as ComingSoon stubs
  ],
}
```

Add a sidebar entry in `src/components/AppSidebar.tsx`, conditionally rendered on `isSuperAdmin`.

Smoke test:

```bash
npm run dev
# Log in as a superadmin user
# Visit http://localhost:3000/admin/code-assistant
# Expect: empty page with tab nav at top, "Code Assistant" tab active
# Visit http://localhost:3000/admin/code-assistant as a non-superadmin
# Expect: redirected to /
```

Commit.

## Step 2.2 — Build PromptField

Create `src/components/admin/code-assistant/PromptField.tsx` per §24.3 of the plan. Wire it into `CodeAssistant.tsx` with React state for value + error.

Smoke test the field validations manually:

- Empty + click submit → "Please describe what you want to change."
- Type "hi" + click submit → "Tell us a bit more — at least 5 characters."
- Paste 11,000 chars → "Prompt is 11,000 / 10,000 characters."
- Type a normal prompt → no error, counter shows correct number

Commit.

## Step 2.3 — Build FileAttachmentPicker

Create `src/components/admin/code-assistant/FileAttachmentPicker.tsx`. Opens a search modal that calls `/api/superadmin/code-assistant/files?q=…`.

Smoke test:
- Open picker, type "pharmacy" → see ~5 results
- Click a file → adds to attachment chips
- Try to attach 6th file → error chip "Up to 5 files"
- Try to attach FinalBill.tsx (won't show in picker because pre-filtered)

Commit.

## Step 2.4 — Build ErrorPanel

Create `src/components/admin/code-assistant/ErrorPanel.tsx` per §24.5 of the plan.

Smoke test: render a sample error and verify:
- Title, message, hint all visible
- "Show details" toggles raw payload
- "Copy error" copies JSON to clipboard

Commit.

## Step 2.5 — Build StatusBar

Create `src/components/admin/code-assistant/StatusBar.tsx`. 8-stage progress stepper.

Manually drive states for visual verification:

```tsx
<StatusBar currentStage="calling-deepseek" elapsedSec={42} />
```

Commit.

## Step 2.6 — Build PlanView and DiffView

`PlanView.tsx` — renders DeepSeek's markdown plan using `react-markdown` (already in deps).

`DiffView.tsx` — uses `react-diff-viewer-continued` to render each file's diff. Collapsible per file.

Commit.

## Step 2.7 — Build PreviewLink

Create `src/components/admin/code-assistant/PreviewLink.tsx`. Shows the preview URL once it's ready; polls `/preview-status/:id` while building.

```tsx
const { data, isLoading } = useQuery({
  queryKey: ['preview-status', generationId],
  queryFn: () => fetch(`/api/superadmin/code-assistant/preview-status/${generationId}`).then(r => r.json()),
  refetchInterval: (data) => data?.status === 'ready' ? false : 3000,
});
```

Commit.

## Step 2.8 — Wire it all together

Update `src/pages/admin/CodeAssistant.tsx` to use all the pieces:

```tsx
export default function CodeAssistant() {
  const [prompt, setPrompt] = useState('');
  const [attached, setAttached] = useState<string[]>([]);
  const [promptError, setPromptError] = useState<FieldError | null>(null);
  const { mutate, data, error, isLoading } = useCodeAssistant();

  const handleSubmit = () => {
    const err = validatePrompt(prompt);
    if (err) { setPromptError(err); return; }
    mutate({ prompt, attached_files: attached });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PromptHeader />  {/* connection badges + usage chips */}
      <PromptForm
        prompt={prompt} onPromptChange={setPrompt}
        promptError={promptError} onClearPromptError={() => setPromptError(null)}
        attached={attached} onAttachedChange={setAttached}
        onSubmit={handleSubmit} isLoading={isLoading}
      />
      {isLoading && <StatusBar /* … */ />}
      {(error || data?.error) && <ErrorPanel error={...} />}
      {data?.ok && <>
        <PlanView markdown={data.plan} />
        <DiffView files={data.files} />
        <PreviewLink generationId={data.generation_id} />
      </>}
    </div>
  );
}
```

Smoke test the full happy path:
- Log in as superadmin
- Type "Add a comment 'test' at the top of LandingPage.tsx"
- Click Generate Code
- Watch the StatusBar advance
- See the plan, diff, and (after ~2 min) preview URL

Commit.

**End of Day 2.** Push:

```bash
git add . && git commit -m "feat(code-assistant): frontend MVP complete" && git push
```

Vercel preview now has the full feature. Test in a browser.

---

# Day 3 — Integration tests + polish

## Step 3.1 — Run through every field-validation test

Open `/admin/code-assistant` in the preview deploy.

For each test in §27.1 of the plan, verify the exact error message + UI:

- FV-1: empty submit → exact message
- FV-2: whitespace only
- FV-3: 4 chars
- FV-4: 10,001 chars
- FV-5: 6 attached files
- FV-6: attach FinalBill (verify picker pre-filters it out)
- FV-7: nonexistent path (force via DevTools)

If any error message doesn't match the plan exactly, fix and re-commit.

## Step 3.2 — Run through every API-error test

For each test in §27.2:

- API-1: remove `DEEPSEEK_API_KEY` from preview env → reload → expect full-page banner
- API-2: set `DEEPSEEK_API_KEY=garbage` → expect `deepseek-auth-failed`
- API-4: set `DEEPSEEK_TIMEOUT_MS=1000` → expect timeout
- API-7: temporarily edit the server to ignore the locklist; verify `failed-locklist` still trips at stage 6
- API-8: ask DeepSeek for "broken TypeScript" → expect `syntax-error`
- API-10: set `GITHUB_TOKEN=bad` → expect `github-auth-failed`
- API-11: ask DeepSeek to import a missing module → Vercel build fails → expect `vercel-build-failed`

Fix anything that doesn't match the plan.

## Step 3.3 — Run the happy-path test

HP-1 from §27.3:
- Prompt: "Add a heading 'Test Heading' to LandingPage"
- Click Generate Code
- Wait for preview
- Open the preview URL in a new tab
- Verify the heading appears on the landing page

## Step 3.4 — Run the security tests

- SEC-1: log out as superadmin, log in as a regular doctor, visit `/admin/code-assistant` → redirected
- SEC-2: hit the API directly with no auth header → 401
- SEC-3: temporarily relax the locklist client-side, attach a github workflow file → server still refuses
- SEC-5: hypothetically commit a FinalBill change via gh → Vercel build fails with `check:finalbill` error

## Step 3.5 — Polish

- Style the connection badges in the header
- Style the usage chips (amber at 80% cap, red at 95%)
- Add aria-labels to all interactive elements
- Verify dark mode looks correct
- Verify the page works on a 1024px-wide screen

Commit and push.

---

# Day 3-4 — Production deployment

> ⚠ **Stop and ask the user before any of the steps in this section.** Each step below affects production. The "no deployment without permission" rule means none of these run on autopilot — the user must explicitly approve each one in conversation.

## Step 4.1 — Open a PR to main *(asks user first)*

```bash
gh pr create --base main --head feat/super-admin-code-assistant \
  --title "Super-Admin Code Assistant (Phase 1 MVP)" \
  --body "$(cat <<'EOF'
## Summary

Phase 1 MVP of the Super-Admin Code Assistant tab.

- New `/admin/code-assistant` page
- Backend pipeline: prompt → DeepSeek → branch → preview
- All field validations + error states per the plan
- Migration: 6 new tables (code_assistant_*) + RLS

## Test plan

- [x] All FV-* tests pass
- [x] All API-* tests pass (with appropriate mocks)
- [x] HP-1 happy-path verified end-to-end
- [x] SEC-* security tests pass
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] `npm run check:finalbill` passes

## Risks

- New external dep on DeepSeek API
- Adds 4 npm packages
- Adds 6 Supabase tables

## Rollout

Set `CODE_ASSIST_ENABLED=false` to hide the entire panel if needed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Step 4.2 — Confirm Vercel preview is healthy

- Open the preview URL from the PR
- Visit `/admin/code-assistant` as superadmin
- Run HP-1 one more time

## Step 4.3 — Set production env vars

In Vercel → Settings → Environment Variables → Production scope, add:

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL` (or leave default)
- `GITHUB_TOKEN`
- `VERCEL_API_TOKEN`
- `VERCEL_PROJECT_ID`
- `CODE_ASSIST_HOURLY_LIMIT`
- `CODE_ASSIST_DAILY_COST_USD`
- `CODE_ASSIST_MONTHLY_COST_USD`
- `CODE_ASSIST_CONTEXT_BUDGET_CHARS`

## Step 4.4 — Merge the PR *(asks user first — this is the actual prod deploy)*

Once CI is green and the preview tests pass, **ask the user** before clicking merge. Merging triggers the production Vercel deploy. Per the hard rule, this is never automatic.

## Step 4.5 — Smoke test production

- Visit `/admin/code-assistant` on the production URL
- Run HP-1 once
- Verify the audit_trail rows are written
- Check the usage meter shows the spend

## Step 4.6 — Announce to admins

Share access with the super-admin user. Walk them through:
- How to write a good prompt
- Preview → Promote → Revert cycle
- Where errors show up

---

# Verification checklist (final)

Before declaring Phase 1 done, every box checked:

- [ ] Migration applied to Adamrit Supabase
- [ ] `npm run generate-types` no surprises
- [ ] All env vars set in Vercel (Prod + Preview)
- [ ] Health endpoint all-green
- [ ] FV-1 through FV-9 pass
- [ ] API-1 through API-12 pass
- [ ] HP-1 passes
- [ ] SEC-1 through SEC-5 pass
- [ ] RL-1 (rate limit) passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run check:finalbill` passes
- [ ] Sidebar entry visible only to superadmin
- [ ] Audit trail rows written
- [ ] Cost meter accurate
- [ ] Dark mode works
- [ ] 1024px width works

---

# After Phase 1

Phase 2 (Promote/Revert/Manual edit) → Phase 3 (Iterate/Self-heal/Multi-provider) → Phase 4 (Logic Studio/2-person approval).

See [[Super-Admin-Code-Assistant-Plan]] §36 for the phase breakdown.

---

# Cheat sheet — commands you'll repeat

```bash
# Start fresh dev session
cd ~/Desktop/adarith/adamrit
git checkout feat/super-admin-code-assistant
git pull
npm run dev

# Watch for type errors as you go
npm run lint -- --watch

# Run a single API endpoint locally
curl http://localhost:3000/api/superadmin/code-assistant/health

# Tail Vercel logs for the preview
vercel logs --follow

# After a migration
npm run generate-types
git diff src/integrations/supabase/types.ts

# Commit pattern
git add -p   # review each hunk
git commit -m "feat(code-assistant): <what>"
git push
```

---

# Troubleshooting

| Symptom | Fix |
|---|---|
| `DEEPSEEK_API_KEY is required` on startup | Add to `.env.local` for dev, Vercel env for prod |
| `column "deepseek_model" does not exist` | Migration didn't run — re-apply via Supabase CLI |
| `Cannot find module '@octokit/rest'` | Re-run `npm install` |
| Preview URL never shows up | Wrong `VERCEL_PROJECT_ID` — verify in dashboard |
| DeepSeek returns plain text not JSON | System prompt is wrong — re-check §12.2 |
| GitHub API rate-limited during tests | Wait 1h or use a different PAT |
| TypeScript types stale after migration | `npm run generate-types` again |
| `not-superadmin` even though logged in | Check the user's `role` in `auth.users` |

---

**You're done with Phase 1 when:** a super-admin can type a prompt, see DeepSeek's plan and diff, click through to a working preview URL, and every error in §10 produces the exact UI in §8.
