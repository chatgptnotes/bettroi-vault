# Hybrid LLM Routing

> Routine queries → local Ollama. Hard reasoning → Claude API. Best of both worlds.

## Why Hybrid

| Pure local (Ollama) | Pure API (Claude) | **Hybrid (chosen)** |
|---|---|---|
| Data never leaves the plant ✓ | Best reasoning quality ✓ | Both ✓ |
| Free per query ✓ | Pay per query ✗ | Mostly free, occasional cost ✓ |
| Weaker reasoning ✗ | Plant must allow outbound HTTPS ✗ | Routine handled locally, hard cases escalated ✓ |
| Slower ✗ | Fast ✓ | Routine is fast (local), hard is slow but rare ✓ |

## Router Heuristics

| Query type | Model | Why |
|---|---|---|
| Kanban refill suggestion | Ollama Qwen2.5-7B | Single rule lookup + arithmetic |
| Lead-time computation | Ollama | Pure data retrieval |
| Single-machine reschedule | Ollama | One constraint, well-defined math |
| Skill summary / Q&A | Ollama | Read-only retrieval |
| Multi-constraint reschedule | Claude Sonnet 4.6 | Many variables, requires planning |
| Supplier mix optimization (3+ suppliers) | Claude Sonnet | Combinatorial reasoning |
| Anomaly explanation | Claude Sonnet | Open-ended diagnostic |
| Lesson synthesis from corrections | Claude Sonnet | Generative + abstraction |
| Routing classification itself | Claude Haiku 4.5 | Cheap, fast, structured output |

## Escalation Triggers

The router escalates from local to API when **any** of:

1. Query is classified `hard` by the Haiku classifier (cost: ~$0.001/query).
2. Local model returns a `low_confidence` flag (logprob threshold).
3. Retrieved skills include `requires_deep_reasoning: true` frontmatter.
4. Retrieved lessons include `requires_deep_reasoning: true`.
5. Number of work orders being scheduled exceeds threshold (e.g., 50+).
6. Planner has manually flagged "this needs a careful look" in the UI.

## Failure Mode: API Unreachable

When outbound network fails:

- Routine queries continue on Ollama, no degradation.
- Hard queries queue with status `pending_api_reach`.
- Planner sees: "12 recommendations queued, waiting for hard-reasoning model. Routine schedules and JIT triggers are current."
- When network returns, queue flushes.

This means **the plant never stops getting useful output**, even if the internet is down.

## Cost Model (per plant, per month)

Rough estimates for a mid-size plant (50 WOs/day, 500 decisions/month):

- Local (Ollama on plant hardware): hardware amortization only, ~₹0 per query
- API calls (Claude Sonnet via Anthropic): ~10% of decisions × ~$0.05 avg = ~$2.50/month per plant
- Haiku classifier: ~100% of decisions × ~$0.001 = ~$0.50/month per plant

**Total Claude cost per plant: ~$3–5/month.** Trivial compared to subscription pricing.

## Hardware Footprint for Ollama

| Model | RAM | VRAM (optional) | Speed (no GPU) |
|---|---|---|---|
| Qwen2.5-7B-Instruct (quantized Q4) | 6 GB | 4 GB | ~12 tok/s on CPU |
| Llama 3.1-8B-Instruct (quantized Q4) | 6 GB | 4 GB | ~10 tok/s on CPU |
| nomic-embed-text (embedder) | 1 GB | 0 | very fast |

**Minimum plant hardware: 16 GB RAM, 8 cores, no GPU required for Tier 1.** GPU (RTX 4060 or better) recommended for Tier 2+ to keep latency low.

## See Also

- [[Plan A - Building the Agent]] — Phase 4 implementation
- [[Cyclic RAG]] — what the embedder feeds
- [[Deployment Tiers]] — hardware requirements per tier
