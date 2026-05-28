# Multi-Level BOM

> The data model that makes [[Shared WIPs]] tractable: items as a directed acyclic graph, not a flat list of components.

## Why Flat BOMs Fail

A flat BOM lists raw materials per final product. Example (flat, wrong):

```
P1: 2 kg Raw-A, 0.5 L Raw-B, 1 unit Component-C
P2: 2 kg Raw-A, 0.7 L Raw-B, 1 unit Component-C
```

This hides the fact that P1 and P2 might both run through a shared intermediate WIP before becoming distinct. Without modeling the WIP, the agent can't:

- Aggregate demand at the shared step
- Lot-size shared production efficiently
- Trace failure propagation when the shared step rejects a batch
- Compute correct cumulative lead times

## The Multi-Level Structure

Items form a directed acyclic graph (DAG). Every node is an Item; every edge is a *consumption* relationship.

```
ITEMS (nodes):
  Item(id, type=[finished | sub_assembly | wip | raw], 
       moq, safety_stock, lead_time_to_make, shelf_life)

BOM EDGES (directed):
  BOMEdge(parent_item, child_item, qty_per_unit_of_parent)
```

Example for two finals sharing a WIP after 5 upstream steps:

```
P1 (finished)
├── BOMEdge → WIP-5 (qty 1)
│              ├── BOMEdge → WIP-4 (qty 1)
│              │              ├── BOMEdge → WIP-3 (qty 1)
│              │              │              ├── BOMEdge → WIP-2 (qty 1)
│              │              │              │              └── BOMEdge → WIP-1 (qty 1)
│              │              │              │                            └── BOMEdge → Raw-R (qty 2 kg)
│              │              │              ↑   (...steps 1–5 are shared)
└── BOMEdge → Component-X (qty 1)  ← P1-specific downstream

P2 (finished)
├── BOMEdge → WIP-5 (qty 1)   ← same shared chain
└── BOMEdge → Component-Y (qty 1)  ← P2-specific downstream
```

## Two Indexes Computed at Startup

```python
where_used[item_id] = [(parent_item, qty_per), ...]   # downstream consumers
where_made[item_id] = [op_id, ...]                    # operations producing this item
```

These let the agent walk the tree in O(1) per hop, both directions.

## Cycle Detection

A cyclic BOM is malformed master data. The agent runs Kahn's algorithm at startup:

- If topological sort fails → cycle exists → refuse to start, surface the cycle path to IT.

This is a Day-1 data-quality gate — never run on a broken BOM.

## Cumulative Lead Time

```python
cumulative_lead_time(item):
    if item.type == 'raw':
        return supplier_lead_time(item)
    return item.lead_time_to_make + max(
        cumulative_lead_time(child) for child in BOM_children(item)
    )
```

Used by backward-scheduling (see [[Master Production Schedule]]) to determine when raw material must be on hand to hit a finished-product due date.

## BOM-Explode Algorithm

The core operation. Given firm demand for finished SKUs, propagate down the tree:

```python
def explode(item, qty, time_offset=0):
    accumulated_demand[item][time_offset] += qty
    for child, qty_per in BOM_edges_from(item):
        child_offset = time_offset - child.lead_time_to_make
        explode(child, qty * qty_per, child_offset)
```

**At shared nodes, demand from multiple parents accumulates into one number.** This is what enables campaign batching at the shared step.

## Where This Lives in the Agent

- **Phase 3 (canonical schema):** the `Item` + `BOMEdge` Pydantic models are loaded from adapters.
- **Phase 4 (reasoning):** `explode()` runs every planning cycle.
- **Phase 5 (approval UI):** the BOM tree is visualized so the planner can drill from finished WO → component WIPs → raws.

## Adapter Considerations

Different ERPs expose BOMs differently:

| System | BOM extraction | Notes |
|---|---|---|
| SAP | OData `BillOfMaterial`, multi-level via `BOMUsage` | Cleanest |
| Tally | XML export, often flat | Customer's accountant may need to author the multi-level structure manually first time |
| Excel | Two-sheet pattern: `items.xlsx` + `bom_edges.xlsx` | Easiest for SMBs without ERP |
| Dynamics | REST API, multi-level supported | Clean |

If the customer's ERP only stores flat BOMs but they have shared WIPs in reality, the Bronze tier onboarding includes **manually authoring** the multi-level structure in Excel before ingestion. This is the most common gap in Indian SMBs.

## See Also

- [[Shared WIPs]] — the operational consequences this data model enables
- [[Master Production Schedule]] — uses cumulative lead time for backward-scheduling
- [[Cyclic RAG]] — lesson-adjusted lead times feed into the cumulative lead time calculation
- [[Skills Vault]] — lot-sizing and allocation policies that govern BOM explosion decisions
- [[Plan A - Building the Agent]] — Phase 3 implementation
- [[Plan B - Data Sourcing]] — what the customer must hand over for BOM
