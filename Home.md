# Home — Manufacturing Agent Knowledge Vault

> The single entry point for everything about the **Manufacturing Production Scheduling + JIT Procurement Agent** project.
> Open **Graph View** (Ctrl+G) to see how everything connects.

---

## 🟢 Start Here

1. **[[Primer]]** — Read this first. Plain-English explanation of *what* we're building and *why* each decision exists. Mental models, walkthroughs, whiteboard pitch.
2. **[[Plan A - Building the Agent]]** — Engineering plan: architecture, 7 build phases, stack, verification.
3. **[[Plan B - Data Sourcing]]** — What each new customer must give us: data, skills, people, deployment tiers.

---

## 🧠 Core Concepts

These notes explain the building blocks. Each is linked from the main plans — clicking the wiki-link or hovering shows the definition.

**The vault model:**
- [[Skills Vault]] — the playbook (human-curated rules)
- [[Memory Vault]] — the logbook (agent-written experience)

**The learning machinery:**
- [[Correction Loop]] — the central learning mechanism, the IP
- [[Episode]] — what's recorded for every decision
- [[Correction Note]] — what's recorded when the planner overrides
- [[Lesson]] — promoted patterns from repeated corrections
- [[Cyclic RAG]] — timestamped self-improving retrieval

**The data + scheduling model (real manufacturing):**
- [[Multi-Level BOM]] — items as a DAG, not a flat list
- [[Shared WIPs]] — when multiple finals share upstream processes
- [[Master Production Schedule]] — MPS + MRP + daily scheduling as one loop, with a worked example

**The interfaces:**
- [[Chat Sidecar]] — the read-only conversational companion (8 archetypes)
- [[Hybrid LLM Routing]] — local Ollama + Claude API split

**The commercial layer:**
- [[Deployment Tiers]] — Bronze / Silver / Gold / Platinum
- [[Generic vs Vertical]] — one core, many industries

---

## 📅 Status

- **2026-05-12** — Vault initialized. Primer + Plan A + Plan B drafted.
- **2026-05-12 (session 2)** — Added Phase 5b (Chat Sidecar) to Plan A. Expanded Phase 3 with [[Multi-Level BOM]] and Phase 4 with full [[Master Production Schedule|MPS daily-loop]] including the worked P1/P2/P3-with-shared-WIP-5 example. Nuanced the Primer's "not a chatbot" line. Four new concept notes: [[Chat Sidecar]], [[Multi-Level BOM]], [[Shared WIPs]], [[Master Production Schedule]].
- Next: review with fresh eyes, pick first pilot customer profile, start Phase 1.

---

## 🗂️ Folder Map

| Folder | Contents |
|---|---|
| `/` (root) | Home + the three main plan docs |
| `/Concepts/` | Atomic concept notes that the plans wiki-link to |

When the project actually starts (Plan A, Phase 1), this vault stays as the **planning + knowledge vault**. The agent itself uses two *separate* vaults — `skills-vault/` and `memory-vault/` — created fresh per customer deployment.

---

## 🔗 External References

- Existing reference vault: `C:\Users\HP\Documents\PIMS-vault`
- Codebase to reuse from: `C:\Users\HP\gridvision-scada\apps\server\src\protocol\`
- Plan files (raw, in Claude Code): `C:\Users\HP\.claude\plans\`
