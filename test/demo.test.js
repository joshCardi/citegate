import test from "node:test";
import assert from "node:assert/strict";
import { runDemo } from "../demo/run.js";

test("demo deterministically catches the hallucination and approves the gated repair", async () => {
  const lines = [];
  const result = await runDemo({ log: (line) => lines.push(line), live: false });
  assert.deepEqual(result.citationGate.offendingCitations, ["999 F.3d 123 (1st Cir. 2025)"]);
  assert.equal(result.existence.status, "BLOCKED");
  assert.equal(result.repaired.status, "APPROVED");
  assert.match(lines.join("\n"), /ALL GATES PASS/);
});
