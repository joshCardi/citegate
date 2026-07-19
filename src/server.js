#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  bindClaimToSpan,
  checkFactPreservation,
  checkNoNewCitations,
  extractCitations,
  verifyCitationExists,
} from "./gates/index.js";
import { loadEvidenceRegistry } from "./evidence_registry.js";
import { groundedRewrite } from "./tools/grounded_rewrite.js";

const objectSchema = (properties, required) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required,
});

export const TOOL_DEFINITIONS = [
  {
    name: "bind_claim_to_span",
    description: "Mechanically bind a claim to an exact [start, end) character span in a registered local source. Rejects unknown sources, invalid offsets, and non-exact text.",
    inputSchema: objectSchema({
      claim: { type: "string", minLength: 1 }, sourceId: { type: "string", minLength: 1 },
      start: { type: "integer", minimum: 0 }, end: { type: "integer", minimum: 1 },
    }, ["claim", "sourceId", "start", "end"]),
  },
  {
    name: "check_no_new_citations",
    description: "Mechanically compare citations in a draft with citations present in registered evidence. Returns every offending citation string; it does not assess whether a citation supports a claim.",
    inputSchema: objectSchema({ draft: { type: "string" } }, ["draft"]),
  },
  {
    name: "verify_citation_exists",
    description: "Check whether a legal citation exists in the registered local allowlist or CourtListener's public federal index. Existence does not mean the authority says what the draft claims. Network failure returns UNAVAILABLE, never a false approval.",
    inputSchema: objectSchema({ citation: { type: "string", minLength: 1 } }, ["citation"]),
  },
  {
    name: "check_fact_preservation",
    description: "Mechanically compare two English or Spanish texts for preserved dates, numbers, and multi-token named entities. Reports missing and added values; it is not semantic fact-checking.",
    inputSchema: objectSchema({ source: { type: "string" }, candidate: { type: "string" } }, ["source", "candidate"]),
  },
  {
    name: "grounded_rewrite",
    description: "Use GPT-5.6 to repair a rejected claim using only registered evidence. The proposal is returned only after all four mechanical gates pass; the model proposes, the gates dispose. Requires OPENAI_API_KEY.",
    inputSchema: objectSchema({ rejectedClaim: { type: "string", minLength: 1 } }, ["rejectedClaim"]),
  },
];

function toolResult(result) {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    isError: !result.ok,
  };
}

export function createServer({ evidence = {}, fetchImpl = globalThis.fetch, modelCall } = {}) {
  const server = new Server(
    { name: "citegate", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFINITIONS }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    const args = params.arguments ?? {};
    switch (params.name) {
      case "bind_claim_to_span":
        return toolResult(bindClaimToSpan({ ...args, sources: evidence }));
      case "check_no_new_citations":
        return toolResult(checkNoNewCitations({ draft: args.draft, evidence: Object.values(evidence) }));
      case "verify_citation_exists":
        return toolResult(await verifyCitationExists({
          citation: args.citation,
          localAllowlist: Object.values(evidence).flatMap(extractCitations),
          fetchImpl,
        }));
      case "check_fact_preservation":
        return toolResult(checkFactPreservation(args));
      case "grounded_rewrite":
        return toolResult(await groundedRewrite({
          rejectedClaim: args.rejectedClaim,
          evidence,
          fetchImpl,
          modelCall,
        }));
      default:
        return toolResult({ ok: false, status: "BLOCKED", reason: `Unknown tool: ${params.name}` });
    }
  });
  return server;
}

async function main() {
  const evidence = await loadEvidenceRegistry();
  const server = createServer({ evidence });
  await server.connect(new StdioServerTransport());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`CiteGate could not start: ${error.message}`);
    process.exitCode = 1;
  });
}
