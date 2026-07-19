#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { checkNoNewCitations, verifyCitationExists } from "../src/gates/index.js";
import { groundedRewrite } from "../src/tools/grounded_rewrite.js";

const here = dirname(fileURLToPath(import.meta.url));

export async function runDemo({ log = console.log, live = process.argv.includes("--live") } = {}) {
  const registry = JSON.parse(await readFile(join(here, "evidence.json"), "utf8")).sources;
  const scenario = JSON.parse(await readFile(join(here, "scenario.json"), "utf8"));

  log("CiteGate deterministic demo");
  log("1/3 Gate the draft against registered evidence");
  const citationGate = checkNoNewCitations({
    draft: scenario.rejectedClaim,
    evidence: Object.values(registry),
  });
  log(`${citationGate.status}: ${citationGate.offendingCitations[0]}`);

  log("2/3 Verify the offending citation's existence");
  const existence = await verifyCitationExists({
    citation: citationGate.offendingCitations[0],
    localAllowlist: Object.values(registry),
    fetchImpl: async () => ({ ok: true, json: async () => ({ count: 0 }) }),
  });
  log(`${existence.status}: ${existence.reason}`);

  log(live
    ? "3/3 Repair with live GPT-5.6, then re-run all mechanical gates"
    : "3/3 Repair with a seeded model-tool response, then re-run all mechanical gates");
  const repairStart = registry[scenario.repairSourceId].indexOf(scenario.repair);
  const modelCall = live ? undefined : async () => ({
    text: scenario.repair,
    sourceId: scenario.repairSourceId,
    start: repairStart,
    end: repairStart + scenario.repair.length,
  });
  const repaired = await groundedRewrite({
    rejectedClaim: scenario.rejectedClaim,
    evidence: registry,
    modelCall,
  });
  if (!repaired.ok) throw new Error(`Repair did not pass: ${repaired.reason}`);
  log(`APPROVED: ${repaired.text}`);
  log("ALL GATES PASS: binding, no-new-citations, existence, fact-preservation");
  log("Prompts beg. Gates block.");
  return { citationGate, existence, repaired };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runDemo().catch((error) => {
    console.error(`Demo failed: ${error.message}`);
    process.exitCode = 1;
  });
}
