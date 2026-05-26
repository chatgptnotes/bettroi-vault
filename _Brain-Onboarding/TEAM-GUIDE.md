---
date: 2026-05-19
audience: BT, Roma, Haritha
source: brain-onboarding
off_limits: false
---

# How to Use the Brain — 5-Minute Onboarding

Hi BT, Roma, Haritha — Murali built an AI second brain for the company. It has read everything: every Fathom call, every project note, every Slack thread tagged for it. You can now ask it questions in Slack and get cited answers in seconds.

This guide gets you productive in 5 minutes.

---

## What it is

A Slack bot named **`@brain`** that knows what's been said, decided, and committed across every Bettroi project. It searches across 13,800+ pieces of context and answers in natural language with sources.

**Examples of what it knows:**
- Every Fathom call recap from the last 6 months
- All project diaries in Obsidian (Adamrit, Hope, NABH-SaaS, etc.)
- Decisions captured in Slack
- Action items + their assignees

---

## How to ask it something

### Option A — Direct message
Open Slack → search for **`@brain`** in your DMs → send a message.

### Option B — Mention in any channel
Type `@brain <your question>` in any channel where the bot is present.

It will reply in a thread with the answer + the source files/dates it used.

---

## 10 questions to try right now

Send these as DMs to `@brain` — they'll show you what it can do:

1. *"What's happening with Adamrit this week?"*
2. *"Who is working on Bajaj Energy?"*
3. *"What did we promise Grace Opticals in the last call?"*
4. *"Give me the open action items on Hope Hospital"*
5. *"What's the latest decision on the NABH-SaaS pricing?"*
6. *"Prep for my call with Saikat tomorrow"* — uses the `prep` shortcut
7. *"What competitors have we lost to recently?"*
8. *"What does Ruby need from me?"*
9. *"my items"* — shows YOUR open action items
10. *"done 1"* — marks item #1 from the last list as complete

---

## Special commands

| Command | What it does |
|---------|--------------|
| `my items` | Lists your open action items, ordered by due date |
| `open items` | Lists ALL open items across the company |
| `done N` | Marks item N (from your last list) as complete |
| `snooze N YYYY-MM-DD` | Defers item N to a later date |
| `prep <topic>` | Generates a 8-12 bullet pre-meeting briefing |

---

## What the brain WON'T tell you

Each of you has a role assigned with restricted topics:

- **BT (COO)** — blocked: `hr`, `salary`, `accounts`, `payments`, `private`
- **Roma (Sales Lead)** — blocked: `hr`, `salary`, `accounts`, `payments`, `finance`, `strategy`, `private`, `internal`
- **Haritha (Project Manager)** — blocked: `hr`, `salary`, `accounts`, `payments`, `private`

If you ask about a blocked topic the brain will say:
> *"That topic ('salary') is outside what I can share. Ask Murali directly."*

This isn't a bug — it's an intentional information firewall. Salary/HR/finance content is filtered out before search runs.

---

## What you'll see at the end of every answer

A confidence footer:

> *Confidence: High — verify with Murali for decisions.*

- **High** = the brain found strong direct matches in its sources
- **Medium** = some signal, but adjacent. Verify before acting.
- **Low** = it stitched a guess from weak signals. Treat as a starting point, not a fact.

Murali's queries don't get this footer. Yours do — by design.

---

## Daily/weekly automations already running

You'll receive these in Slack automatically:

| Automation | When | What you get |
|------------|------|--------------|
| **Morning digest** | 07:30 IST daily | Today's open items, overdue work, decisions log |
| **Meeting prep** | 15-30 min before each external meeting | Auto-DM with briefing on the topic + attendees |
| **Fathom follow-up drafts** | 17:00 IST Mon-Fri | Email drafts ready to send after each call |
| **LinkedIn drafts** | 18:30 IST daily | 3 post drafts for Murali's review |
| **HubSpot CRM sync** | 17:30 IST Mon-Fri | Calls auto-logged with stage + next-step |
| **Proposal drafter** | 16:00 IST Mon-Fri | Discovery calls → draft proposals in Proposifyai |
| **Weekly review** | Sundays 08:00 IST | Full week retrospective with insights |
| **Competitor monitor** | Sundays 09:00 IST | Refreshed `_Marketing/competitor-intel.md` |

You don't need to do anything to get these — they DM you (or post to `#review-content`) automatically.

---

## Reporting issues

If the brain hallucinates, refuses something it shouldn't, or misses obvious context:
1. Screenshot the question + answer
2. DM Murali on Slack with `brain bug:` prefix

He'll feed it back into the system.

---

## What NOT to do

- **Don't share screenshots of brain answers externally** — they may contain partial context that looks like a definitive Bettroi position.
- **Don't ask it to commit on Murali's behalf.** It can tell you what was said; it can't decide for him.
- **Don't paste sensitive client data into the channels** the brain watches (any public channel) unless you're OK with it being indexed. Use Slack DMs for sensitive topics.

---

## Setup checklist

- [ ] Open a DM with `@brain` in Slack
- [ ] Send one of the 10 example questions above
- [ ] Verify you got an answer with sources
- [ ] Try `my items` to see your action items
- [ ] Bookmark `_Marketing/competitor-intel.md` in the vault

Done. You're set up.

---

*Questions? DM Murali or `@brain` itself — it has been told about this guide.*
