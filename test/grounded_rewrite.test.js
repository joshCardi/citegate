import test from "node:test";
import assert from "node:assert/strict";
import { groundedRewrite } from "../src/tools/grounded_rewrite.js";

const source = "The court dismissed the petition. See 410 U.S. 113 (1973).";

test("grounded_rewrite re-gates and blocks a stubbed model hallucination", async () => {
  const invented = "The court awarded damages. See 999 F.3d 123 (1st Cir. 2025).";
  const result = await groundedRewrite({
    rejectedClaim: "The court awarded damages.",
    evidence: { opinion: source },
    modelCall: async () => ({ text: invented, sourceId: "opinion", start: 0, end: invented.length }),
  });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.gates.binding.ok, false);
  assert.deepEqual(result.gates.citations.offendingCitations, ["999 F.3d 123 (1st Cir. 2025)"]);
});

test("grounded_rewrite approves an exact evidence span after all gates pass", async () => {
  const text = "The court dismissed the petition. See 410 U.S. 113 (1973).";
  const result = await groundedRewrite({
    rejectedClaim: "The court awarded damages.",
    evidence: { opinion: source },
    modelCall: async () => ({ text, sourceId: "opinion", start: 0, end: text.length }),
  });
  assert.equal(result.status, "APPROVED");
  assert.equal(result.gates.binding.ok, true);
  assert.equal(result.gates.citations.ok, true);
  assert.equal(result.gates.existence.ok, true);
  assert.equal(result.gates.facts.ok, true);
});

test("grounded_rewrite requires the model tool call shape", async () => {
  const result = await groundedRewrite({
    rejectedClaim: "Rejected.",
    evidence: { opinion: source },
    modelCall: async () => ({ output: [{ type: "message", content: [] }] }),
  });
  assert.equal(result.status, "BLOCKED");
  assert.match(result.reason, /did not call/);
});
