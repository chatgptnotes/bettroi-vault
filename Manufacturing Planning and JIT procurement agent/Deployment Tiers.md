# Deployment Tiers

> Bronze / Silver / Gold / Platinum — sell the agent as a **roadmap**, not a one-time install.

## The Four Tiers

| Tier | Data the customer gives | Agent capability | Time to value | Suggested pricing posture |
|---|---|---|---|---|
| **Bronze** | Item master + BOM + supplier master + weekly Excel exports of WOs/inventory | Weekly schedule recommendation, JIT reorder list, generic priority ranking | **Week 1** | Setup fee + low monthly |
| **Silver** | Above + ERP read (Tally XML / daily API pull) + 15–20 customer-specific [[Skills Vault\|skills]] authored | Daily schedule, daily PO suggestions, customer-aware prioritization, supplier-reliability-aware JIT | **Week 4** | Mid monthly |
| **Gold** | Above + MES/SCADA live feed + outcome data (GRN, production confirmations, scrap) flowing back | Reactive rescheduling on machine-down, closed-loop learning, promoted [[Lesson\|lessons]], anomaly explanations | **Month 3** | Higher monthly + per-line fee |
| **Platinum** | Above + 6+ months of accumulated [[Correction Note\|corrections]] and [[Lesson\|lessons]] | Genuinely personalized. Planner override rate ~10%. Defensible knowledge moat. | **Month 6+** | Premium monthly; renewal lock-in via the vault they now own |

## Why Tiered

- **De-risks the customer's commitment.** They start at Bronze with low data hand-over, see value Week 1, then escalate as trust grows.
- **Matches Indian SMB reality.** Most won't give ERP API access on day one. Bronze is achievable with just Excel exports.
- **Creates upgrade path conversations.** Every tier transition is a renewal/upsell moment.

## What Unlocks Each Tier

### Bronze → Silver
- Customer agrees to either ERP read access OR daily scheduled exports.
- Onboarding workshop completed (15–20 skills authored).
- Planner is using the system daily.

### Silver → Gold
- MES/SCADA connector installed (reuses your `gridvision-scada` adapters).
- Production confirmation pipeline established.
- GRN data flowing back into episode outcomes.

### Gold → Platinum
- Time-gated, not feature-gated. After ~6 months of usage:
- At least 30 active [[Lesson|lessons]] in the memory vault.
- Override rate has dropped below ~15%.
- Customer has co-authored at least 5 of those lessons themselves.

**Platinum is a customer state, not a software state.** It's the moat in action.

## Hardware Requirements per Tier

| Tier | Min hardware |
|---|---|
| Bronze | 16 GB RAM, 8 cores, no GPU (CPU-only Ollama is acceptable for weekly batch use) |
| Silver | 32 GB RAM, 8 cores, GPU recommended (RTX 4060 or better) for daily latency |
| Gold | 32 GB RAM, 12 cores, GPU mandatory; redundant storage for episode/correction history |
| Platinum | Same as Gold; add automated backup of memory-vault git repo |

## What the Customer Owns at Each Tier

All tiers: the customer **owns**:

- Their [[Skills Vault]] (their authored rules)
- Their [[Memory Vault]] (every decision, correction, lesson)
- Both are plain markdown in git repos under their control

Even if they cancel, they keep all of this. **The agent runtime is the recurring revenue; the vaults are the customer-asset side of the deal.**

## Commercial Model Implication

- **Bronze:** one-time setup fee (data ingestion + onboarding workshop) + low monthly.
- **Silver:** mid monthly, includes ERP connector maintenance.
- **Gold:** higher monthly + per-MES-line fee.
- **Platinum:** premium monthly, locked in by the value of the accumulated vault.

Renewal economics: at Platinum, the customer's effective cost of switching = "lose access to the system that retrieves and applies our 6-month knowledge accumulation." Even if a competitor offers a cheaper agent, **the lessons don't port** because they were synthesized inside *this* system's retrieval architecture.

## See Also

- [[Plan B - Data Sourcing]] — full intake checklist per tier
- [[Plan A - Building the Agent]] — the engineering phases that correspond to tier unlocks
- [[Correction Loop]] — what creates the Platinum lock-in
- [[Memory Vault]] — the customer-owned asset
- [[Hybrid LLM Routing]] — hardware requirements per tier depend on local model usage
- [[Generic vs Vertical]] — vertical skill packs ship at Bronze, not later
- [[Master Production Schedule]] — Gold tier unlocks the full MPS loop
