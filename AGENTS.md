# AGENTS.md — CiteGate
### Guidance for coding agents in this repository

## What this is
CiteGate: an MCP server (stdio) exposing mechanical evidence gates + one GPT-5.6 repair tool, so any MCP client (Codex first) can block hallucinated citations and unbound claims during drafting. Built for OpenAI Build Week, Developer Tools track, by JRCH Fiducia LLC. Frozen spec: `SPEC.md`.

## Architecture rules
- **Thin server, zero frameworks.** Plain Node ≥22 (or TypeScript compiled trivially), stdio MCP protocol, no orchestration layers. The gates are pure functions; the server is a thin adapter.
- **Gates are deterministic and honest.** `verify_citation_exists` checks EXISTENCE against CourtListener's public API and registered local sources — never truth of the proposition. Say so in tool descriptions and docs.
- **`grounded_rewrite` is the ONLY model-powered tool:** GPT-5.6 via Responses API with tool calling; it may read ONLY the registered evidence; its output MUST re-run all mechanical gates before being returned. The model proposes, the gate disposes — never weaken this.
- **No secrets in repo.** `OPENAI_API_KEY`, `COURTLISTENER_TOKEN` via env, documented by name only. CourtListener works unauthenticated at low rate — degrade gracefully.
- **Zero external dependencies where possible** — the gates library must be embeddable. If MCP SDK is needed for the server shell, that's the only dependency.

## Working style
- Small dated commits; commit history is competition evidence.
- Tests for every gate INCLUDING the demo case: a hallucinated citation must be caught by test, not just by demo.
- English everywhere. Error messages are product surface — precise, actionable, no jargon fog.
- README is the product's front door (judges are developers): install for Codex in one block, the 2-minute demo script, tool reference table, honest scope notes.
- The demo fixtures (evidence files + the drafting scenario) live in `demo/` and must reproduce the money-shot deterministically.

## Compliance (hackathon-critical)
- This repo's core is built in the single Codex thread "CITEGATE-CORE"; its `/feedback` Session ID is submitted with THIS project (never DocketBound's).
- README includes: how Codex built it, where the human decided, GPT-5.6's runtime role, one-line relationship disclosure to DocketBound (same author, substantially different product), MIT LICENSE (© 2026 JRCH Fiducia LLC).
- Dev Tools track requires: installation instructions, supported platforms, and judge-testable path without rebuilding → the `demo/` script is that path. Keep it working at all times.
