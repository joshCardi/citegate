---
name: citegate
description: Apply mechanical evidence gates while drafting grounded legal, compliance, research, or journalistic text, and repair rejected claims using registered evidence only.
---

# CiteGate drafting gates

Use CiteGate whenever a draft must remain bound to a supplied evidence set.

1. Before drafting, ensure `CITEGATE_EVIDENCE_FILE` points to the approved local JSON registry. Treat only those sources as registered evidence.
2. For every material claim copied from evidence, call `bind_claim_to_span` with the exact source ID and `[start, end)` character offsets.
3. Before returning a draft, call `check_no_new_citations` on the complete draft.
4. For each legal citation, call `verify_citation_exists`. Interpret APPROVED only as evidence that the citation exists; it does not prove support for the proposition. Treat UNAVAILABLE as unresolved, not approved.
5. For translations or revisions where dates, numbers, and named entities must remain stable, call `check_fact_preservation`.
6. If any claim or citation is blocked, do not silently edit around the result. Call `grounded_rewrite` with the rejected claim. Return its repair only when CiteGate reports APPROVED after all four mechanical gates.

The model proposes; the gate disposes. Never characterize these mechanical checks as semantic truth verification.
