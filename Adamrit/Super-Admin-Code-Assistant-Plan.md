# Plan — Adamrit Super-Admin Panel with DeepSeek-Powered Code Assistant

> **Scope.** This plan delivers a complete **Super-Admin Panel** in Adamrit, with the **Code Assistant tab** (DeepSeek-driven, the user's headline feature) as the central capability, plus seven companion tabs that round out the panel. Every error, every field, every state, every safety net is enumerated.

---

## Table of contents

**Part A — The Super-Admin Panel as a whole**
1. Context, drivers, and constraints
2. The panel: eight tabs at a glance
3. Cross-cutting concerns (auth, audit, rate-limits, observability)

**Part B — The Code Assistant tab (deep dive)**
4. One-line vision
5. End-to-end architecture
6. The 8-stage generation pipeline
7. Full state machine
8. UI design — every field, every state
9. Field specifications (validation, helper text, error messages)
10. Error catalog (every code, message, hint, action)
11. Backend API contracts
12. The DeepSeek integration — full system prompt
13. Multi-provider fallback (DeepSeek → Claude → OpenAI)
14. Image input (paste screenshots)
15. Multi-turn iteration (chat on the same generation)
16. Failure self-healing loop (auto-retry with build error)
17. Visual diff editor with manual tweaks
18. Two-person approval workflow (optional)
19. Auto-generated tests
20. Saved prompt templates
21. Real-time status (WebSocket) — Phase 3
22. Security: allowlist, locklist, rate limits, six layers of defense
23. Data model — complete SQL migration
24. Code samples for critical pieces
25. Environment variables
26. Cost projection across providers
27. Test plan (concrete cases)
28. Telemetry & observability

**Part C — Companion tabs (sketch level)**
29. Logic Studio tab (parameters / rules / workflows)
30. Users & Roles tab
31. Audit Log tab
32. Usage & Cost Dashboard tab
33. Deployment History tab (one-click rollback)
34. System Settings tab
35. AI Models tab

**Part D — Rollout and operations**
36. Phased rollout (Phases 1–6, with sub-phases)
37. Pre-deployment checklist
38. Operational runbook
39. Disaster recovery
40. Data retention & compliance (HIPAA-adjacent)
41. Admin onboarding & training
42. Future evolution roadmap

**Part E — Reference**
43. Files created / modified (full list)
44. npm dependencies added
45. Out of scope
46. Open decisions (locked-in defaults with override paths)

---

# PART A — THE SUPER-ADMIN PANEL AS A WHOLE

## 1. Context, drivers, and constraints

### What the user asked for

1. "Tab in the super admin panel where he should be able to change the code whatever way he wants."
2. "Connected to the DeepSeek API key that I will be given."
3. "Show the error if there is any API error and all."
4. "Field text, field errors should be shown."

### What this implies

The user envisions a **Super-Admin Panel** with multiple tabs. The Code Assistant tab (DeepSeek-powered) is the headline feature but it sits inside a broader admin surface. To honor "tab in the panel" properly, this plan designs the panel as a whole and then dives deep on Code Assistant.

### Hard constraints carried over

- `src/pages/FinalBill.tsx` is feature-frozen (SHA-locked at multiple build stages).
- Clinical-safety logic stays in code (regulatory).
- Auth / RLS policies stay in code.
- Schema changes happen via developer-authored migrations, not the panel.
- No new npm dependencies via AI generation in v1.

### What's already in adamrit (foundation we build on)

- `superadmin` role exists in `src/lib/permissions.ts`; `usePermissions().isSuperAdmin` gates UI.
- `audit_trail` Supabase table — action / changed_by / timestamp / JSON changes.
- `@tanstack/react-query` for caching.
- shadcn-ui (Radix) for components.
- Vercel + GitHub deploy pipeline already wired (`chatgptnotes/adamrit.com`).
- Supabase Storage + Edge Functions already used (the vault corpus sync).

---

## 2. The panel: eight tabs at a glance

Route: **`/admin`** (visible only when `isSuperAdmin`). Renders a tab nav.

| # | Tab | Path | Headline capability | Phase |
|---|---|---|---|---|
| 1 | **Code Assistant** | `/admin/code-assistant` | Prompt → DeepSeek edits codebase → preview → promote | **Phase 1 (MVP)** |
| 2 | **Logic Studio** | `/admin/logic-studio` | Edit parameters / rules / workflows that drive runtime behavior | Phase 4 |
| 3 | **Users & Roles** | `/admin/users` | View, create, role-change, deactivate admin/staff accounts | Phase 2 |
| 4 | **Audit Log** | `/admin/audit-log` | Search/filter the `audit_trail` table | Phase 2 |
| 5 | **Usage & Cost** | `/admin/usage` | DeepSeek spend, generations per admin, alerts | Phase 3 |
| 6 | **Deployment History** | `/admin/deployments` | List recent Vercel deploys; one-click rollback | Phase 3 |
| 7 | **System Settings** | `/admin/settings` | Health of every integration; env-var status; feature flags | Phase 2 |
| 8 | **AI Models** | `/admin/ai-models` | Configure DeepSeek / Claude / OpenAI providers, fallback order | Phase 3 |

The Code Assistant tab can stand alone — the other seven are scaffolded as empty stubs in Phase 1 and filled out in later phases.

---

## 3. Cross-cutting concerns

These apply across every tab in the panel.

### 3.1 Auth gate

Every `/admin/*` route is wrapped in `<RequireSuperAdmin>`:

```tsx
function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { isSuperAdmin, isLoading, user } = usePermissions();
  if (isLoading) return <CenteredSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <PermissionDenied role={user.role} />;
  return <>{children}</>;
}
```

Server-side, every API route at `/api/superadmin/*` re-checks the role.

### 3.2 Single audit trail

Every mutating action in any tab writes one row to `audit_trail`:
- `action`: kebab-cased operation, e.g. `code-assistant.generate`, `code-assistant.promote`, `users.role-change`, `logic-studio.param-edit`.
- `changed_by`: user id.
- `changes`: JSON payload with before/after or operation metadata.
- `timestamp`: server-side `now()`.

The Audit Log tab is the unified viewer.

### 3.3 Unified rate-limit table

`code_assistant_rate_limits` + a generalized `admin_rate_limits` (introduced in Phase 2). For Phase 1 only the assistant table is needed.

### 3.4 Shared error UI

All admin tabs use the same `ErrorPanel` component (defined in §24) — consistent UX for every failure.

### 3.5 Sidebar entry

`src/components/AppSidebar.tsx` gets one new section:

```
─ Super-Admin ─
  Code Assistant
  Logic Studio       (greyed out in Phase 1, links to "coming Phase 4")
  Users & Roles
  Audit Log
  Usage & Cost
  Deployments
  Settings
  AI Models
```

Entire section is conditionally rendered on `isSuperAdmin`.

---

# PART B — THE CODE ASSISTANT TAB

## 4. One-line vision

> Type a prompt → DeepSeek edits the Adamrit codebase → preview deploys → admin promotes or reverts, with every conceivable error and field-validation state shown clearly.

## 5. End-to-end architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ BROWSER  /admin/code-assistant   (gated by isSuperAdmin)            │
│                                                                     │
│  PromptForm → StatusBar → ErrorPanel → PlanView → DiffView →        │
│  PreviewLink → ActionBar → HistoryDrawer                            │
│                                                                     │
│  Real-time updates via WebSocket (Phase 3) or polling (Phase 1)     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ HTTPS (same origin), Supabase JWT
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ VERCEL SERVERLESS  api/superadmin/code-assistant/*                  │
│                                                                     │
│  generate.ts        POST  main pipeline                              │
│  iterate.ts         POST  follow-up prompt on same branch (Phase 3)  │
│  preview-status.ts  GET   polls Vercel                               │
│  promote.ts         POST  opens PR + merges                          │
│  revert.ts          POST  closes branch                              │
│  self-heal.ts       POST  auto-fix on build failure (Phase 3)        │
│  apply-manual-edit  POST  admin's hand-tweaked file (Phase 2)        │
│  health.ts          GET   self-check of env vars                     │
│  files.ts           GET   file search                                │
│  history.ts         GET   list past generations                      │
│  templates.ts       GET   saved prompt templates                     │
│  usage.ts           GET   spend + limits                             │
└────────┬─────────────┬─────────────┬─────────────┬──────────────────┘
         │             │             │             │
         ▼             ▼             ▼             ▼
┌──────────────┐ ┌─────────────┐ ┌────────────┐ ┌──────────────┐
│ DeepSeek API │ │ GitHub API  │ │ Vercel API │ │ Optional:    │
│ (primary)    │ │ (Octokit)   │ │            │ │ Claude /     │
│              │ │             │ │            │ │ OpenAI       │
│ Image API    │ │             │ │            │ │ (fallback)   │
│ (Phase 3)    │ │             │ │            │ │              │
└──────────────┘ └──────┬──────┘ └──────┬─────┘ └──────────────┘
                        │               │
                        │ branch push   │ deploy
                        ▼               ▼
                  ┌──────────────────────────┐
                  │ Vercel builds preview    │
                  └──────────────────────────┘
```

Persistence (Supabase, Adamrit project): `code_assistant_generations`, `code_assistant_messages` (multi-turn), `code_assistant_templates`, `code_assistant_rate_limits`, plus rows in the existing `audit_trail`.

---

## 6. The 8-stage generation pipeline

```
Stage 1 — Frontend validation
Stage 2 — Auth + rate-limit + cost-cap check
Stage 3 — Payload + path validation (allowlist + locklist of attached files)
Stage 4 — Load code context (CLAUDE.md + always-files + attached files; optional image)
Stage 5 — Call AI provider (DeepSeek; fallback Claude / OpenAI if configured)
Stage 6 — Parse + validate response (JSON shape, allowlist/locklist, TS parses)
Stage 7 — Commit to GitHub branch
Stage 8 — Poll Vercel preview deploy
```

Then UI hands off: Promote / Revert / Iterate / Manually-edit. On Vercel build failure → optional self-heal loop (§16).

Every stage has explicit error states — see §10.

---

## 7. Full state machine

```
[initial]
   │ submit
   ▼
[validating-payload] ──invalid──→ failed-validation                 (terminal-error)
   │
[checking-rate-limit] ──over──→ failed-rate-limit-{prompts|cost}    (terminal-error)
   │
[loading-context] ──error──→ failed-context                         (terminal-error)
   │
[calling-deepseek] (30-90s)
   │  ├─ 401 ─→ failed-deepseek-auth   ──┐
   │  ├─ 429 ─→ failed-deepseek-rate-limit │ (retry-eligible — automatic with
   │  ├─ 5xx ─→ failed-deepseek-server     │  fallback provider if configured)
   │  ├─ timeout ─→ failed-deepseek-timeout
   │  ├─ network ─→ failed-deepseek-network
   │  └─ refused ─→ failed-deepseek-content-filter
   │
[parsing-response] ──malformed──→ failed-malformed-response
   │
[validating-response]
   │  ├─ no files ─→ failed-empty-changeset
   │  ├─ syntax ──→ failed-syntax
   │  ├─ allowlist→ failed-allowlist
   │  └─ locklist → failed-locklist
   │
[committing-to-github]
   │  ├─ 401 ─→ failed-github-auth
   │  ├─ 422 ─→ failed-github-conflict
   │  ├─ 429 ─→ failed-github-rate-limit
   │  └─ net ─→ failed-github-network
   │
[preview-pending] (polling Vercel)
   │  ├─ build fail ─→ failed-vercel-build  ──→ [self-heal] (Phase 3, optional)
   │  └─ timeout   ─→ failed-vercel-timeout
   │
[preview-ready]                                                     (success-pending)
   │
   ├─ admin clicks Promote
   │     │
   │     ▼
   │   [promoting]
   │     │  ├─ PR err ─→ failed-pr
   │     │  ├─ checks ─→ failed-pr-checks
   │     │  └─ merge ──→ failed-merge
   │     │
   │     ▼
   │   [awaiting-second-approval]  ←── only if 2-person approval is on
   │     │  (state lasts until a different super-admin clicks Approve)
   │     ▼
   │   [promoted]                                                  (terminal-success)
   │
   ├─ admin clicks Revert ─→ [reverting] → [reverted]              (terminal-cancel)
   │
   ├─ admin clicks Iterate ─→ [iterating] → loops back to [calling-deepseek]
   │
   └─ admin manually edits a file ─→ [manual-edit-pending] →
                                     re-runs preview from [preview-pending]
```

The `status` column on `code_assistant_generations` is one of the labelled states.

---

## 8. UI design — every field, every state

### 8.1 Page anatomy

```
┌────────────────────────────────────────────────────────────────────────┐
│ Adamrit · Super-Admin · Code Assistant       [Templates] [History (12)]│
│ ● DeepSeek connected  ● GitHub connected  ● Vercel connected           │
│ This month: $14.30 / $50    This hour: 7 / 20                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  📝 What do you want to change?                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ <textarea, autogrow, monospace>                                  │  │
│  │ Examples (click to insert):                                      │  │
│  │  • Add a CSV export button to the Patients page                  │  │
│  │  • In OPD intake, require age and blood group                    │  │
│  │  • When pharmacy stock < 50, alert pharmacist via WhatsApp       │  │
│  │  • Use a saved template ↓                                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  Helper: Use plain English. Be specific about the page or feature.    │
│  Counter: 0 / 10,000 characters                                        │
│  Error slot: [hidden]                                                  │
│                                                                        │
│  📎 Attach files (optional, up to 5)            🖼  Attach image       │
│  [+ Add file]   src/pages/Patients.tsx ✕                               │
│                                                                        │
│  📌 Saved template: [None]   [Save current as template]                │
│                                                                        │
│  [ Generate Code (Cmd+Enter) ]    [ Clear ]                            │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ STATUS  (in progress only)                                             │
│  ●─●─●─●─○─○─○─○                                                       │
│  Validating · Rate-check · Context · DeepSeek ← here · …               │
│  Elapsed: 42s                              [Cancel]                    │
├────────────────────────────────────────────────────────────────────────┤
│ ERRORS  (when any)                                                     │
│  ❌ <Title>                                                            │
│      <Message>                                                         │
│      💡 <Hint>                                                          │
│      [Show details] [Copy error] [Iterate (new prompt)]                │
├────────────────────────────────────────────────────────────────────────┤
│ DEEPSEEK'S PLAN                                                        │
│  <rendered markdown>                                                   │
├────────────────────────────────────────────────────────────────────────┤
│ PROPOSED CHANGES                                                       │
│  src/pages/Patients.tsx   +12 −3   [Expand] [Edit in Monaco]           │
│  src/components/AppSidebar.tsx  +5 −0   [Expand] [Edit in Monaco]      │
├────────────────────────────────────────────────────────────────────────┤
│ PREVIEW DEPLOY                                                         │
│  https://adamrit-com-git-superadmin-edits-abc.vercel.app    [Open ↗]   │
│  Build: ✅ Ready in 2m 14s  [Open log ↗]                               │
│  Auto-test results: 23 / 23 Playwright tests passed  [View report]    │
├────────────────────────────────────────────────────────────────────────┤
│ ACTIONS                                                                │
│  [ ✅ Promote ]   [ ✗ Revert ]   [ 💬 Iterate ]   [ ✏ Manual edit ]    │
│  [Approval needed: 0 / 1 second super-admin]   (if 2-person mode on)   │
└────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Header

- **Connection badges.** Three colored dots: DeepSeek / GitHub / Vercel. Each tooltips with the last successful call timestamp. Clicking opens the health-check details (Settings tab).
- **Usage chips.** Spent-this-month (auto-amber at 80% of cap, red at 95%), prompts-this-hour.
- **Templates button.** Opens the templates drawer.
- **History button.** Opens past generations list.

### 8.3 Empty states

| State | What's shown |
|---|---|
| First-time admin | Header welcome banner: "Welcome! Type a prompt below to start." with 3 example prompts as buttons |
| No prior generations | History drawer says "Your past generations will appear here." |
| `DEEPSEEK_API_KEY` not set | Full-page banner above everything: "DEEPSEEK_API_KEY is not configured. Go to Vercel → Environment Variables and add it, then redeploy." |

### 8.4 Loading / in-progress states

`StatusBar` shows 8 dots:
1. Validating
2. Rate-check
3. Context
4. DeepSeek
5. Parsing
6. Validating response
7. GitHub commit
8. Vercel build

Each dot is one of: `pending` (gray), `active` (blue with pulse animation), `done` (green), `failed` (red).

Above the bar: short status text + elapsed seconds + a Cancel button. Cancel posts to `DELETE /api/superadmin/code-assistant/generations/:id` and aborts the in-flight pipeline at the current stage.

### 8.5 Success state (preview-ready)

Sections 4–7 (Plan / Changes / Preview / Actions) appear in order with smooth transitions. Plan and diff are collapsible. Preview URL is prominent and links open in a new tab.

### 8.6 Error states

Always render the `ErrorPanel` in section 3 of the page. The panel can stack multiple errors if more than one occurred (rare).

---

## 9. Field specifications

### 9.1 `prompt` (required, multiline text)

| Property | Value |
|---|---|
| HTML | shadcn-ui `<Textarea>` |
| Rows initial | 8 |
| Auto-grow | up to 20 rows |
| Font | `font-mono text-sm` |
| Min length | 5 |
| Max length | 10,000 |
| Allowed | UTF-8 |
| Placeholder | `"Describe the change in plain English…"` |
| Helper text | `"Use plain English. Be specific about which page or feature."` |
| Counter format | `"{n} / 10,000 characters"` |
| Counter color | gray / amber (≥9,000) / red (≥9,800) |
| Validation trigger | on submit always; on blur after first submit attempt; live after first error |
| Submit blocked when | any error present |

Inline errors (red text + red border + `aria-invalid` + `aria-describedby`):

| Trigger | Code | Message |
|---|---|---|
| Empty | `prompt-required` | `"Please describe what you want to change."` |
| All whitespace | `prompt-whitespace` | `"Please describe what you want to change (whitespace only)."` |
| < 5 chars | `prompt-too-short` | `"Tell us a bit more — at least 5 characters."` |
| > 10,000 chars | `prompt-too-long` | `"Prompt is {n} / 10,000 characters. Shorten it or attach a file instead."` |

### 9.2 `attached_files` (optional, multi-value)

| Property | Value |
|---|---|
| UI | Chip list + "+ Add file" button opening a file-search modal |
| File source | `/api/superadmin/code-assistant/files?q=<query>` (filtered to `EDIT_ALLOWLIST`) |
| Max count | 5 |
| Default | 0 |
| Path validation | server-side allowlist + locklist (frontend pre-filters for UX only) |
| Helper text | `"Attach files DeepSeek should look at. Optional — DeepSeek can also find files itself."` |

Inline errors:

| Trigger | Code | Message |
|---|---|---|
| > 5 attached | `too-many-files` | `"You can attach up to 5 files. Remove one to add another."` |
| Path not in allowlist | `file-not-in-allowlist` | `"This file is locked and cannot be edited: {path}. Remove it from attachments."` |
| Path in locklist | `file-in-locklist` | `"`{path}` is feature-frozen and cannot be edited."` |
| File doesn't exist | `file-not-found` | `"File not found in current codebase: {path}."` |

### 9.3 `attached_image` (optional, single)

| Property | Value |
|---|---|
| UI | Drag-and-drop OR paste-from-clipboard zone OR "Choose image" button |
| Max size | 5 MB |
| Formats | PNG, JPEG, WebP |
| Helper | `"Optional. Paste a screenshot to point DeepSeek at the exact UI to change."` |

Inline errors:

| Trigger | Code | Message |
|---|---|---|
| File > 5 MB | `image-too-large` | `"Image is {size}; max 5 MB."` |
| Unsupported format | `image-format-unsupported` | `"Only PNG, JPEG, and WebP are supported."` |

Image is uploaded to a temporary Supabase Storage location and the URL is passed to DeepSeek's vision API endpoint (Phase 3). Until Phase 3, this field is disabled with a "Coming soon" tag.

### 9.4 `template` (optional, single)

| Property | Value |
|---|---|
| UI | Dropdown showing the admin's saved templates |
| Behavior | Selecting a template populates `prompt` (admin can edit further) |
| Helper | `"Or pick one of your saved templates."` |

No error states — selecting a template just fills the prompt; standard prompt validation applies.

### 9.5 Submit button

| State | Label | Disabled? | Spinner? |
|---|---|---|---|
| Idle | "Generate Code" | No | No |
| Validating | "Validating…" | Yes | Yes |
| Calling DeepSeek | "DeepSeek is thinking…" | Yes | Yes |
| Validating response | "Checking the response…" | Yes | Yes |
| Committing | "Committing to GitHub…" | Yes | Yes |
| Building preview | "Waiting for Vercel build…" | Yes | Yes |
| Self-healing (Phase 3) | "Asking DeepSeek to fix the build…" | Yes | Yes |
| Success | "Generate Code" | No | No |
| Error | "Generate Code" (error panel visible) | No | No |

Keyboard: `Cmd/Ctrl + Enter` from the textarea submits.

---

## 10. Error catalog — every error code

| Code | Stage | Title | Message | Hint |
|---|---|---|---|---|
| `prompt-required` | 1 | Prompt is empty | Please describe what you want to change. | Type your request in the prompt field. |
| `prompt-whitespace` | 1 | Prompt is empty | Please describe what you want to change (whitespace only). | Type your request in the prompt field. |
| `prompt-too-short` | 1 | Prompt too short | Tell us a bit more — at least 5 characters. | Be more specific about the change. |
| `prompt-too-long` | 1 | Prompt too long | Prompt is {n} / 10,000 characters. | Shorten the prompt or attach a file. |
| `too-many-files` | 1 | Too many attached files | You can attach up to 5 files. | Remove a file to add another. |
| `file-not-in-allowlist` | 1/6 | File not editable | This file is locked and cannot be edited: `{path}`. | Pick a different file. |
| `file-in-locklist` | 1/6 | Locked file refused | `{path}` is feature-frozen and cannot be edited. | Describe the desired behavior and ask DeepSeek to create a NEW file. |
| `file-not-found` | 1/4 | File not found | `{path}` doesn't exist in the codebase. | Re-attach an existing file. |
| `image-too-large` | 1 | Image too large | Image is {size}; max 5 MB. | Compress or crop the image. |
| `image-format-unsupported` | 1 | Unsupported image format | Only PNG, JPEG, and WebP are supported. | Convert and retry. |
| `not-superadmin` | 2 | Permission denied | Only super-admin can use this tool. You are: `{role}`. | Ask the owner to elevate your role. |
| `rate-limit-prompts` | 2 | Hourly limit reached | You've made 20 prompts this hour. | Wait {n} minutes. |
| `rate-limit-cost-daily` | 2 | Daily cost cap reached | Today's spend: ${spent} / ${cap}. | Wait or contact the owner to raise the cap. |
| `rate-limit-cost-monthly` | 2 | Monthly cost cap reached | This month's spend: ${spent} / ${cap}. | Contact the owner to raise the cap. |
| `missing-api-key` | 2 | DeepSeek not configured | `DEEPSEEK_API_KEY` is not set in Vercel env vars. | Add the env var, redeploy. |
| `missing-github-token` | 2 | GitHub not connected | `GITHUB_TOKEN` is not set in Vercel env vars. | Add a PAT with `repo` scope. |
| `missing-vercel-token` | 2 | Vercel not connected | `VERCEL_API_TOKEN` is not set. | Add a Vercel token. |
| `context-too-large` | 4 | Too much context | Attached files total {n} chars, over the {cap} budget. | Attach fewer or smaller files. |
| `deepseek-auth-failed` | 5 | DeepSeek auth failed (401) | DeepSeek rejected the API key. | Generate a new key at platform.deepseek.com. |
| `deepseek-rate-limit` | 5 | DeepSeek rate-limited (429) | DeepSeek throttled the request. | Wait 60s and retry. |
| `deepseek-timeout` | 5 | DeepSeek timeout | DeepSeek didn't respond within 90s. | Try a simpler prompt. |
| `deepseek-server-error` | 5 | DeepSeek server error (5xx) | DeepSeek returned a server error. | Retry; check status.deepseek.com. |
| `deepseek-content-filter` | 5 | Prompt rejected | DeepSeek refused the request (content filter). | Rephrase. |
| `deepseek-network-error` | 5 | Network error | Couldn't reach api.deepseek.com. | Check internet. |
| `fallback-provider-used` | 5 | Used fallback provider (info, not error) | DeepSeek failed; succeeded with {provider}. | None — informational. |
| `all-providers-failed` | 5 | All AI providers failed | DeepSeek, Claude, and OpenAI all failed. | Check provider status pages; retry. |
| `malformed-response` | 6 | Couldn't parse response | Reply wasn't valid JSON in the expected shape. | Click "Show raw output"; retry. |
| `empty-changeset` | 6 | No code changes proposed | DeepSeek decided no files needed editing. See the plan. | Refine the prompt. |
| `syntax-error` | 6 | Generated code has syntax errors | Code for `{path}` doesn't parse: `{err}`. | Rephrase the prompt. |
| `github-auth-failed` | 7 | GitHub auth failed | GitHub rejected the token. | Check `GITHUB_TOKEN` scope. |
| `github-rate-limit` | 7 | GitHub rate limit | GitHub API rate limit hit. | Wait {n} minutes. |
| `github-network-error` | 7 | GitHub unreachable | Couldn't reach api.github.com. | Check internet. |
| `github-conflict` | 7 | Branch name collision | Branch already exists. | Click "Generate Code" again. |
| `vercel-build-failed` | 8 | Preview build failed | Vercel build failed. | Open log; iterate or revert. |
| `vercel-build-timeout` | 8 | Build still running | Build has been running 5+ minutes. | Refresh. |
| `vercel-network-error` | 8 | Couldn't reach Vercel | Failed to poll preview status. | Retry. |
| `self-heal-gave-up` | self-heal | Auto-fix gave up | Tried to fix the build 3 times, still failing. | Iterate manually with a corrected prompt. |
| `pr-creation-failed` | promote | Couldn't open PR | GitHub error: `{err}`. | Check GitHub status. |
| `pr-checks-failing` | promote | CI checks are failing | Can't merge — checks failing. | View on GitHub; fix and iterate. |
| `merge-failed` | promote | Merge failed | GitHub merge failed: `{err}`. | Check branch is in sync. |
| `revert-failed` | revert | Couldn't close branch | GitHub error: `{err}`. | Retry; close manually if persistent. |
| `awaiting-second-approval` | promote | Awaiting second approval (info) | A second super-admin must approve before merge. | Share the URL with another super-admin. |
| `unknown-error` | * | Something went wrong | Unexpected error: `{message}`. | Copy details, contact owner. |

### Error UI contract

```ts
type ErrorView = {
  code: string;                        // one of the above
  title: string;
  message: string;
  hint?: string;
  details?: Record<string, unknown>;   // raw payload for "Show details"
  actions?: Array<{ label: string; onClick: () => void }>;
};
```

Stack of errors is rendered as separate `<Alert>` blocks in section 3.

---

## 11. Backend API contracts

### 11.1 `POST /api/superadmin/code-assistant/generate`

```ts
type GenerateRequest = {
  prompt: string;                                              // 5..10000 chars
  attached_files: string[];                                    // 0..5
  attached_image_storage_key?: string;                         // Phase 3
  template_id?: string;
  parent_generation_id?: string;                               // for iterate
};

type GenerateSuccessResponse = {
  ok: true;
  generation_id: string;
  plan: string;
  files: Array<{
    path: string;
    action: 'modify' | 'create';
    diff: string;                                              // unified
    additions: number;
    deletions: number;
    new_content: string;                                       // for Monaco editor
  }>;
  warnings: string[];
  branch_name: string;
  commit_sha: string;
  estimated_cost_usd: number;
  provider_used: 'deepseek' | 'claude' | 'openai';
  preview_url: null;                                           // filled by polling
};

type GenerateErrorResponse = {
  ok: false;
  error: {
    code: string;
    title: string;
    message: string;
    hint?: string;
    details?: Record<string, unknown>;
    stage: string;                                             // see state machine
  };
  generation_id?: string;
};
```

### 11.2 `GET /api/superadmin/code-assistant/preview-status/:generationId`

```ts
type PreviewStatusResponse =
  | { ok: true; status: 'building'; elapsed_sec: number; build_id: string }
  | { ok: true; status: 'ready'; preview_url: string; build_time_sec: number; build_id: string }
  | { ok: false; error: ErrorView; build_log_url?: string };
```

### 11.3 `POST /api/superadmin/code-assistant/promote/:generationId`

```ts
type PromoteResponse =
  | { ok: true; pr_number: number; pr_url: string; merged_at: string; production_url: string }
  | { ok: false; error: ErrorView }
  | { ok: true; status: 'awaiting-second-approval'; share_url: string };
```

### 11.4 `POST /api/superadmin/code-assistant/approve/:generationId`

For 2-person approval (Phase 4). Second super-admin POSTs this to finalize promote.

### 11.5 `POST /api/superadmin/code-assistant/revert/:generationId`

### 11.6 `POST /api/superadmin/code-assistant/iterate/:generationId` (Phase 3)

```ts
type IterateRequest = {
  follow_up_prompt: string;          // e.g. "Make the button blue instead"
};
// Response: same shape as GenerateSuccessResponse
```

### 11.7 `POST /api/superadmin/code-assistant/self-heal/:generationId` (Phase 3)

Backend feeds the Vercel build error back to DeepSeek and retries. Returns updated generation.

### 11.8 `POST /api/superadmin/code-assistant/apply-manual-edit/:generationId` (Phase 2)

```ts
type ApplyManualEditRequest = {
  path: string;
  new_content: string;
};
```

Admin hand-tweaked the file in Monaco; this commit goes on the same branch and Vercel rebuilds.

### 11.9 `GET /api/superadmin/code-assistant/history`

### 11.10 `GET /api/superadmin/code-assistant/files?q=<query>&limit=<n>`

### 11.11 `GET /api/superadmin/code-assistant/usage`

### 11.12 `GET /api/superadmin/code-assistant/templates` / `POST` / `DELETE :id`

### 11.13 `GET /api/superadmin/code-assistant/health`

```ts
type HealthResponse = {
  ok: boolean;
  checks: {
    deepseek: { ok: boolean; last_success_at?: string; error?: string };
    claude: { ok: boolean; last_success_at?: string; error?: string };
    openai: { ok: boolean; last_success_at?: string; error?: string };
    github: { ok: boolean; rate_limit_remaining?: number; error?: string };
    vercel: { ok: boolean; error?: string };
    supabase: { ok: boolean; error?: string };
  };
};
```

### 11.14 WebSocket: `ws://.../api/superadmin/code-assistant/stream/:generationId` (Phase 3)

Server pushes status events as the pipeline progresses:

```ts
type WsEvent =
  | { type: 'stage-changed'; stage: string; elapsed_sec: number }
  | { type: 'deepseek-chunk'; text: string }                      // streaming response
  | { type: 'file-validated'; path: string; ok: boolean }
  | { type: 'github-committed'; branch: string; sha: string }
  | { type: 'preview-status'; status: 'building' | 'ready' | 'failed'; url?: string }
  | { type: 'final'; result: GenerateSuccessResponse | GenerateErrorResponse };
```

In Phase 1, the frontend polls `/preview-status/:id` every 3 seconds. WebSocket replaces polling in Phase 3.

---

## 12. The DeepSeek integration — full system prompt

### 12.1 Provider and SDK

- Primary: DeepSeek (`baseURL: https://api.deepseek.com/v1`, model `deepseek-coder`)
- SDK: `openai` npm package (OpenAI-compatible)
- Temperature: `0.2`
- Max output tokens: `8000`
- Stream: `false` (v1), `true` (Phase 3 with WebSocket)
- Prompt caching: enabled on the system message

### 12.2 The full system prompt (exact text, cached)

````
You are a senior React + TypeScript developer assisting a super-admin of
Adamrit, a hospital management system. The admin describes a change in
natural language; you return precise code edits as structured JSON.

## Adamrit stack (must not deviate)

- React 18 (function components, hooks)
- TypeScript strict mode
- Vite 5
- shadcn-ui (Radix primitives) for components
- Tailwind CSS for styling (no styled-components, no CSS-in-JS, no SCSS)
- React Router v6 (BrowserRouter)
- @tanstack/react-query for server state
- react-hook-form + Zod for forms
- Supabase client from `src/integrations/supabase/client.ts`

## File layout

- src/pages/*.tsx                 — route components
- src/components/**/*.tsx         — reusable UI
- src/hooks/*.ts                  — data + state hooks
- src/lib/*.ts                    — utilities
- src/services/*.ts               — business-logic wrappers
- src/queries/*.ts                — react-query wrappers
- src/utils/*.ts                  — helpers
- src/contexts/*.tsx              — providers

## Conventions

- Pages are routed in `src/components/AppRoutes.tsx`. New page → also add a Route.
- Sidebar is `src/components/AppSidebar.tsx`. Navigable page → add menu entry.
- Use shadcn-ui (`Button`, `Card`, `Dialog`, `Input`, etc.) — never roll your own.
- For data: `useQuery` from `@tanstack/react-query`; don't use raw `useEffect` for fetching.
- Never bypass RLS — use the Supabase client.
- File names: PascalCase for components, camelCase for hooks/utilities.
- Default export name matches file: `PatientCard.tsx` exports `PatientCard`.
- Hook naming: `useFooData` (read), `useFooMutations` (write), `useSearchableFoo` (autocomplete).

## Files you MAY edit

- `src/pages/*.tsx` — except the locked list
- `src/components/**/*.tsx`
- `src/hooks/*.ts`
- `src/services/*.ts`
- `src/queries/*.ts`
- `src/utils/*.ts`
- `src/lib/*.ts` — except the locked list
- `src/contexts/*.tsx`

## Files you MUST NOT edit (return `files: []` and explain in `plan`)

- src/pages/FinalBill.tsx, FinalBillTest.tsx, EditFinalBill.tsx, FinalBill.tsx.backup
- src/pages/FinancialSummary.tsx, FinancialSummary-backup.tsx
- src/lib/permissions.ts
- src/lib/ruleEngine.ts, src/lib/sandbox.*
- src/lib/code-assistant/**
- src/integrations/supabase/types.ts (auto-generated)
- .github/**, supabase/migrations/**, scripts/**
- package.json, vite.config.ts, tsconfig.json, tailwind.config.ts

If the request needs a locked file: set `plan` to explain which file is locked
and why, and return `files: []`.

## Output format

Respond with exactly one fenced JSON code block — no prose before or after:

```json
{
  "plan": "<2-5 paragraph markdown — what you'll change and why>",
  "files": [
    {
      "path": "<repo-relative path>",
      "action": "modify" | "create",
      "content": "<FULL new file content; not a diff>"
    }
  ],
  "warnings": ["<optional caveats>"]
}
```

Rules:
- Return FULL new content per file (not a diff).
- Include all imports — TS needs them.
- Don't reference files or symbols that don't exist.
- Don't add npm dependencies — only use existing.
- Max 5 files per response.
- If ambiguous: ask in `plan`, return `files: []`.
- If can't be done with allowed files: explain, return `files: []`.

## Adamrit context summary

[Injected: contents of CLAUDE.md]

## Files the admin attached

[Injected: full content of attached files]

## Always-attached files

[Injected: src/components/AppRoutes.tsx, src/components/AppSidebar.tsx]
````

### 12.3 The user message format

```
The super-admin wants the following change:

<<<
{admin's prompt verbatim}
>>>

Respond with the JSON block as specified.
```

### 12.4 Image input (Phase 3)

When `attached_image` is present, the backend uses DeepSeek's vision endpoint (or, more reliably in Phase 3, falls back to Claude Sonnet or GPT-4o for vision since DeepSeek vision is less mature). The image is sent as a base64 data URL in a multi-modal message.

---

## 13. Multi-provider fallback (Phase 3)

### 13.1 Configuration

The AI Models tab (`/admin/ai-models`) lets the owner configure provider priority. Default chain: **DeepSeek → Claude → OpenAI**.

```ts
type ProviderConfig = {
  primary: 'deepseek' | 'claude' | 'openai';
  fallback_chain: Array<'deepseek' | 'claude' | 'openai'>;
  per_provider_settings: {
    deepseek: { model: string; api_key_env: 'DEEPSEEK_API_KEY' };
    claude:   { model: string; api_key_env: 'ANTHROPIC_API_KEY' };
    openai:   { model: string; api_key_env: 'OPENAI_API_KEY' };
  };
};
```

### 13.2 Fallback logic

```ts
async function callAIWithFallback(prompt: string, ctx: Context): Promise<AIResult> {
  const chain = [config.primary, ...config.fallback_chain.filter(p => p !== config.primary)];
  let lastError;
  for (const provider of chain) {
    if (!isProviderConfigured(provider)) continue;
    try {
      return await callProvider(provider, prompt, ctx);
    } catch (e) {
      lastError = e;
      logAttempt({ provider, error: e });
      if (isHardFailure(e)) throw e;          // auth fail, content filter — don't fallback
      // else continue to next provider
    }
  }
  throw new AIError('all-providers-failed', { lastError });
}
```

### 13.3 Cost-per-provider tracking

`code_assistant_generations.deepseek_cost_usd` becomes `provider_cost_usd` with a `provider_used` column. The Usage tab aggregates across providers.

---

## 14. Image input (Phase 3 detail)

### 14.1 UX

A drop zone next to the prompt field. Admin can:
- Drag-and-drop an image file
- Paste from clipboard (Cmd+V) — auto-detects image MIME
- Click "Choose image" to file-picker

The image is uploaded to a temporary Supabase Storage bucket (`code-assistant-images`, RLS: super-admin only) with a 24-hour TTL.

### 14.2 Server flow

1. Admin uploads → returns storage key `{user_id}/{uuid}.png`.
2. On submit, backend fetches the image from Storage (signed URL, 1h validity).
3. If primary provider supports vision, send the image with the prompt.
4. Otherwise, fall back to a vision-capable provider.

### 14.3 Vision-capable models per provider

| Provider | Vision model |
|---|---|
| DeepSeek | (limited as of late 2025; check current) |
| Claude | `claude-3-5-sonnet-20241022` or newer |
| OpenAI | `gpt-4o`, `gpt-4o-mini` |

If no vision-capable provider is configured, image upload is disabled with a tooltip explaining why.

---

## 15. Multi-turn iteration (Phase 3 detail)

### 15.1 Data model

A new `code_assistant_messages` table:

```sql
create table public.code_assistant_messages (
  id                   uuid primary key default gen_random_uuid(),
  generation_id        uuid not null references public.code_assistant_generations(id) on delete cascade,
  turn                 integer not null,
  role                 text not null check (role in ('user', 'assistant')),
  content              text not null,
  files_at_this_turn   jsonb,                 -- snapshot of files after this turn
  cost_usd             numeric(10, 4),
  created_at           timestamptz default now()
);
create index on public.code_assistant_messages (generation_id, turn);
```

### 15.2 UX

After Phase 1's preview-ready state, admin sees an **Iterate** button. Clicking opens a chat panel inline:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Iterate on this change                                  [Close chat] │
├──────────────────────────────────────────────────────────────────────┤
│ Admin: Add a CSV export button to Patients                           │
│ DeepSeek: I'll add the button using the xlsx library...              │
│ Admin: Make the button blue                                          │
│ DeepSeek: I changed the button's variant to "primary"...             │
│ Admin: [type your next refinement]                                   │
│ [ Send (Cmd+Enter) ]                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

Each turn:
1. Frontend POSTs `/iterate/:generationId` with `follow_up_prompt`.
2. Backend retrieves message history + current branch content.
3. Builds a multi-turn DeepSeek conversation.
4. Receives new file set.
5. Commits a NEW commit on the same branch (history visible in GitHub).
6. Vercel rebuilds.

### 15.3 Limits

- Max 10 turns per generation (configurable).
- Each turn counts toward hourly + cost limits.
- Closing the chat doesn't lose history — admin can reopen and continue.

---

## 16. Failure self-healing loop (Phase 3 detail)

### 16.1 Trigger

When `vercel-build-failed`, the UI shows an extra button: **[ 🩹 Try to auto-fix ]**.

### 16.2 Flow

1. Backend fetches Vercel's build log (last 100 lines).
2. Constructs a follow-up message: `"The Vercel build failed with this error:\n\n{log_excerpt}\n\nFix the code so it builds."`
3. Calls DeepSeek with the message + current branch files as context.
4. Receives new file set; commits to same branch.
5. Vercel rebuilds.
6. Repeat up to 3 times. On 4th failure → `self-heal-gave-up`, surface to admin.

### 16.3 Cost / safety

- Self-heal counts as a regular generation (each attempt counts toward hourly + cost limits).
- Each attempt is a new row in `code_assistant_messages` with `role='assistant'`.
- The admin can intervene at any time (Cancel button).

---

## 17. Visual diff editor with manual tweaks (Phase 2 detail)

### 17.1 UX

In the DiffView, each file has an **Edit in Monaco** button. Clicking opens a side-by-side diff in a Monaco editor:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Edit src/pages/Patients.tsx                                         │
├──────────────────────────────────┬──────────────────────────────────┤
│ Original (read-only)             │ Proposed (editable)              │
│                                  │                                  │
│ <Monaco diff editor with the     │                                  │
│  full file contents on both      │                                  │
│  sides>                          │                                  │
│                                  │                                  │
├──────────────────────────────────┴──────────────────────────────────┤
│  [ Save manual edit ]   [ Reset to DeepSeek's version ]   [Close]   │
└─────────────────────────────────────────────────────────────────────┘
```

### 17.2 Save flow

1. Admin clicks Save → POST `/apply-manual-edit/:generationId` with `{ path, new_content }`.
2. Backend validates: path in allowlist, not in locklist, TS parses.
3. Backend creates a new commit on the same branch.
4. Vercel rebuilds.
5. UI returns to the main view with the updated preview status.

### 17.3 Audit

Each manual edit writes:
- A `code_assistant_messages` row with `role='user'` and a synthetic content like `"manual edit to {path}"`.
- An `audit_trail` row.

---

## 18. Two-person approval (Phase 4 detail)

### 18.1 Configuration

Per-environment setting in System Settings tab:
- `TWO_PERSON_APPROVAL_ENABLED: boolean`
- Default off; turning on requires owner-level role.

### 18.2 Flow

1. Super-admin A clicks Promote.
2. Backend: generation enters `awaiting-second-approval`. Returns `share_url`.
3. UI shows: "Awaiting approval from a second super-admin. Share this link:" + a copy button.
4. Super-admin B opens the URL.
5. B sees the same generation view + an **[ Approve & Merge ]** button.
6. B clicks Approve.
7. Backend: opens PR, merges, main deploys.
8. Both A and B receive Slack notifications.

### 18.3 Auditing

`audit_trail` gets:
- `code-assistant.promote-initiated` (A)
- `code-assistant.promote-approved` (B)
- `code-assistant.promoted` (system, on successful merge)

---

## 19. Auto-generated tests (Phase 4 detail)

When DeepSeek proposes a code change, it also generates a Playwright test for the new behavior. The test file goes in `e2e/code-assistant-generated/{generation_id}.spec.ts`.

Adjustment to the system prompt:
> If the change is user-visible, also generate a `playwright` test that exercises the new behavior. Put it in `e2e/code-assistant-generated/{name}.spec.ts`. The test runs against the preview deploy URL before the admin sees the Promote button.

A new pipeline stage after stage 8:
- **Stage 9 — Run Playwright** against the preview URL. Result is shown in the UI: ✅ 23/23 passed or ❌ 2 failures (with failure details).
- Promote is enabled only when tests pass (configurable).

---

## 20. Saved prompt templates (Phase 2 detail)

### 20.1 Data model

```sql
create table public.code_assistant_templates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id),
  name          text not null,
  prompt        text not null,
  attached_files text[] default '{}',
  created_at    timestamptz default now(),
  used_count    integer default 0
);
```

### 20.2 UX

- "Save current as template" button next to the prompt field.
- Dropdown of templates in the prompt header.
- Templates drawer (right slide-in) for managing — rename, delete, see usage.

### 20.3 Sharing

Phase 4 — admins can mark templates `is_public` so other super-admins can use them.

---

## 21. Real-time status via WebSocket (Phase 3 detail)

In Phase 1, the frontend polls `/preview-status/:id` every 3 seconds (and runs the full pipeline POST request that completes when stage 7 is done). In Phase 3:

### 21.1 Server

Vercel functions don't support WebSockets directly, so use Supabase Realtime instead:
- Backend pipeline writes status updates to a `code_assistant_pipeline_events` table.
- Frontend subscribes to the table filtered by `generation_id`.
- Events flow as DB inserts → realtime channel → frontend.

### 21.2 Event types

| Event | When | Payload |
|---|---|---|
| `stage-changed` | each stage transition | `{ stage, elapsed_sec }` |
| `deepseek-chunk` | streaming token from DeepSeek | `{ text, total_chars_so_far }` |
| `file-validated` | each file in stage 6 | `{ path, ok, error? }` |
| `github-committed` | stage 7 done | `{ branch, sha }` |
| `preview-status` | Vercel polling | `{ status, url? }` |
| `playwright-results` | stage 9 done | `{ passed, failed, details? }` |

### 21.3 Result

Latency goes from "3-second polling cadence" to "sub-200ms event delivery". The status bar feels alive.

---

## 22. Security

### 22.1 `EDIT_ALLOWLIST` (globs)

```ts
export const EDIT_ALLOWLIST = [
  'src/pages/*.tsx',
  'src/pages/*/*.tsx',
  'src/components/*.tsx',
  'src/components/**/*.tsx',
  'src/hooks/*.ts',
  'src/services/*.ts',
  'src/queries/*.ts',
  'src/utils/*.ts',
  'src/lib/*.ts',
  'src/types/*.ts',
  'src/contexts/*.tsx',
];
```

### 22.2 `LOCK_LIST` (exact paths and prefix dirs)

```ts
export const LOCK_LIST = new Set([
  'src/pages/FinalBill.tsx', 'src/pages/FinalBillTest.tsx',
  'src/pages/EditFinalBill.tsx', 'src/pages/FinalBill.tsx.backup',
  'src/pages/FinancialSummary.tsx', 'src/pages/FinancialSummary-backup.tsx',
  'src/lib/permissions.ts',
  'src/lib/ruleEngine.ts', 'src/lib/sandbox.worker.ts', 'src/lib/sandbox.api.ts',
  'src/lib/code-assistant/allowlist.ts',
  'src/integrations/supabase/types.ts', 'src/integrations/supabase/client.ts',
  'package.json', 'package-lock.json',
  'vite.config.ts', 'tsconfig.json', 'tailwind.config.ts', 'postcss.config.js',
  '.env.example',
]);

export const LOCK_DIRS = [
  '.github/', 'supabase/migrations/', 'scripts/', 'e2e/', 'api/',
];
```

### 22.3 Six layers of defense for FinalBill

1. Frontend picker: FinalBill not selectable as attachment.
2. Backend stage 3: locklist check on attached files.
3. System prompt: tells DeepSeek the list.
4. Backend stage 6: locklist check on DeepSeek's response.
5. Branch policy: even if a commit slips, the branch can't merge into main without `check:finalbill`.
6. Build chain: Vercel runs `npm run check:finalbill` — fails the build if SHA changed.

### 22.4 Rate limits

| Window | Default | Env var |
|---|---|---|
| Prompts per hour (per admin) | 20 | `CODE_ASSIST_HOURLY_LIMIT` |
| USD per day (per admin) | 5 | `CODE_ASSIST_DAILY_COST_USD` |
| USD per month (per admin) | 50 | `CODE_ASSIST_MONTHLY_COST_USD` |
| Self-heal retries per generation | 3 | `CODE_ASSIST_SELF_HEAL_LIMIT` |
| Iteration turns per generation | 10 | `CODE_ASSIST_ITERATE_LIMIT` |

### 22.5 Audit trail

Every action writes to:
1. `code_assistant_generations` (rich row)
2. `audit_trail` (uniform action log)

Promotes, reverts, manual edits, iterates, approvals — all logged.

### 22.6 Input validation

Server-side always re-validates everything the frontend validated (defense in depth):
- prompt length
- attached file count
- allowlist + locklist
- rate limits
- cost caps

---

## 23. Data model — complete migration SQL

```sql
-- supabase/migrations/2026XXXXXX_code_assistant.sql

create extension if not exists "uuid-ossp";

-- ─── Generations ─────────────────────────────────────────────────────────
create table public.code_assistant_generations (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete restrict,
  parent_generation_id        uuid references public.code_assistant_generations(id),
  prompt                      text not null check (length(prompt) between 5 and 10000),
  attached_files              text[] not null default '{}'::text[],
  attached_image_storage_key  text,
  template_id                 uuid,
  provider_used               text,                          -- 'deepseek' | 'claude' | 'openai'
  deepseek_model              text,
  request_tokens              integer,
  response_tokens             integer,
  cost_usd                    numeric(10, 4),
  plan                        text,
  proposed_files              jsonb,
  warnings                    jsonb default '[]'::jsonb,
  branch_name                 text,
  commit_sha                  text,
  pr_number                   integer,
  pr_url                      text,
  preview_url                 text,
  preview_build_seconds       integer,
  playwright_results          jsonb,
  status                      text not null,
  error_code                  text,
  error_details               jsonb,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  promoted_at                 timestamptz,
  promoted_by                 uuid references auth.users(id),
  approved_by                 uuid references auth.users(id),
  reverted_at                 timestamptz
);

create index idx_code_assist_gen_user_created on public.code_assistant_generations (user_id, created_at desc);
create index idx_code_assist_gen_status on public.code_assistant_generations (status) where status not in ('promoted', 'reverted');
create index idx_code_assist_gen_parent on public.code_assistant_generations (parent_generation_id) where parent_generation_id is not null;

-- Status check constraint (all known states)
alter table public.code_assistant_generations add constraint code_assistant_generations_status_chk check (status in (
  'validating-payload', 'checking-rate-limit', 'loading-context', 'calling-deepseek',
  'parsing-response', 'validating-response', 'committing-to-github', 'preview-pending',
  'preview-ready', 'iterating', 'self-healing', 'manual-edit-pending',
  'promoting', 'awaiting-second-approval', 'promoted', 'reverting', 'reverted',
  'failed-validation', 'failed-rate-limit-prompts', 'failed-rate-limit-cost-daily',
  'failed-rate-limit-cost-monthly', 'failed-context',
  'failed-deepseek-auth', 'failed-deepseek-rate-limit', 'failed-deepseek-timeout',
  'failed-deepseek-server', 'failed-deepseek-network', 'failed-deepseek-content-filter',
  'failed-all-providers',
  'failed-malformed-response', 'failed-empty-changeset', 'failed-syntax',
  'failed-allowlist', 'failed-locklist',
  'failed-github-auth', 'failed-github-conflict', 'failed-github-rate-limit', 'failed-github-network',
  'failed-vercel-build', 'failed-vercel-timeout', 'failed-vercel-network',
  'failed-self-heal-gave-up',
  'failed-pr', 'failed-pr-checks', 'failed-merge', 'failed-revert',
  'failed-unknown'
));

-- ─── Multi-turn messages ────────────────────────────────────────────────
create table public.code_assistant_messages (
  id                   uuid primary key default gen_random_uuid(),
  generation_id        uuid not null references public.code_assistant_generations(id) on delete cascade,
  turn                 integer not null,
  role                 text not null check (role in ('user', 'assistant', 'system')),
  content              text not null,
  files_at_this_turn   jsonb,
  cost_usd             numeric(10, 4),
  created_at           timestamptz default now()
);
create index on public.code_assistant_messages (generation_id, turn);

-- ─── Templates ──────────────────────────────────────────────────────────
create table public.code_assistant_templates (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  prompt          text not null,
  attached_files  text[] default '{}'::text[],
  is_public       boolean default false,
  used_count      integer default 0,
  created_at      timestamptz default now()
);

-- ─── Pipeline events (for WebSocket via Supabase Realtime) ──────────────
create table public.code_assistant_pipeline_events (
  id              uuid primary key default gen_random_uuid(),
  generation_id   uuid not null references public.code_assistant_generations(id) on delete cascade,
  event_type      text not null,
  payload         jsonb not null,
  created_at      timestamptz default now()
);
create index on public.code_assistant_pipeline_events (generation_id, created_at);

-- ─── Rate limits ────────────────────────────────────────────────────────
create table public.code_assistant_rate_limits (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  prompts_this_hour    integer not null default 0,
  hour_started_at      timestamptz not null default now(),
  cost_today_usd       numeric(10, 4) not null default 0,
  day_started_at       date not null default current_date,
  cost_this_month_usd  numeric(10, 4) not null default 0,
  month_started_at     date not null default date_trunc('month', current_date),
  updated_at           timestamptz not null default now()
);

-- ─── Provider config (single-row table, owner-edited) ───────────────────
create table public.code_assistant_provider_config (
  id                     uuid primary key default gen_random_uuid(),
  primary_provider       text not null default 'deepseek',
  fallback_chain         text[] not null default array['claude', 'openai'],
  per_provider_settings  jsonb not null default '{}'::jsonb,
  updated_at             timestamptz default now(),
  updated_by             uuid references auth.users(id)
);

-- ─── RLS ────────────────────────────────────────────────────────────────
alter table public.code_assistant_generations enable row level security;
alter table public.code_assistant_messages enable row level security;
alter table public.code_assistant_templates enable row level security;
alter table public.code_assistant_pipeline_events enable row level security;
alter table public.code_assistant_rate_limits enable row level security;
alter table public.code_assistant_provider_config enable row level security;

create policy "users read own generations" on public.code_assistant_generations for select
  using (user_id = auth.uid() or (auth.jwt() ->> 'role') = 'superadmin');

create policy "users read own messages" on public.code_assistant_messages for select
  using (exists (select 1 from public.code_assistant_generations g
                 where g.id = generation_id and (g.user_id = auth.uid() or (auth.jwt() ->> 'role') = 'superadmin')));

create policy "users read own templates" on public.code_assistant_templates for select
  using (user_id = auth.uid() or is_public = true);

create policy "events readable by generation owner" on public.code_assistant_pipeline_events for select
  using (exists (select 1 from public.code_assistant_generations g
                 where g.id = generation_id and (g.user_id = auth.uid() or (auth.jwt() ->> 'role') = 'superadmin')));

create policy "users read own rate-limit row" on public.code_assistant_rate_limits for select
  using (user_id = auth.uid());

create policy "anyone read provider config" on public.code_assistant_provider_config for select using (true);

-- Writes only from API functions (service role bypasses RLS).
create policy "no direct writes" on public.code_assistant_generations for all to authenticated using (false) with check (false);
create policy "no direct writes msg" on public.code_assistant_messages for all to authenticated using (false) with check (false);
create policy "no direct writes events" on public.code_assistant_pipeline_events for all to authenticated using (false) with check (false);
create policy "no direct writes rl" on public.code_assistant_rate_limits for all to authenticated using (false) with check (false);
create policy "templates: owner can write" on public.code_assistant_templates for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── Updated-at trigger ────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger as $$
  begin new.updated_at := now(); return new; end;
$$ language plpgsql;

create trigger code_assist_gen_touch before update on public.code_assistant_generations for each row execute function public.touch_updated_at();
create trigger code_assist_rl_touch before update on public.code_assistant_rate_limits for each row execute function public.touch_updated_at();

-- ─── Storage bucket for attached images (Phase 3) ──────────────────────
insert into storage.buckets (id, name, public) values ('code-assistant-images', 'code-assistant-images', false);
-- RLS: super-admin only
```

After applying: `npm run generate-types` to refresh `src/integrations/supabase/types.ts`.

---

## 24. Code samples for critical pieces

### 24.1 DeepSeek client wrapper (`api/lib/deepseek.ts`)

```ts
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
  timeout: parseInt(process.env.DEEPSEEK_TIMEOUT_MS ?? '90000'),
});

export class AIError extends Error {
  constructor(public code: string, public details?: unknown) { super(code); }
}

const SYSTEM_PROMPT = `...full prompt from §12.2...`;

export type AIResult = {
  plan: string;
  files: Array<{ path: string; action: 'modify' | 'create'; content: string }>;
  warnings: string[];
  request_tokens: number;
  response_tokens: number;
  cost_usd: number;
  provider: 'deepseek';
};

export async function callDeepSeek(prompt: string, contextFiles: Array<{ path: string; content: string }>): Promise<AIResult> {
  if (!process.env.DEEPSEEK_API_KEY) throw new AIError('missing-api-key');

  const userMessage = buildUserMessage(prompt, contextFiles);

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL ?? 'deepseek-coder',
      temperature: 0.2,
      max_tokens: 8000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });
  } catch (e: any) {
    throw mapOpenAIError(e, 'deepseek');
  }

  const raw = completion.choices[0]?.message?.content ?? '';
  const parsed = parseJsonBlock(raw);

  return {
    plan: parsed.plan,
    files: parsed.files,
    warnings: parsed.warnings ?? [],
    request_tokens: completion.usage?.prompt_tokens ?? 0,
    response_tokens: completion.usage?.completion_tokens ?? 0,
    cost_usd: estimateCost(completion.usage, 'deepseek'),
    provider: 'deepseek',
  };
}

function mapOpenAIError(e: any, provider: string): AIError {
  if (e.status === 401) return new AIError(`${provider}-auth-failed`, e);
  if (e.status === 429) return new AIError(`${provider}-rate-limit`, e);
  if (e.status === 400 && /content/i.test(e.message ?? '')) return new AIError(`${provider}-content-filter`, e);
  if (e.status >= 500) return new AIError(`${provider}-server-error`, e);
  if (e.code === 'ETIMEDOUT' || e.name === 'AbortError') return new AIError(`${provider}-timeout`, e);
  if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND') return new AIError(`${provider}-network-error`, e);
  return new AIError(`${provider}-unknown`, e);
}

function buildUserMessage(prompt: string, files: Array<{ path: string; content: string }>): string {
  return `The super-admin wants the following change:\n\n<<<\n${prompt}\n>>>\n\nRelevant files:\n${files.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')}\n\nRespond with the JSON block as specified.`;
}

function parseJsonBlock(raw: string): any {
  const match = raw.match(/```json\s*([\s\S]+?)```/) ?? raw.match(/(\{[\s\S]+\})/);
  if (!match) throw new AIError('malformed-response', { raw });
  try {
    const parsed = JSON.parse(match[1]);
    if (typeof parsed.plan !== 'string' || !Array.isArray(parsed.files)) throw new AIError('malformed-response', { raw, parsed });
    return parsed;
  } catch {
    throw new AIError('malformed-response', { raw });
  }
}

function estimateCost(usage: any, provider: string): number {
  const inT = usage?.prompt_tokens ?? 0;
  const outT = usage?.completion_tokens ?? 0;
  const pricing = {
    deepseek: { in: 0.14e-6, out: 0.28e-6 },
    claude:   { in: 3.00e-6, out: 15.00e-6 },
    openai:   { in: 2.50e-6, out: 10.00e-6 },
  }[provider] ?? { in: 0, out: 0 };
  return inT * pricing.in + outT * pricing.out;
}
```

### 24.2 Provider-fallback orchestrator (`api/lib/ai-orchestrator.ts`)

```ts
import { callDeepSeek } from './deepseek';
import { callClaude } from './claude';
import { callOpenAI } from './openai';
import { AIError } from './deepseek';

const PROVIDER_FUNCS = {
  deepseek: callDeepSeek,
  claude: callClaude,
  openai: callOpenAI,
};

export async function callAIWithFallback(prompt: string, ctx: any, providerConfig: ProviderConfig): Promise<AIResult> {
  const chain = [providerConfig.primary, ...providerConfig.fallback_chain.filter(p => p !== providerConfig.primary)];
  const attempts: Array<{ provider: string; error: AIError }> = [];

  for (const provider of chain) {
    if (!isProviderConfigured(provider)) continue;
    try {
      const result = await PROVIDER_FUNCS[provider](prompt, ctx);
      if (attempts.length > 0) result.warnings = [...(result.warnings ?? []), `Fell back to ${provider} after: ${attempts.map(a => a.provider).join(', ')}`];
      return result;
    } catch (e: any) {
      if (e instanceof AIError) {
        attempts.push({ provider, error: e });
        if (/auth-failed|content-filter/.test(e.code)) throw e;
        continue;
      }
      throw e;
    }
  }
  throw new AIError('all-providers-failed', { attempts });
}

function isProviderConfigured(provider: string): boolean {
  return {
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    claude:   !!process.env.ANTHROPIC_API_KEY,
    openai:   !!process.env.OPENAI_API_KEY,
  }[provider] ?? false;
}
```

### 24.3 Frontend PromptField (`PromptField.tsx`)

```tsx
import { Textarea } from '@/components/ui/textarea';
import type { FieldError } from './types';

const MAX = 10_000;

export function PromptField({ value, onChange, error, onClearError }: {
  value: string; onChange: (v: string) => void;
  error: FieldError | null; onClearError: () => void;
}) {
  const len = value.length;
  const counterColor = len < 9_000 ? 'text-muted-foreground' : len < 9_800 ? 'text-amber-600' : 'text-destructive';

  return (
    <div>
      <label htmlFor="prompt" className="text-sm font-medium">
        📝 What do you want to change in Adamrit?<span className="text-destructive ml-0.5">*</span>
      </label>
      <Textarea
        id="prompt"
        rows={8}
        className={`font-mono text-sm mt-2 ${error ? 'border-destructive' : ''}`}
        placeholder="Describe the change in plain English…"
        value={value}
        onChange={(e) => { onChange(e.target.value); if (error) onClearError(); }}
        aria-invalid={!!error}
        aria-describedby={error ? 'prompt-error' : 'prompt-help'}
      />
      <div className="flex justify-between mt-1.5">
        <p id="prompt-help" className="text-xs text-muted-foreground">
          Use plain English. Be specific about which page or feature.
        </p>
        <p className={`text-xs ${counterColor}`}>{len.toLocaleString()} / {MAX.toLocaleString()} characters</p>
      </div>
      {error && (
        <p id="prompt-error" className="text-xs text-destructive mt-1 flex items-center gap-1">
          <span>⚠</span>{error.message}
        </p>
      )}
    </div>
  );
}
```

### 24.4 Frontend validation (`useFieldValidation.ts`)

```ts
import type { FieldError } from './types';

export function validatePrompt(value: string): FieldError | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { code: 'prompt-required', message: 'Please describe what you want to change.' };
  if (trimmed.length < 5) return { code: 'prompt-too-short', message: 'Tell us a bit more — at least 5 characters.' };
  if (value.length > 10_000) return { code: 'prompt-too-long', message: `Prompt is ${value.length.toLocaleString()} / 10,000 characters. Shorten it or attach a file instead.` };
  return null;
}

export function validateAttachments(paths: string[]): FieldError | null {
  if (paths.length > 5) return { code: 'too-many-files', message: 'You can attach up to 5 files. Remove one to add another.' };
  return null;
}

export function validateImage(file: File | null): FieldError | null {
  if (!file) return null;
  if (file.size > 5 * 1024 * 1024) return { code: 'image-too-large', message: `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB; max 5 MB.` };
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return { code: 'image-format-unsupported', message: 'Only PNG, JPEG, and WebP are supported.' };
  return null;
}
```

### 24.5 ErrorPanel (`ErrorPanel.tsx`)

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { ErrorView } from './types';

export function ErrorPanel({ errors }: { errors: ErrorView[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="mt-4 space-y-3">
      {errors.map((e, i) => <SingleError key={i} error={e} />)}
    </div>
  );
}

function SingleError({ error }: { error: ErrorView }) {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <Alert variant="destructive">
      <AlertTitle className="flex items-center gap-2"><span>❌</span>{error.title}</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        {error.hint && <p className="mt-2 text-xs italic">💡 {error.hint}</p>}
        <div className="mt-3 flex gap-2 items-center flex-wrap">
          {error.actions?.map(a => (
            <Button key={a.label} size="sm" variant="secondary" onClick={a.onClick}>{a.label}</Button>
          ))}
          {error.details && (
            <Button size="sm" variant="ghost" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? '▾ Hide details' : '▸ Show details'}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(JSON.stringify({ code: error.code, ...error.details }, null, 2))}>
            Copy error
          </Button>
        </div>
        {showDetails && error.details && (
          <pre className="mt-3 text-xs bg-muted p-2 rounded overflow-x-auto">
            {JSON.stringify(error.details, null, 2)}
          </pre>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

### 24.6 Backend `generate.ts` (key flow)

```ts
import { getSessionUser } from '../../lib/auth';
import { validatePrompt, validateAttachments } from '../../lib/validate';
import { validatePath } from '../../lib/allowlist';
import { checkAndIncrementRateLimit } from '../../lib/ratelimit';
import { loadContext } from '../../lib/context';
import { callAIWithFallback } from '../../lib/ai-orchestrator';
import { commitToGitHub } from '../../lib/github';
import { insertGeneration, updateGeneration } from '../../lib/db';
import { errorResponse, successResponse } from '../../lib/responses';
import { writePipelineEvent } from '../../lib/realtime';

export default async function handler(req: Request): Promise<Response> {
  const user = await getSessionUser(req);
  if (!user) return errorResponse('not-superadmin', 401);
  if (user.role !== 'superadmin') return errorResponse('not-superadmin', 403);

  const body = await req.json();

  const f1 = validatePrompt(body.prompt); if (f1) return errorResponse(f1.code, 400, f1);
  const f2 = validateAttachments(body.attached_files ?? []); if (f2) return errorResponse(f2.code, 400, f2);

  for (const path of body.attached_files) {
    const v = validatePath(path);
    if (!v.ok) return errorResponse(v.reason!, 400, { path });
  }

  try {
    await checkAndIncrementRateLimit(user.id);
  } catch (e: any) {
    return errorResponse(e.code, 429, e.details);
  }

  let ctx;
  try { ctx = await loadContext(body.attached_files); }
  catch (e: any) { return errorResponse('context-too-large', 400, e.details); }

  const gen = await insertGeneration({
    user_id: user.id, prompt: body.prompt, attached_files: body.attached_files,
    parent_generation_id: body.parent_generation_id ?? null,
    status: 'calling-deepseek',
  });
  await writePipelineEvent(gen.id, 'stage-changed', { stage: 'calling-deepseek' });

  let ai;
  try { ai = await callAIWithFallback(body.prompt, ctx, await getProviderConfig()); }
  catch (e: any) {
    await updateGeneration(gen.id, { status: `failed-${e.code}`, error_code: e.code, error_details: e.details });
    return errorResponse(e.code, 502, e.details, { generation_id: gen.id });
  }

  await updateGeneration(gen.id, {
    plan: ai.plan, proposed_files: ai.files, warnings: ai.warnings,
    provider_used: ai.provider, request_tokens: ai.request_tokens,
    response_tokens: ai.response_tokens, cost_usd: ai.cost_usd,
    status: 'validating-response',
  });

  if (ai.files.length === 0) {
    await updateGeneration(gen.id, { status: 'failed-empty-changeset' });
    return errorResponse('empty-changeset', 200, { plan: ai.plan }, { generation_id: gen.id });
  }
  for (const f of ai.files) {
    const v = validatePath(f.path);
    if (!v.ok) {
      await updateGeneration(gen.id, { status: `failed-${v.reason}`, error_code: v.reason });
      return errorResponse(v.reason!, 400, { path: f.path }, { generation_id: gen.id });
    }
    const pe = checkParsesAsTypeScript(f.content);
    if (pe) {
      await updateGeneration(gen.id, { status: 'failed-syntax', error_code: 'syntax-error', error_details: pe });
      return errorResponse('syntax-error', 400, { path: f.path, parser_error: pe.message }, { generation_id: gen.id });
    }
  }

  let branch;
  try { branch = await commitToGitHub(user.id, gen.id, ai.files); }
  catch (e: any) {
    await updateGeneration(gen.id, { status: `failed-${e.code}`, error_code: e.code });
    return errorResponse(e.code, 502, e.details, { generation_id: gen.id });
  }

  await updateGeneration(gen.id, {
    branch_name: branch.name, commit_sha: branch.sha, status: 'preview-pending',
  });
  await writePipelineEvent(gen.id, 'github-committed', { branch: branch.name, sha: branch.sha });

  return successResponse({
    generation_id: gen.id,
    plan: ai.plan,
    files: ai.files.map(f => ({
      path: f.path, action: f.action, new_content: f.content,
      diff: computeDiff(f.path, f.content),
      additions: countAdditions(f.path, f.content),
      deletions: countDeletions(f.path, f.content),
    })),
    warnings: ai.warnings,
    branch_name: branch.name, commit_sha: branch.sha,
    estimated_cost_usd: ai.cost_usd,
    provider_used: ai.provider,
    preview_url: null,
  });
}
```

### 24.7 GitHub commit helper (`api/lib/github.ts`)

```ts
import { Octokit } from '@octokit/rest';

const REPO_OWNER = 'chatgptnotes';
const REPO_NAME = 'adamrit.com';
const BASE_BRANCH = 'main';

const oct = new Octokit({ auth: process.env.GITHUB_TOKEN });

export class GitHubError extends Error {
  constructor(public code: string, public details?: unknown) { super(code); }
}

export async function commitToGitHub(userId: string, generationId: string, files: Array<{ path: string; action: string; content: string }>): Promise<{ name: string; sha: string }> {
  if (!process.env.GITHUB_TOKEN) throw new GitHubError('missing-github-token');

  const branchName = `superadmin-edits/${new Date().toISOString().replace(/[:.]/g, '-')}-${userId.slice(0, 8)}`;

  try {
    const { data: baseRef } = await oct.git.getRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${BASE_BRANCH}` });
    await oct.git.createRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `refs/heads/${branchName}`, sha: baseRef.object.sha });

    let lastCommit = baseRef.object.sha;
    let lastTree = (await oct.git.getCommit({ owner: REPO_OWNER, repo: REPO_NAME, commit_sha: lastCommit })).data.tree.sha;

    for (const file of files) {
      const blob = await oct.git.createBlob({ owner: REPO_OWNER, repo: REPO_NAME, content: Buffer.from(file.content).toString('base64'), encoding: 'base64' });
      const tree = await oct.git.createTree({ owner: REPO_OWNER, repo: REPO_NAME, base_tree: lastTree, tree: [{ path: file.path, mode: '100644', type: 'blob', sha: blob.data.sha }] });
      const commit = await oct.git.createCommit({ owner: REPO_OWNER, repo: REPO_NAME, message: `code-assistant: ${file.action} ${file.path}\n\nGeneration ${generationId}`, tree: tree.data.sha, parents: [lastCommit] });
      lastCommit = commit.data.sha;
      lastTree = tree.data.sha;
    }
    await oct.git.updateRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${branchName}`, sha: lastCommit });
    return { name: branchName, sha: lastCommit };
  } catch (e: any) {
    if (e.status === 401) throw new GitHubError('github-auth-failed', e);
    if (e.status === 422) throw new GitHubError('github-conflict', e);
    if (e.status === 429 || e.status === 403) throw new GitHubError('github-rate-limit', e);
    if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND') throw new GitHubError('github-network-error', e);
    throw new GitHubError('github-unknown', e);
  }
}
```

---

## 25. Environment variables

| Name | Required | Default | Purpose |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | yes | — | User-provided |
| `DEEPSEEK_BASE_URL` | no | `https://api.deepseek.com/v1` | Override |
| `DEEPSEEK_MODEL` | no | `deepseek-coder` | Model |
| `DEEPSEEK_TIMEOUT_MS` | no | `90000` | Per-call timeout |
| `ANTHROPIC_API_KEY` | no | — | Fallback provider |
| `OPENAI_API_KEY` | no | — | Fallback provider |
| `GITHUB_TOKEN` | yes | — | `repo` scope |
| `VERCEL_API_TOKEN` | yes | — | Polling preview status |
| `VERCEL_PROJECT_ID` | yes | — | Adamrit project ID |
| `VERCEL_TEAM_ID` | no | — | If team-scoped |
| `CODE_ASSIST_HOURLY_LIMIT` | no | `20` | Prompts/hour/admin |
| `CODE_ASSIST_DAILY_COST_USD` | no | `5` | Daily cap |
| `CODE_ASSIST_MONTHLY_COST_USD` | no | `50` | Monthly cap |
| `CODE_ASSIST_CONTEXT_BUDGET_CHARS` | no | `200000` | Max context chars |
| `CODE_ASSIST_SELF_HEAL_LIMIT` | no | `3` | Auto-fix retries |
| `CODE_ASSIST_ITERATE_LIMIT` | no | `10` | Turns per generation |
| `CODE_ASSIST_2PERSON_APPROVAL` | no | `false` | Toggle 2-person promote |
| `SLACK_WEBHOOK_URL` | no | — | Notifications |

---

## 26. Cost projection across providers

Per generation (typical: 8K input tokens, 3K output tokens, system prompt cached):

| Provider | In rate | Out rate | Cost/gen |
|---|---|---|---|
| DeepSeek `deepseek-coder` | $0.14/M | $0.28/M | ~$0.002 |
| Claude `sonnet-4-6` | $3/M | $15/M | ~$0.069 |
| OpenAI `gpt-4o` | $2.5/M | $10/M | ~$0.050 |

For 100 generations/month:
- All DeepSeek: ~$0.20
- All Claude: ~$6.90
- All OpenAI: ~$5.00
- Mixed with 5% fallback to Claude: ~$0.55

Monthly cap of $50 is essentially a runaway guardrail.

---

## 27. Test plan

### 27.1 Field validation (all in Phase 1)

| # | Input | Expected error code | Expected UI |
|---|---|---|---|
| FV-1 | empty, submit | `prompt-required` | red border + "Please describe…" |
| FV-2 | "  ", submit | `prompt-whitespace` | red border + whitespace msg |
| FV-3 | "hi", submit | `prompt-too-short` | red border + "≥5 characters" |
| FV-4 | 10,001 chars, submit | `prompt-too-long` | red border + counter |
| FV-5 | attach 6 files | `too-many-files` | inline error |
| FV-6 | attach FinalBill.tsx | `file-in-locklist` | inline error |
| FV-7 | attach nonexistent path | `file-not-found` | inline error |
| FV-8 | upload 6 MB image | `image-too-large` | inline error |
| FV-9 | upload .gif | `image-format-unsupported` | inline error |

### 27.2 API errors

| # | Setup | Expected error |
|---|---|---|
| API-1 | `DEEPSEEK_API_KEY` unset | full-page banner `missing-api-key` |
| API-2 | invalid `DEEPSEEK_API_KEY`, no fallbacks | error panel `deepseek-auth-failed` |
| API-3 | invalid `DEEPSEEK_API_KEY`, Claude configured | success with warning `fallback-provider-used: claude` |
| API-4 | mock 429 from DeepSeek | error panel `deepseek-rate-limit` |
| API-5 | mock 100s delay | error panel `deepseek-timeout` |
| API-6 | mock plain-text response | error panel `malformed-response` with raw output |
| API-7 | DeepSeek returns `files: []` | error panel `empty-changeset` + plan |
| API-8 | DeepSeek returns FinalBill edit | error panel `file-in-locklist` |
| API-9 | DeepSeek returns invalid TS | error panel `syntax-error` |
| API-10 | invalid `GITHUB_TOKEN` | error panel `github-auth-failed` |
| API-11 | Vercel build fails | error panel `vercel-build-failed` with log link |
| API-12 | all providers fail | error panel `all-providers-failed` |

### 27.3 Happy paths

| # | Action | Expected |
|---|---|---|
| HP-1 | Prompt "Add a heading 'Test' to LandingPage", generate | Plan + diff + preview URL renders new heading |
| HP-2 | Promote HP-1 | PR opens, auto-merges, main deploy shows heading |
| HP-3 | Revert HP-1 | Branch closes, no production change |
| HP-4 | Iterate on HP-1: "make the heading red" | New commit on same branch, preview updates |
| HP-5 | Vercel build fails → click Try Auto-Fix | Self-heal commits fix, build passes |
| HP-6 | Manual edit a file in Monaco → Save | New commit on same branch, preview updates |

### 27.4 Rate limits

| # | Setup | Expected |
|---|---|---|
| RL-1 | 21 prompts in an hour | 21st returns `rate-limit-prompts` |
| RL-2 | Daily cost > $5 | Next request `rate-limit-cost-daily` |
| RL-3 | Monthly cost > $50 | Next request `rate-limit-cost-monthly` |
| RL-4 | Self-heal 4× | 4th returns `self-heal-gave-up` |

### 27.5 Security

| # | Setup | Expected |
|---|---|---|
| SEC-1 | call API as non-superadmin | 403 `not-superadmin` |
| SEC-2 | call with no session | 401 |
| SEC-3 | DeepSeek tries `.github/workflows/x.yml` | `file-in-locklist` |
| SEC-4 | DeepSeek tries `../etc/passwd` | `file-not-in-allowlist` |
| SEC-5 | hypothetically: bug allows FinalBill commit | `check:finalbill` blocks the Vercel build |

### 27.6 Multi-turn (Phase 3)

| # | Action | Expected |
|---|---|---|
| MT-1 | Generate then iterate 10 times | 11th iteration blocked with `iterate-limit-reached` |
| MT-2 | Iterate, revert, iterate again | Each turn writes a message row; revert flips status; next iterate spawns a new generation linked via `parent_generation_id` |

### 27.7 Two-person approval (Phase 4)

| # | Setup | Expected |
|---|---|---|
| TP-1 | `TWO_PERSON_APPROVAL_ENABLED=true`, A clicks Promote | status `awaiting-second-approval` + share URL |
| TP-2 | Same admin tries to Approve | rejected: "second approver must be different" |
| TP-3 | Second super-admin clicks Approve | PR merges, production deploys |

---

## 28. Telemetry & observability

### 28.1 Structured logs (every API call)

```ts
log({
  timestamp: new Date().toISOString(),
  request_id: req.id,
  user_id: user.id,
  endpoint: 'POST /api/superadmin/code-assistant/generate',
  stage: 'calling-deepseek',
  duration_ms: 42100,
  outcome: 'success',
  generation_id: gen.id,
  provider: 'deepseek',
  tokens_in: 8123,
  tokens_out: 2941,
  cost_usd: 0.0018,
});
```

Output to Vercel logs + a Supabase `function_logs` table (rotates after 30 days).

### 28.2 Metrics dashboard (Usage tab)

- Generations per day (chart)
- Cost per provider per day (stacked)
- Error rate by code (table)
- p50 / p95 DeepSeek latency
- Top admins by usage
- Promote vs Revert ratio
- Vercel build success rate
- Time-to-promote (mean from generation start to merge)

### 28.3 Alerts

- Slack on `vercel-build-failed`
- Slack on 80% monthly cap
- Slack on 95% monthly cap (hard alert)
- Daily digest: yesterday's generations / promotes / reverts / spend

---

# PART C — COMPANION TABS (SKETCH LEVEL)

## 29. Logic Studio tab

Brings back the multi-tier rule editor from earlier planning:
- **T1 Parameters** — form-based editor for numbers/toggles. Example extractions: `pharmacy.low-stock-threshold`, `payments.alert-thresholds`.
- **T2 Conditional rules** — when/then visual builder. Example: discount-approval rule.
- **T3 Workflows** — React Flow canvas with typed nodes. Example: discharge clearance workflow.
- Powered by `business_rules` table + `ruleEngine.ts` module in adamrit.
- See earlier-plan-history for the rule engine design.

**Phase 4**, depends on Phase 1 audit + permissions plumbing.

## 30. Users & Roles tab

- Table view of all users in `auth.users` joined with a `user_roles` table.
- Filters: role (superadmin / admin / doctor / nurse / billing), status (active / locked).
- Actions per row: change role, lock/unlock, reset password, view session history.
- "Invite user" button with email + initial role.
- Audit: every role change writes to `audit_trail`.

**Phase 2.**

## 31. Audit Log tab

- Unified viewer of `audit_trail` rows.
- Filters: action (kebab-case dropdown), user, date range, freetext on `changes` JSON.
- Detail drawer per row: full JSON + linked entities (e.g., "this code-assistant.promote → generation ID 123 → view").
- Export CSV.

**Phase 2.**

## 32. Usage & Cost Dashboard tab

- All charts from §28.2.
- Filter by admin / time range / provider.
- Export CSV.
- Configure caps (per-admin overrides).

**Phase 3.**

## 33. Deployment History tab

- List of recent Vercel deploys (production + previews), sourced from Vercel API.
- Per deploy: commit SHA, message, status, duration, deployed by.
- **One-click rollback**: revert main to a previous commit via GitHub API, Vercel auto-deploys.
- Audit: rollback writes to `audit_trail`.

**Phase 3.**

## 34. System Settings tab

- Health panel: green/red status for DeepSeek, Claude, OpenAI, GitHub, Vercel, Supabase.
- Env-var presence check (no values shown — only "set" / "missing").
- Feature flags (`TWO_PERSON_APPROVAL_ENABLED`, `STREAMING_ENABLED`, etc.).
- "Test connectivity" buttons per integration.

**Phase 2.**

## 35. AI Models tab

- Configure provider chain.
- Per-provider settings (model, baseURL).
- API key status (set / missing per env).
- "Test prompt" button — sends a small prompt to each provider and reports latency + cost.
- Default chain editor (drag to reorder).

**Phase 3.**

---

# PART D — ROLLOUT AND OPERATIONS

## 36. Phased rollout

### Phase 1 — Code Assistant MVP (3–4 days)

- Apply migration (§23)
- `npm run generate-types`
- Backend: `generate.ts`, `preview-status.ts`, `health.ts`, `files.ts`
- Frontend: PromptForm, StatusBar, ErrorPanel, PlanView, DiffView, PreviewLink
- Single-provider (DeepSeek only)
- Rate limits + cost caps enforced
- All field validations + every error code shown
- Polling for preview status (no WebSocket yet)
- No iterate, no self-heal, no Monaco editor, no image input
- Admin sees preview URL but Promote/Revert are manual (use GitHub UI)
- Sidebar entry for `/admin/code-assistant`; other tabs are stubs

### Phase 2 — Promote / Revert + companion tabs (4–5 days)

- Backend: `promote.ts`, `revert.ts`, `apply-manual-edit.ts`
- Frontend: ActionBar, HistoryDrawer, Monaco diff editor for manual edits
- Companion tabs: Users & Roles, Audit Log, System Settings (with health panel)
- Templates: save/use/delete

### Phase 3 — Iteration, self-heal, real-time, multi-provider (1 week)

- Streaming responses
- Supabase Realtime for live status
- `iterate.ts`, `self-heal.ts`
- Image input (vision-capable provider fallback)
- AI Models tab (provider config)
- Usage & Cost tab + Deployment History tab

### Phase 4 — Logic Studio + 2-person approval + polish (1–2 weeks)

- T1 Parameters, T2 Rules, T3 Workflows
- Two-person approval flow
- Auto-generated Playwright tests
- Embeddings-based context selection
- Branch cleanup cron

**Total to full-feature panel: ~3–4 weeks of focused work.**

---

## 37. Pre-deployment checklist

Before merging Phase 1 to main:

- [ ] Migration applied on Adamrit's Supabase project
- [ ] `npm run generate-types` produced no surprises in `types.ts`
- [ ] `DEEPSEEK_API_KEY` set in Vercel (Prod + Preview env scopes)
- [ ] `GITHUB_TOKEN` set with `repo` scope, expiration > 90 days
- [ ] `VERCEL_API_TOKEN` set
- [ ] `VERCEL_PROJECT_ID` set
- [ ] Slack webhook URL set (optional but recommended)
- [ ] Health endpoint returns all-green
- [ ] All FV-* tests pass
- [ ] All API-* tests pass
- [ ] HP-1 happy path passes
- [ ] SEC-5 (FinalBill build guard) passes
- [ ] Sidebar entry visible to superadmin only
- [ ] Audit-trail rows being written
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run check:finalbill` passes

---

## 38. Operational runbook

| Symptom | Likely cause | Fix |
|---|---|---|
| All generations fail `missing-api-key` | env var missing in current scope | Add `DEEPSEEK_API_KEY` to Vercel, redeploy |
| All fail `deepseek-auth-failed` | key revoked / wrong | New key on platform.deepseek.com |
| Preview URLs never appear | wrong Vercel project ID | Verify `VERCEL_PROJECT_ID` |
| `vercel-build-failed` repeats | DeepSeek producing broken code | Read log, update system prompt convention |
| Cost spiking | runaway loop or oversize context | Lower context budget, tighten allowlist |
| Branches piling up | reverts not closing | `gh pr close --delete-branch`; run cleanup cron |
| FinalBill SHA mismatch | real engineering update | Run `npm run verify:finalbill-lock`, update SHA |
| 2-person approval URL not opening | Frontend lost the state | Re-fetch generation by ID |
| Self-heal can't fix the build | DeepSeek not understanding the error | Iterate manually with a more specific prompt |

---

## 39. Disaster recovery

### Supabase down
- Frontend shows "Adamrit backend unavailable" banner.
- Health endpoint returns red on Supabase.
- The Code Assistant tab disables submit (would fail at insertGeneration anyway).
- Admin can still browse history if cached.

### GitHub down
- Stage 7 fails with `github-network-error`.
- Generation row stays in `failed-github-network` — admin can retry from history.
- Auto-retry every 5 minutes for 1 hour, then give up.

### Vercel down
- Stage 8 polling fails with `vercel-network-error`.
- Branch is committed; preview just isn't ready. Admin sees "Preview status unavailable; try again later."
- On Vercel recovery, polling resumes.

### DeepSeek down (all providers also down)
- Stage 5 fails with `all-providers-failed`.
- Admin sees clear error with provider status page links.
- No fallback to local — code generation is the core feature.

### Total power loss / region outage
- This is a Vercel/Supabase concern. Adamrit follows their HA story.
- No data loss for already-committed branches (GitHub is the source of truth).
- Unsaved drafts in the prompt field are localStorage-backed; survive refresh.

### Rollback plan
- Each phase can be rolled back by reverting the deployment.
- The migration is forward-only but tables can be dropped without affecting other features (no FKs into them from existing tables).
- A one-line feature flag (`CODE_ASSIST_ENABLED=false`) hides the entire panel.

---

## 40. Data retention & compliance (HIPAA-adjacent)

### What's stored about admin actions

- Prompts (admin's text — may describe patient flows but should not contain PHI)
- Generated code (may reference patient-related tables but contains no PHI rows)
- Vercel build logs (contain code; no PHI)
- DeepSeek API requests (sent to DeepSeek's servers — see their DPA)

### What's NOT stored or sent

- Actual patient records, names, IDs, medical data.
- The Code Assistant operates on schema and code, not on data.

### Retention

- `code_assistant_generations`: kept indefinitely (audit value). Rotate to cold storage after 90 days. Owner can delete via SQL.
- `code_assistant_pipeline_events`: kept 30 days then auto-deleted by a cron.
- `code_assistant_messages`: same as generations.
- `audit_trail` rows: kept indefinitely per hospital audit requirements.

### Admin warning

Banner above the prompt field: "Do not paste patient names, IDs, or medical data into the prompt. This tool sends prompts to DeepSeek's servers."

A simple regex pre-flight on the frontend warns the admin if their prompt contains a 12-digit number (potential Aadhaar) or specific keywords ("patient X says...").

### DPA / contracts

- DeepSeek's standard DPA covers operational data.
- The user is responsible for ensuring their DeepSeek usage complies with their hospital's data-handling policies.
- If stricter compliance needed: enable provider fallback to a self-hosted model (Llama, Qwen, etc.) — out of scope here but architecturally supported via the provider abstraction.

---

## 41. Admin onboarding & training

### First-time experience

When a super-admin first visits `/admin/code-assistant`:
- A 3-step modal walks through:
  1. "What this tool does" — overview with a sample generation
  2. "What you can and can't change" — locklist explained
  3. "Errors are normal" — every error has a clear message + hint
- Modal can be re-opened from the gear icon.

### Onboarding docs

A `README.md` under `Adamrit/admin/` in the bettroi-vault Obsidian repo:
- "How to write a good prompt"
- "What to do when the build fails"
- "When to revert vs iterate"
- "Cost guidelines"

### Office hours

Suggested practice: weekly review of past generations to catch patterns + improve the system prompt.

---

## 42. Future evolution roadmap

| Phase | Theme | Highlights |
|---|---|---|
| **Phase 5** | Deep ecosystem integration | Connect to Sentry / Linear / Jira; auto-create tickets for reverted generations |
| **Phase 6** | Adamrit self-modifying capabilities | Code assistant can edit its own system prompt (with careful guards) — meta-learning |
| **Phase 7** | Fine-tuned model | Train DeepSeek (or Llama) on Adamrit's codebase for better suggestions |
| **Phase 8** | Multi-repo support | The panel can edit other Bettroi products (PLCAutoPilot, etc.) |
| **Phase 9** | Voice input | Admin speaks the prompt |
| **Phase 10** | Approval marketplace | Admins from other hospitals share approved templates |

---

# PART E — REFERENCE

## 43. Files created / modified

### Created (Phase 1)

```
adamrit/
├── api/lib/
│   ├── allowlist.ts                    # EDIT_ALLOWLIST + LOCK_LIST (server)
│   ├── deepseek.ts                     # DeepSeek client
│   ├── ai-orchestrator.ts              # Provider-fallback (stub in Phase 1)
│   ├── github.ts                       # Octokit wrapper
│   ├── vercel.ts                       # Vercel API wrapper
│   ├── context.ts                      # loadContext()
│   ├── ratelimit.ts                    # rate-limit checks
│   ├── validate.ts                     # server-side field validators
│   ├── responses.ts                    # success/error helpers
│   ├── auth.ts                         # getSessionUser, role check
│   ├── db.ts                           # generation CRUD
│   └── realtime.ts                     # writePipelineEvent (Phase 3 wires WS)
│
├── api/superadmin/code-assistant/
│   ├── generate.ts                     # POST main pipeline
│   ├── preview-status.ts               # GET poll Vercel
│   ├── health.ts                       # GET self-check
│   ├── history.ts                      # GET list
│   ├── files.ts                        # GET file search
│   ├── usage.ts                        # GET usage meter
│   └── templates.ts                    # CRUD (Phase 2)
│
├── src/pages/admin/
│   ├── AdminPanel.tsx                  # tab shell with 8 tabs
│   ├── CodeAssistant.tsx               # Tab 1
│   ├── LogicStudio.tsx                 # Tab 2 stub (Phase 4)
│   ├── UsersRoles.tsx                  # Tab 3 stub (Phase 2)
│   ├── AuditLog.tsx                    # Tab 4 stub (Phase 2)
│   ├── UsageCost.tsx                   # Tab 5 stub (Phase 3)
│   ├── DeploymentHistory.tsx           # Tab 6 stub (Phase 3)
│   ├── SystemSettings.tsx              # Tab 7 stub (Phase 2)
│   └── AIModels.tsx                    # Tab 8 stub (Phase 3)
│
├── src/components/admin/
│   ├── RequireSuperAdmin.tsx           # auth gate
│   ├── AdminTabNav.tsx                 # tab navigation
│   ├── ConnectionBadges.tsx            # 3 colored dots
│   └── code-assistant/
│       ├── PromptForm.tsx
│       ├── PromptField.tsx
│       ├── FileAttachmentPicker.tsx
│       ├── ImageAttachmentDropZone.tsx # Phase 3
│       ├── TemplatePicker.tsx          # Phase 2
│       ├── StatusBar.tsx
│       ├── ErrorPanel.tsx
│       ├── PlanView.tsx
│       ├── DiffView.tsx
│       ├── MonacoFileEditor.tsx        # Phase 2
│       ├── PreviewLink.tsx
│       ├── ActionBar.tsx               # Phase 2
│       ├── HistoryDrawer.tsx           # Phase 2
│       ├── IterateChatPanel.tsx        # Phase 3
│       ├── SelfHealButton.tsx          # Phase 3
│       ├── UsageMeter.tsx
│       └── types.ts
│
├── src/hooks/admin/
│   ├── useCodeAssistant.ts
│   ├── useCodeAssistantHistory.ts
│   ├── useCodeAssistantUsage.ts
│   ├── usePreviewStatus.ts             # polling in P1; realtime in P3
│   ├── useFieldValidation.ts
│   └── useAdminAuth.ts
│
├── src/lib/code-assistant/
│   ├── allowlist.ts                    # frontend mirror (UX pre-filter)
│   ├── errorCatalog.ts                 # code → title/message/hint
│   ├── client.ts                       # frontend SDK
│   └── types.ts
│
└── supabase/migrations/
    └── 2026XXXXXX_code_assistant.sql
```

### Modified (Phase 1)

```
src/components/AppRoutes.tsx            # + /admin route tree
src/components/AppSidebar.tsx           # + Super-Admin section
package.json                            # + dependencies (§44)
```

### Not touched (locked)

- `src/pages/FinalBill.tsx` (and variants)
- `src/pages/FinancialSummary*.tsx`
- `src/lib/permissions.ts`
- existing `supabase/migrations/`
- `.github/workflows/`
- `scripts/check-finalbill-locked.cjs`

---

## 44. npm dependencies added

Phase 1:
- `openai` (DeepSeek client; OpenAI-compatible)
- `@octokit/rest`
- `minimatch`
- `react-diff-viewer-continued`

Phase 2:
- `@monaco-editor/react`
- `react-markdown` (for plan view rendering, if not already in)

Phase 3:
- `@anthropic-ai/sdk` (Claude fallback)

---

## 45. Out of scope

- DB schema changes through prompts
- New npm dependencies through prompts (v1)
- Editing security / auth code
- Editing the assistant's own files
- Editing FinalBill / FinancialSummary
- Multi-tenant isolation (single hospital tenant assumed)
- Codebases other than `chatgptnotes/adamrit.com`
- Real-time multi-user editing of the same prompt
- Voice input (Phase 9 future)
- Generated code deploying without a preview gate

---

## 46. Open decisions (locked defaults; override paths)

| Decision | Default | How to override |
|---|---|---|
| Model | `deepseek-coder` | env `DEEPSEEK_MODEL` |
| Apply mode | Two-step (preview → promote) | (always — safety) |
| Hourly limit | 20 | env `CODE_ASSIST_HOURLY_LIMIT` |
| Monthly cost cap | $50 | env `CODE_ASSIST_MONTHLY_COST_USD` |
| Streaming | off in P1, on in P3 | env `CODE_ASSIST_STREAMING_ENABLED` |
| Branch lifetime | 7 days unless promoted | cron config |
| 2-person approval | off | env `CODE_ASSIST_2PERSON_APPROVAL` |
| Auto-merge on Promote | if CI passes | UI checkbox |
| Self-heal retries | 3 | env `CODE_ASSIST_SELF_HEAL_LIMIT` |
| Iterate turns | 10 | env `CODE_ASSIST_ITERATE_LIMIT` |
| Provider chain | DeepSeek → Claude → OpenAI | AI Models tab |
| Vision provider | Claude (when DeepSeek vision unavailable) | AI Models tab |
| Embeddings for context selection | off in P1–P3 | Phase 4 |
