import test from "node:test";
import assert from "node:assert/strict";
import {
  bindClaimToSpan,
  checkFactPreservation,
  checkNoNewCitations,
  verifyCitationExists,
} from "../src/gates/index.js";

test("bind_claim_to_span approves only an exact registered span", () => {
  const text = "The agency filed on March 4, 2026.";
  const claim = "filed on March 4, 2026";
  const start = text.indexOf(claim);
  assert.equal(bindClaimToSpan({ claim, sourceId: "record", start, end: start + claim.length, sources: { record: text } }).ok, true);
  assert.match(bindClaimToSpan({ claim, sourceId: "record", start: -1, end: 5, sources: { record: text } }).reason, /Invalid span/);
  assert.match(bindClaimToSpan({ claim: "filed later", sourceId: "record", start, end: start + claim.length, sources: { record: text } }).reason, /does not exactly match/);
});

test("check_no_new_citations reports the exact hallucinated citation", () => {
  const result = checkNoNewCitations({
    draft: "The rule applies. Rivera v. Agency, 999 F.3d 123 (1st Cir. 2025).",
    evidence: ["The approved case is 410 U.S. 113 (1973)."],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.offendingCitations, ["999 F.3d 123 (1st Cir. 2025)"]);
});

test("verify_citation_exists accepts local allowlist and states its limited scope", async () => {
  const result = await verifyCitationExists({ citation: "410 U.S. 113 (1973)", localAllowlist: ["410 U.S. 113 (1973)"], fetchImpl: null });
  assert.equal(result.ok, true);
  assert.equal(result.scope, "existence_only");
});

test("verify_citation_exists handles CourtListener found, missing, and unavailable", async () => {
  const found = await verifyCitationExists({ citation: "410 U.S. 113", fetchImpl: async () => ({ ok: true, json: async () => ({ count: 1 }) }) });
  assert.equal(found.exists, true);
  const missing = await verifyCitationExists({ citation: "999 F.3d 123", fetchImpl: async () => ({ ok: true, json: async () => ({ count: 0 }) }) });
  assert.equal(missing.status, "BLOCKED");
  const unavailable = await verifyCitationExists({ citation: "410 U.S. 113", fetchImpl: async () => { throw new Error("offline"); } });
  assert.equal(unavailable.status, "UNAVAILABLE");
  assert.equal(unavailable.exists, null);
});

test("check_fact_preservation supports matching EN/ES facts and blocks drift", () => {
  const source = "On March 4, 2026, Acme Legal Group paid $2,500.";
  const preserved = "Acme Legal Group paid $2,500 on March 4, 2026.";
  assert.equal(checkFactPreservation({ source, candidate: preserved }).ok, true);
  const translated = "El 4 de marzo de 2026, Acme Legal Group pagó $2,500.";
  assert.equal(checkFactPreservation({ source, candidate: translated }).ok, true);
  const drifted = "El 4 de marzo de 2027, Acme Legal Group pagó $2,700.";
  const result = checkFactPreservation({ source, candidate: drifted });
  assert.equal(result.ok, false);
  assert.deepEqual(result.drift.numbers, { missing: ["$2,500"], added: ["$2,700"] });
});
