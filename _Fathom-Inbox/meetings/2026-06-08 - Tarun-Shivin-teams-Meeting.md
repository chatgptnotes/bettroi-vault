---
date: 2026-06-08
source: fathom
url: https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt
recording_id: 152945752
attendees: ["Dr Murali BK"]
project: _Fathom-Inbox
classified_by: claude-haiku
confidence: 0
classification_reason: "GDMO project not clearly mapped to available folders; OCI infrastructure proposal meeting requires manual classification"
---

# Tarun Shivin teams Meeting

*2026-06-08 — [Open in Fathom](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt)*

## Meeting Purpose

[Align on the OCI infrastructure proposal for the GDMO project.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=30.0)

## Key Takeaways

  - [**Proposal Restructured:** The Excel sheet will be the single source of truth, with detailed explanations replacing the separate email spec to eliminate traceability confusion.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=303.0)
  - [**Phased Budgeting Adopted:** The proposal will now include two budgets: a lean Phase 1 (6-month) and an expanded Year 2 (12-month) plan that projects growth.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1663.0)
  - [**GPU Sizing Decision:** The proposal will use a 16GB GPU for Phase 1, with a 24GB upgrade ($500/mo) noted as an option to handle more complex Arabic text processing.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=914.0)
  - [**Critical Dependency:** The network design (public with WAF vs. private with IPsec) hinges on the client's on-prem connectivity needs, which must be confirmed with Josefa.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1819.0)

## Topics

### Proposal Traceability & Clarity

  - [**Problem:** A mismatch between the email spec and Excel sheet caused traceability issues, making it unclear how requirements were met.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=36.0)
  - [**Solution:** The Excel sheet will become the single source of truth.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=303.0)
      - [Shivin will add detailed explanations directly to the sheet.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=340.0)
      - [The separate email spec will be removed from the proposal document.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=346.0)
  - [**Specific Updates:**](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=75.0)
      - [**AppVM:** The "4" in the Excel sheet will be clarified as "4 physical core equivalent."](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=152.0)
      - [**Block Storage:** The sheet will be updated to reflect the 200GB and 500GB storage volumes mentioned in the email.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=213.0)
      - [**AI Server:** The single line item will be explained as a single, powerful GPU instance that exceeds the email's 6-core/32GB RAM spec.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=259.0)

### Phased Budgeting for Growth

  - [**Rationale:** Josefa requested two budgets (6-month and 12-month) to plan for future growth beyond the initial pilot.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1663.0)
  - [**New Structure:** Shivin will create two tabs in the Excel sheet:](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1740.0)
      - [**Year 1 (Phase 1):** A lean budget for the initial 6-month pilot.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1772.0)
      - [**Year 2:** A growth budget that projects increased infrastructure needs.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1740.0)
  - [**Year 2 Projections:**](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1740.0)
      - [**GPU Upgrade:** From 16GB to 24GB, adding \~$500/month.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1182.0)
      - [**Load Balancer:** Added for high availability.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1749.0)
      - [**Additional AppVM:** Added for redundancy.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1749.0)

### GPU Sizing for Arabic Text

  - [**Challenge:** Processing Arabic text requires more GPU memory than English (est. 8x more tokens), potentially straining the 16GB GPU.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=914.0)
  - [**Decision:**](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1173.0)
      - [**Phase 1:** Start with the 16GB GPU to keep initial costs low.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1173.0)
      - [**Option:** Note the 24GB GPU upgrade as an option, costing an additional \~$500/month.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1182.0)
  - [**Rationale:** This approach balances cost and performance for the initial pilot, allowing for an upgrade if performance metrics show it's needed.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1173.0)

### Scope & Compliance Clarifications

  - [**LLM Strategy:** The proposal is for a self-hosted, open-source LLM on a GPU VM, not a managed OCI service.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=475.0)
  - [**Shared Responsibility:** The proposal will clarify that the client is responsible for application-level security settings.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=511.0)
  - [**Managed Service Scope:** The $10/hr monthly charge covers ongoing infrastructure management, including:](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=566.0)
      - [Data residency & encryption](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=540.0)
      - [Key management, IAM, logging & audit retention](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=540.0)
      - [Backup & recovery, vulnerability management, patching](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=540.0)
      - [Admin access control, audit evidence pack](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=540.0)
  - [**Network Design:** The design depends on client connectivity needs.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1819.0)
      - [**Public:** If no on-prem connection → Requires WAF.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1819.0)
      - [**Private:** If IPsec tunnel is used → WAF may be removed.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1819.0)
  - [**Backup & DR:**](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=755.0)
      - [**Backup:** Daily backups are included.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=755.0)
      - [**DR:** Not included. Requires a separate discussion to define RTO/RPO for a cold or hot DR strategy.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=755.0)
  - [**Windows License:** Removed from the current BOM. It will be added later if the FlowAxle application is migrated to OCI, as it requires Windows.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1479.0)

### Application Scope & Dependencies

  - [**HR Pulse Scope:** Confirmed to include Excel ingestion, rule detection, AI email drafting, approvals, dashboards, and mobile access.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=809.0)
  - [**Second Brain Agent Factory Scope:** Most details (e.g., file types, access control) are technical and do not impact the current infrastructure cost.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=834.0)
  - [**Speech-to-Text:** If required, the team will use OCI's local speech-to-text API to maintain data residency. This would be added to the BOM.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1260.0)

## Next Steps

  - [**Shivin:**](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1040.0)
      - [Update the Excel sheet with detailed explanations and the two-tab (Year 1/Year 2) structure.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1740.0)
      - [Provide Biji with text for the proposal document's compliance and budgetary disclaimers.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1062.0)
  - [**Biji:**](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1819.0)
      - [Call Josefa to confirm the client's on-prem connectivity needs, which will determine the final network design (public vs. private).](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1819.0)
  - [**Haritha:**](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1251.0)
      - [Update the main proposal document with Shivin's revised Excel sheet and Biji's disclaimers.](https://fathom.video/share/J_1LBszgvdpNCpnVjFxKsJshjX2yxNZt?tab=summary&timestamp=1251.0)

