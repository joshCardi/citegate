import {
  bindClaimToSpan,
  checkFactPreservation,
  checkNoNewCitations,
  extractCitations,
  verifyCitationExists,
} from "../gates/index.js";

const SUBMIT_TOOL = {
  type: "function",
  name: "submit_grounded_rewrite",
  description: "Submit one rewritten claim copied exactly from a registered evidence span.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      text: { type: "string", description: "The rewritten claim, exactly equal to the cited evidence span." },
      sourceId: { type: "string", description: "The registered evidence source ID." },
      start: { type: "integer", minimum: 0, description: "Inclusive character offset in the source." },
      end: { type: "integer", minimum: 1, description: "Exclusive character offset in the source." },
    },
    required: ["text", "sourceId", "start", "end"],
  },
};

function evidencePrompt(evidence) {
  return Object.entries(evidence)
    .map(([sourceId, text]) => `<source id=${JSON.stringify(sourceId)}>\n${text}\n</source>`)
    .join("\n\n");
}

async function callResponsesApi({ rejectedClaim, evidence, apiKey, fetchImpl, model }) {
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for grounded_rewrite.");
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: [
        "Repair the rejected claim using only the registered evidence below.",
        "You must copy one complete, relevant claim exactly from one source and submit its exact character offsets.",
        "Do not use outside knowledge. Do not add, alter, or remove characters from the selected span.",
        "Call submit_grounded_rewrite exactly once.",
      ].join(" "),
      input: `REJECTED CLAIM:\n${rejectedClaim}\n\nREGISTERED EVIDENCE:\n${evidencePrompt(evidence)}`,
      tools: [SUBMIT_TOOL],
      tool_choice: { type: "function", name: "submit_grounded_rewrite" },
      parallel_tool_calls: false,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI Responses API failed with HTTP ${response.status}.`);
  return response.json();
}

function parseProposal(modelResponse) {
  if (modelResponse && typeof modelResponse === "object" && "text" in modelResponse) return modelResponse;
  const call = modelResponse?.output?.find(
    (item) => item.type === "function_call" && item.name === "submit_grounded_rewrite",
  );
  if (!call) throw new Error("Model did not call submit_grounded_rewrite.");
  try {
    return JSON.parse(call.arguments);
  } catch {
    throw new Error("Model returned invalid JSON arguments for submit_grounded_rewrite.");
  }
}

export async function runMechanicalGates({ proposal, evidence, fetchImpl, courtListenerToken }) {
  const binding = bindClaimToSpan({
    claim: proposal.text,
    sourceId: proposal.sourceId,
    start: proposal.start,
    end: proposal.end,
    sources: evidence,
  });
  const citations = checkNoNewCitations({ draft: proposal.text, evidence: Object.values(evidence) });
  const sourceSpan = binding.ok ? binding.binding.span : "";
  const facts = checkFactPreservation({ source: sourceSpan, candidate: proposal.text });
  const approvedCitations = Object.values(evidence).flatMap(extractCitations);
  const existence = await Promise.all(
    extractCitations(proposal.text).map((citation) =>
      verifyCitationExists({
        citation,
        localAllowlist: approvedCitations,
        fetchImpl,
        token: courtListenerToken,
      }),
    ),
  );
  const existenceGate = existence.every((result) => result.ok)
    ? { ok: true, status: "APPROVED", results: existence, scope: "existence_only" }
    : { ok: false, status: "BLOCKED", reason: "At least one citation existence check did not pass.", results: existence, scope: "existence_only" };
  return { binding, citations, existence: existenceGate, facts };
}

/** GPT-5.6 proposes a repair; all four mechanical gates decide whether it leaves. */
export async function groundedRewrite({
  rejectedClaim,
  evidence,
  modelCall,
  fetchImpl = globalThis.fetch,
  apiKey = process.env.OPENAI_API_KEY,
  courtListenerToken = process.env.COURTLISTENER_TOKEN,
  model = "gpt-5.6",
}) {
  if (typeof rejectedClaim !== "string" || rejectedClaim.length === 0) {
    return { ok: false, status: "BLOCKED", reason: "rejectedClaim must be a non-empty string." };
  }
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence) ||
      !Object.values(evidence).every((text) => typeof text === "string")) {
    return { ok: false, status: "BLOCKED", reason: "evidence must be an object of registered source strings." };
  }

  try {
    const raw = modelCall
      ? await modelCall({ rejectedClaim, evidence, model, tool: SUBMIT_TOOL })
      : await callResponsesApi({ rejectedClaim, evidence, apiKey, fetchImpl, model });
    const proposal = parseProposal(raw);
    const gates = await runMechanicalGates({ proposal, evidence, fetchImpl, courtListenerToken });
    const ok = Object.values(gates).every((gate) => gate.ok);
    return ok
      ? { ok: true, status: "APPROVED", text: proposal.text, binding: gates.binding.binding, gates, model }
      : { ok: false, status: "BLOCKED", reason: "The model proposal failed one or more mechanical gates.", proposal, gates, model };
  } catch (error) {
    return { ok: false, status: "BLOCKED", reason: error.message, model };
  }
}
