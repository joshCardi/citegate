# CiteGate

> Prompts beg. Gates block.

**Demo video:** <https://youtu.be/7yWovPTXhNU> · **Devpost:** OpenAI Build Week 2026, Developer Tools

CiteGate is installable evidence-gating infrastructure for drafting agents. It is a thin stdio [Model Context Protocol](https://learn.chatgpt.com/docs/extend/mcp) server that any compatible agent can plug into—not another citation-checking pipeline, hosted workflow, or end-user app.

Four zero-dependency mechanical gates bind claims to exact evidence spans, reject citations outside an approved source set, check citation existence, and detect drift in dates, numbers, and named entities. One model-powered tool, `grounded_rewrite`, lets GPT-5.6 propose a repair from registered evidence; the proposal is released only after all four gates pass again.

## Install for Codex

Requirements: Node.js 22 or newer and Codex CLI. This block installs CiteGate from the repository, registers the seeded evidence file, and confirms the MCP entry. The command form is verified against `codex mcp add --help` and the official Codex MCP documentation.

```bash
git clone https://github.com/joshCardi/citegate.git
cd citegate
npm ci
codex mcp add citegate --env CITEGATE_EVIDENCE_FILE="$PWD/demo/evidence.json" -- node "$PWD/src/server.js"
codex mcp list
```

Restart Codex after adding the server. For another MCP client, configure a stdio server whose command is `node /absolute/path/to/citegate/src/server.js` and whose `CITEGATE_EVIDENCE_FILE` points to an absolute local JSON path.

The evidence registry is a JSON object with a `sources` object mapping stable source IDs to source text. CiteGate reads it once at startup. It does not crawl files, retrieve hidden context, or give GPT-5.6 access to anything outside that registered object.

## Two-minute demo

The default judge path is deterministic, offline, and needs no API key:

```bash
npm run demo
```

Expected money-shot:

```text
BLOCKED: 999 F.3d 123 (1st Cir. 2025)
BLOCKED: Citation not found: 999 F.3d 123 (1st Cir. 2025)
APPROVED: Courts require a concrete injury for standing. See 504 U.S. 555 (1992).
ALL GATES PASS: binding, no-new-citations, existence, fact-preservation
Prompts beg. Gates block.
```

This deterministic run feeds a seeded function-call response through the real `grounded_rewrite` and re-gating code. To exercise the actual Responses API, a judge may supply their own `OPENAI_API_KEY` in the process environment:

```bash
npm run demo -- --live
```

The live path uses GPT-5.6 and may be blocked if its proposal is not an exact registered span. That is expected enforcement, not a fallback: the model proposes, the gate disposes. `COURTLISTENER_TOKEN` is optional; without it, CourtListener's public API is used at its unauthenticated rate and rate-limit or network failures return `UNAVAILABLE` rather than approval.

See [demo/README.md](demo/README.md) for the fixture-level walkthrough.

## Tools

| Tool | Type | Result |
|---|---|---|
| `bind_claim_to_span` | Mechanical | Approves only when a claim exactly equals a valid `[start, end)` character span in a registered source. |
| `check_no_new_citations` | Mechanical | Diffs legal citations in a draft against registered evidence and returns every offending string. |
| `verify_citation_exists` | Mechanical + CourtListener API | Checks existence in the local allowlist or CourtListener's public federal index. Existence does not establish support for a proposition. |
| `check_fact_preservation` | Mechanical | Reports added or missing dates, numbers, and multi-token named entities across English or Spanish text. |
| `grounded_rewrite` | GPT-5.6 Responses API + mechanical gates | Proposes an exact evidence-span repair, then re-runs all four gates before returning it. Requires `OPENAI_API_KEY`. |

`SKILL.md` teaches Codex when to call each gate during grounded drafting.

## Honest scope

- **Existence ≠ truth.** `verify_citation_exists` checks whether authority appears to exist. It never claims that the authority says what a draft attributes to it.
- Exact-span binding proves a string came from a registered source at stated offsets; it does not prove the source is accurate, complete, current, or applicable.
- Citation extraction is deterministic and intentionally limited to supported legal reporter/statute patterns. It is not a universal citation parser.
- Fact preservation compares mechanically extractable surface facts. It does not perform semantic entailment, legal analysis, or general fact-checking.
- CourtListener coverage and availability bound remote existence checks. A failed or rate-limited lookup is `UNAVAILABLE`, never silently passed.
- GPT-5.6 is used only by `grounded_rewrite`. All approval decisions remain mechanical.

## Built with Codex

The core was built in the dedicated Codex thread `CITEGATE-CORE` for OpenAI Build Week's Developer Tools track. JRCH Fiducia LLC, as product owner, froze the scope, architecture, evidence doctrine, demo standard, naming fallback, and human publication checkpoint. Codex implemented the fresh repository in small dated commits, wrote the tests, and reproduced the demo. At runtime, GPT-5.6 has one bounded role: propose a rewrite from the registered evidence through a Responses API function call. CiteGate then independently re-runs every mechanical gate.

CiteGate generalizes a gate pattern from DocketBound, a sibling project by the same author, but is a substantially different product: standalone developer infrastructure rather than a civic application, with a fresh implementation and no shared copied code.

## Supported platforms

- macOS, Linux, and Windows
- Node.js 22 or newer
- Codex CLI, Codex IDE extension, and other MCP clients that support local stdio servers

On Windows, use absolute Windows paths in the MCP command and `CITEGATE_EVIDENCE_FILE`. The gate library itself is platform-independent JavaScript.

## Development

```bash
npm ci
npm test
npm run demo
```

No secrets belong in this repository. `.env` and `.env.*` are ignored. Use only the environment variable names `OPENAI_API_KEY` and optional `COURTLISTENER_TOKEN`; never commit their values.

## License

[MIT](LICENSE) © 2026 JRCH Fiducia LLC.
