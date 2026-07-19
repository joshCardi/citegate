import { readFile } from "node:fs/promises";

export async function loadEvidenceRegistry(path = process.env.CITEGATE_EVIDENCE_FILE) {
  if (!path) return {};
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Could not load CITEGATE_EVIDENCE_FILE "${path}": ${error.message}`);
  }
  const sources = parsed?.sources ?? parsed;
  if (!sources || typeof sources !== "object" || Array.isArray(sources) ||
      !Object.values(sources).every((text) => typeof text === "string")) {
    throw new Error(`Evidence registry "${path}" must contain a "sources" object of string values.`);
  }
  return sources;
}
