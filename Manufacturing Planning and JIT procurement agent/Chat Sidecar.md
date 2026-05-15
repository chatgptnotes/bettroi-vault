# Chat Sidecar
[[]]
> A read-only conversational companion to the structured approval UI. The planner can **ask about** decisions; they cannot **make** decisions through chat.

## Why Both UIs (and Not Just Chat)

The structured approval UI handles the *flow* of [[Cyclic RAG]] — decisions in, [[Correction Note|corrections]] out. The chat sidecar handles the *introspection* — the parts that aren't naturally surfaced in a "schedule + approve" workflow but are essential to keeping the vault healthy.

| Need | Structured UI | Chat sidecar |
|---|---|---|
| Place a PO / approve a schedule | ✅ Mandatory | ❌ Forbidden |
| Capture planner reasoning for the [[Correction Loop]] | ✅ Form fields | ❌ Too unstructured |
| Audit trail with citations | ✅ Built-in | △ Logged but secondary |
| "Why did you pick Supplier B?" | △ Citations visible but terse | ✅ Best fit |
| "Show me all lessons about Mahindra" | ❌ Awkward | ✅ Natural |
| "What's our exposure to Supplier A this month?" | ❌ No such screen | ✅ Analytical Q&A |
| Onboarding a new planner | △ Limited | ✅ "Explain what you'd do" |

## The 8 Archetypes (each maps to a Cyclic-RAG operation)

### 1. The Retrieval Detective — makes RAG transparent
- *"Why didn't the monsoon-supplier-A lesson get retrieved for today's PO?"*
- *"Show me every skill and lesson that fired on WO-4485."*
- *"Rank the top 5 chunks the retriever pulled for this decision and tell me their similarity scores."*

**What it fixes:** when the agent gets something wrong, you can't currently see *why*. Chat exposes the retrieval state so the planner can tell whether the bug is in the rule, the embedding, or the time filter.

### 2. The Vault Gardener — keeps the RAG from rotting
- *"List skills not reviewed in 90 days."*
- *"Show dormant lessons — any worth reactivating?"*
- *"Find corrections that never made it into a lesson — are they one-offs or missed patterns?"*

**What it fixes:** the anti-drift guardrail generates a queue. Without chat, that queue is invisible. With chat, the planner does weekly vault hygiene in 10 minutes.

### 3. The Lesson Curator — human-in-the-loop for promotions
- *"Walk me through draft lesson 'mahindra-emergency-override'."*
- *"Show me the 4 corrections this lesson clusters."*
- *"Rewrite the rule to say '48 hours unless the call notes override.' Then promote."*

**What it fixes:** instead of editing YAML in Obsidian, the planner interrogates the draft conversationally before signing off. Promotion quality up, latency down.

### 4. The Pattern Spotter — real-time reflection
Agent proactively: *"You've overridden 4 times this week on supplier mix during monsoon. I see a pattern forming — want me to draft a lesson now instead of waiting for tonight's reflection?"*

**What it fixes:** nightly reflection has up to 24-hour latency. Chat does *immediate* reflection when the planner is still warm on the context.

### 5. The Historian — leverages timestamped episodes
- *"What did we do last year when Tata called for an emergency in monsoon and Machine 4 was down?"*
- *"Compare override rate this month vs last."*
- *"Show all decisions where we deviated and the outcome was still on-time — what do they have in common?"*

**What it fixes:** [[Episode|episodes]] are stored but mostly invisible. Chat unlocks them as a queryable history — the whole point of *timestamped* RAG.

### 6. The Skill Author — extends the playbook conversationally
- *"I want to add a rule that we never run polishing on Line 3 after 8pm because of the noise complaint."*
- Chat drafts a `skills-vault/10-scheduling/line3-noise-curfew.md` with proper frontmatter → planner edits → save.

**What it fixes:** today, authoring a skill means knowing the YAML schema. Chat hides that, so a planner who's never seen a `.md` file can still add rules.

### 7. The Counterfactual Player — debugs RAG composition
- *"If I delete the monsoon-supplier-A lesson, what does today's PO list become?"*
- *"Re-run yesterday's decisions without lesson XYZ — was XYZ load-bearing?"*

**What it fixes:** before retiring a lesson, the planner can stress-test the vault. Prevents accidental knowledge loss.

### 8. The Onboarding Coach — for new planners
- New hire: *"Why does Tata get +100 priority?"* → chat cites `customer-vip-tier` skill + 3 episodes where Tata slipped → explains the ₹50K/day penalty context.
- *"Walk me through what Rakesh would have done on this scenario."*

**What it fixes:** the **knowledge-doesn't-walk-out-the-door** pitch made tangible. The vault is browsable; chat makes it *interrogable*.

## Mapping to Cyclic-RAG Operations

| Cyclic-RAG operation | Chat archetype | Without chat |
|---|---|---|
| **Write** (capture corrections/episodes) | Pattern Spotter | Wait for nightly batch |
| **Embed + retrieve** | Retrieval Detective | Black-box; trust required |
| **Promote** (corrections → lesson) | Lesson Curator | Edit YAML in Obsidian |
| **Decay / hygiene** | Vault Gardener | Stale lessons accumulate silently |
| **Apply** (use lessons in decisions) | Counterfactual Player | Can't audit lesson influence |
| **Recall** (case-based reasoning) | Historian | Episodes invisible after write |
| **Extend** (new skills) | Skill Author | Requires schema knowledge |
| **Transfer** (planner ramp) | Onboarding Coach | Tribal knowledge resurfaces |

## Hard Boundaries — The Noise Mitigation

These are **P0 invariants**, not nice-to-haves. If they leak, the structured flow becomes redundant and the audit trail breaks.

1. **Chat cannot write [[Episode|episodes]] or [[Correction Note|corrections]].** Memory-vault writes happen only via the structured approval UI. Prevents "learning" from speculative chitchat.
2. **Chat cannot place POs or release work orders.** If the planner says "yes do that," the agent deep-links into the structured approval queue. **Decisions live in the structured flow, always.**
3. **Chat answers must cite.** Every factual claim is grounded in a `skill_id`, `lesson_id`, or `episode_id`. Uncited assertions are post-checked and rejected before display.
4. **Chat consumes the [[Hybrid LLM Routing|model router]] like everything else.** Routine Q&A → Ollama. Complex synthesis → Claude. No bypass.
5. **Chat history goes to `memory-vault/conversations/` with shorter retention** (30 days default). Separate from episodes — exploratory, not authoritative.
6. **No multi-turn agentic chains in chat.** Each turn is single retrieval + single response. Multi-step action funnels into the structured planning flow.

## Implementation Sketch

- Same FastAPI backend, same Next.js UI shell. New tab: **"Ask"** alongside **"Approve"** and **"Lessons to review"**.
- LangGraph gains a parallel entry node: `chat_query` → `retrieve_skills+memory` → `route_model` → `respond_with_citations`. Reuses the same retrieval and routing nodes as the decision flow.
- Output post-check: if the response contains words like "I'll order" / "I'll schedule" / "done", reject and replace with: *"That's a decision — open the approval queue to commit it."*

## The Big Idea

**Without chat, [[Cyclic RAG]] is a black box that improves itself overnight. With chat, it's a glass box the planner can probe, prune, and extend on demand.** That's the difference between a tool the planner tolerates and one they actively curate.

## See Also

- [[Cyclic RAG]] — what the chat sidecar makes interrogable
- [[Correction Loop]] — what the chat sidecar accelerates (via Pattern Spotter)
- [[Skills Vault]] — what the Skill Author archetype extends
- [[Memory Vault]] — what the Historian and Vault Gardener archetypes browse
- [[Hybrid LLM Routing]] — what powers chat responses
- [[Plan A - Building the Agent]] — Phase 5b implementation
