# Correction Loop

> **This is the IP.** The mechanism that turns every planner override into permanent, retrievable knowledge owned by the customer.

## The Loop in One Diagram

```
agent recommends ──► planner edits ──► agent writes a [[Correction Note]]
                          │                       │
                          │                       │ (3+ similar
                          │                       │  corrections accumulate)
                          │                       ▼
                          │              nightly reflection job
                          │              clusters similar corrections,
                          │              drafts a [[Lesson]]
                          │                       │
                          │                       ▼
                          │              planner promotes draft → active
                          │                       │
                          │                       ▼
                          └──── next decision retrieves the lesson
                                and the agent doesn't repeat the mistake
```

## Why It Works

1. **Capture the why, not just the what.** A planner clicking "edit" isn't enough — the UI demands a `why` field. Without the why, the correction is useless for learning.
2. **3+ threshold prevents overfitting.** A single correction might be a one-off bad day. Three corrections is a pattern.
3. **Planner promotes lessons.** No lesson goes active without a human seeing it and approving it. The agent never auto-modifies its own behavior unsupervised.
4. **Lessons outrank skills.** Once a lesson is active, it gets higher retrieval weight than the generic skills it overrides. The agent grows wiser without anyone rewriting the playbook.

## What Each Override Looks Like

When the planner clicks **Edit** in the approval UI:

1. UI captures: original recommendation, edited recommendation, diff, planner-supplied tags + free-text reason
2. Agent writes a [[Correction Note]] to `memory-vault/corrections/`
3. File watcher embeds it into the Chroma vector store
4. Next retrieval involving the same skill-refs or tags includes this correction

## The Compounding Effect

| Time | What's in the memory vault | Override rate |
|---|---|---|
| Week 1 | 0 corrections, 0 lessons | ~80% (agent is naive) |
| Week 4 | ~50 corrections, 0 lessons | ~50% |
| Month 3 | ~150 corrections, ~10 active lessons | ~25% |
| Month 6 | ~300 corrections, ~30 active lessons | ~10% (steady state) |

**This curve is the value proposition.** Sell it as a slide.

## The Lock-In

After 6 months, the customer's `memory-vault/lessons/` represents the externalized institutional knowledge of their planning team. **If they cancel the subscription, they keep the vault** (it's their git repo, in plain markdown). But replacing the agent means losing the retrieval/reflection machinery — they keep the data, lose the system that learns from it.

That asymmetry is the moat.

## See Also

- [[Correction Note]] — the file format
- [[Lesson]] — what corrections eventually become
- [[Episode]] — the broader record (every decision, not just overrides)
- [[Cyclic RAG]] — the retrieval mechanism that makes the loop useful
- [[Chat Sidecar]] — accelerates the loop via the Pattern Spotter and Lesson Curator archetypes
- [[Plan A - Building the Agent]] — Phase 5 (capture) and Phase 6 (reflection)
