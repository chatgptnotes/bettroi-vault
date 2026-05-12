# Cyclic RAG

> Timestamped, self-refreshing retrieval-augmented generation that gets smarter over time without retraining the model.

## What "Cyclic" Means

Three cycles run continuously:

1. **Write cycle** — every agent decision + planner action writes new files to the [[Memory Vault]].
2. **Embed cycle** — file watcher embeds every new `.md` into Chroma within seconds.
3. **Promotion cycle** — nightly reflection promotes correction patterns into [[Lesson|lessons]].

Each cycle feeds the next, and retrieval pulls from all three.

## What "Timestamped" Means

Every chunk in Chroma carries metadata:

```python
{
    "id": "ep-2026-05-12-014#chunk-2",
    "content": "...",
    "embedding": [0.123, -0.456, ...],
    "metadata": {
        "created_at": "2026-05-12T09:05:23+05:30",
        "last_seen_at": "2026-09-04T14:00:00+05:30",
        "collection": "episodes",        # or skills | corrections | lessons
        "source_file": "memory-vault/episodes/2026/05/12/ep-014.md",
        "tags": ["mahindra", "emergency-override"],
        "applications": 14,              # for lessons: how often retrieved
    }
}
```

Retrieval queries can filter by time window:

```python
agent.retrieve(
    query="how do we handle Mahindra emergencies?",
    collections=["lessons", "corrections", "episodes"],
    weights=[1.0, 0.6, 0.3],
    time_window="last_90_days",
    top_k=8,
)
```

## Why Cyclic + Timestamped Matters

| Without cyclic | Without timestamps |
|---|---|
| Agent stays as smart as Day 1 | Agent uses 5-year-old corrections that may no longer apply |
| Corrections rot in flat files, never retrieved | A monsoon lesson gets retrieved in winter when irrelevant |
| Reflection never promotes patterns | Stale lessons drift from current reality |

The cyclic part captures new knowledge. The timestamped part ensures the agent uses **current** knowledge, not ancient knowledge.

## The Refresh Cadence

| Job | Cadence | Action |
|---|---|---|
| File watcher | Real-time (seconds) | Embed new/changed `.md` files into Chroma |
| Outcome back-fill | Nightly (after midnight) | Pull production confirmations, GRN data; fill `outcome:` field in episodes |
| Reflection / clustering | Nightly | Cluster corrections, draft lessons for planner review |
| Lesson decay check | Weekly | Demote unused active lessons to dormant |
| Skill review prompts | Weekly | Surface skills with `last_reviewed` > 90 days for human re-check |
| Embedding sanity audit | Monthly | Re-embed everything (catches embedder model upgrades) |

## How Retrieval Weighting Works

When the agent retrieves context for a query, results from different collections are weighted before ranking:

```
final_score = similarity_score × collection_weight × recency_factor

collection_weight:
  - lessons (active):    1.0
  - lessons (dormant):   0.5
  - corrections:         0.8
  - skills:              0.7
  - episodes (similar):  0.4

recency_factor:
  - last 30 days:        1.0
  - 30–90 days:          0.9
  - 90–365 days:         0.7
  - older than 1 year:   0.5
```

These weights are tunable per-deployment via `deployment.yaml`.

## What Makes This "Self-Improving"

The phrase "learns from its mistakes" maps concretely to:

1. **Every planner override** is a labeled training example (the agent was wrong, the planner shows the right answer).
2. **Every 3+ overrides on the same theme** become a promoted [[Lesson]].
3. **Every promoted lesson** gets the highest retrieval weight on the next similar query.
4. **The agent doesn't repeat the same mistake** because the lesson is now part of every relevant retrieval.

**No model fine-tuning required.** The model stays the same; the retrieval context evolves.

## See Also

- [[Correction Loop]] — the write side of the cycle
- [[Chat Sidecar]] — how the planner interrogates retrieval (Retrieval Detective + Counterfactual Player archetypes)
- [[Hybrid LLM Routing]] — what consumes the retrieved context
- [[Memory Vault]] — where embeddings come from
- [[Plan A - Building the Agent]] — Phase 2 implementation
