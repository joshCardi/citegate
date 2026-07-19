# CITEGATE — Product Spec v1.0 (FROZEN)
### OpenAI Build Week · Track: **Developer Tools** · Entrant: **JRCH Fiducia LLC** (Organization; Representative: Josué R. Cardona Hernández)
### Internal codename: La Prueba · Deadline: Tue Jul 21, 5:00 PM PT — target submit Mon night

## One-liner
> CiteGate is an MCP server that gives any coding agent mechanical evidence gates: claims bind to exact source spans, citations must exist, and hallucinated authority gets blocked before it ships — with one GPT-5.6-powered tool to repair what the gates reject.

## The problem (for developers)
Every team building agents that draft grounded text (legal, compliance, research, journalism) rebuilds the same thing badly: trust checks as prompts. Prompts beg; gates block. CiteGate packages the gates as infrastructure any MCP client (Codex first) can install in one command.

## The product — MCP server with 5 tools + 1 skill
| Tool | Type | What it does |
|---|---|---|
| `bind_claim_to_span` | Mechanical | Binds a claim to an exact character span of a registered source document; rejects binding to non-existent spans |
| `check_no_new_citations` | Mechanical | Diffs a draft against the registered evidence set; any citation not present in approved sources → FAIL with the offending string |
| `verify_citation_exists` | Mechanical + API | Verifies legal citations against CourtListener's public API (federal); configurable allowlist for local corpora. Existence check, honestly scoped: "exists ≠ says what you claim" |
| `check_fact_preservation` | Mechanical | Compares two language versions (or draft vs source) for preserved dates, numbers, and named entities; any drift → FAIL with the pair |
| `grounded_rewrite` | **GPT-5.6** (Responses API + tool calling) | Takes a REJECTED claim + its approved evidence; rewrites strictly within the evidence; output re-runs ALL mechanical gates before returning — the model repairs, the gates decide |
| `SKILL.md` | Skill | Teaches Codex when/how to run the gates during any drafting task |

**Design doctrine (the pitch to these judges):** deterministic gates + one model-powered repair = "the model proposes, the gate disposes." No agent frameworks, no orchestration — a thin MCP server (stdio) any client speaks. Sottiaux: a primitive that scales. Steinberger: it does something real in your terminal. Korevec: install → gate → fix in under 2 minutes, docs as product.

## Demo scenario (the terminal money-shot, <2:30 video)
1. `npx citegate` (or one-line install) → add to Codex MCP config → open Codex.
2. Ask Codex to draft a short legal memo paragraph; it invents a plausible citation.
3. CiteGate's `verify_citation_exists` → **BLOCKED: citation not found** (the hallucination caught on camera, in the terminal).
4. Codex calls `grounded_rewrite` → GPT-5.6 repairs within the registered evidence → all gates pass → APPROVED.
5. Kill line: *"Prompts beg. Gates block."*

## Relationship to DocketBound (disclosure, honest)
CiteGate generalizes the gate pattern proven inside DocketBound (same author, same Build Week — multiple submissions expressly permitted; each project eligible for one prize). **Fresh repo, fresh implementation, own Codex thread** — the products are substantially different: a civic application vs developer infrastructure. README states this relationship in one line. No code is shared by copy; the gates are reimplemented as a standalone zero-dependency library.

## Hard scope (24h build — cut from below, never above)
IN: stdio MCP server (TypeScript or plain Node) · the 5 tools · evidence registry (local JSON/files) · CourtListener existence check · SKILL.md · tests for every gate (incl. the hallucinated-citation case) · README with install for Codex (+ generic MCP clients) · demo script/fixtures so judges reproduce the money-shot in 2 min.
OUT: UI · web service · DocketBound corpus/Supabase (public sources only — judges must be able to run everything) · npm publish if friction (repo install suffices) · auth · multi-language beyond EN/ES fact-check.

## Compliance checklist (per submission — ALL separate from DocketBound's)
- [ ] **New repo** `citegate` (public, MIT, © 2026 JRCH Fiducia LLC)
- [ ] **New Codex thread "CITEGATE-CORE"** — its own `/feedback` Session ID
- [ ] Dated commits within window · README narrating Codex collaboration + GPT-5.6 runtime role
- [ ] Dev Tools track extras (rules require): installation instructions, supported platforms, **a way to test without rebuilding** (demo script + seeded fixtures = our answer)
- [ ] Video <3 min, English VO, public YouTube — terminal demo; founder face optional (10s open with LLC framing is enough)
- [ ] Devpost form as **Organization: JRCH Fiducia LLC**, category Developer Tools
- [ ] English everywhere · no secrets (CourtListener token + OPENAI_API_KEY via env, documented by name)

## Name knockout (kickoff step 0)
Brand: **CiteGate**. Codex verifies at kickoff: `npm view citegate` (if taken → package `citegate-mcp`, brand unchanged) + quick GitHub/product search (if a DIRECT dev-tool collision appears → report and pause; fallback brands: GroundGate, SpanGate).

## Judging function fit
① Tech implementation: MCP server + Codex-built + GPT-5.6 runtime repair tool — native maximum. ② Design: install→gate→fix complete loop, docs-as-product. ③ Impact: every grounded-text agent team needs this; crisp dev audience. ④ Idea: "evidence gates as infrastructure" — the anti-wrapper.
