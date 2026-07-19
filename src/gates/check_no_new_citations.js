const LEGAL_CITATION_PATTERNS = [
  /\b\d+\s+U\.S\.\s+\d+\b(?:\s*\(\d{4}\))?/gu,
  /\b\d+\s+F\.(?:2d|3d|4th|Supp\.\s*\d*d?)\s+\d+\b(?:\s*\([^)]*\d{4}\))?/gu,
  /\b\d+\s+S\.\s*Ct\.\s+\d+\b(?:\s*\(\d{4}\))?/gu,
  /\b\d+\s+P\.R\.\s+Offic\.\s+Trans\.\s+\d+\b(?:\s*\(\d{4}\))?/gu,
  /\b\d+\s+D\.P\.R\.\s+\d+\b(?:\s*\(\d{4}\))?/gu,
  /\b(?:No\.|Núm\.)\s+[A-Z0-9-]+(?:,?\s+\d{4})?\b/giu,
];

export function extractCitations(text) {
  if (typeof text !== "string") return [];
  const found = LEGAL_CITATION_PATTERNS.flatMap((pattern) => text.match(pattern) ?? []);
  return [...new Set(found.map((citation) => citation.trim()))];
}

/** Reject citations in a draft that do not occur verbatim in approved evidence. */
export function checkNoNewCitations({ draft, evidence = [], approvedCitations = [] }) {
  if (typeof draft !== "string") {
    return { ok: false, status: "BLOCKED", reason: "draft must be a string." };
  }
  if (!Array.isArray(evidence) || !evidence.every((item) => typeof item === "string")) {
    return { ok: false, status: "BLOCKED", reason: "evidence must be an array of strings." };
  }
  if (!Array.isArray(approvedCitations) || !approvedCitations.every((item) => typeof item === "string")) {
    return { ok: false, status: "BLOCKED", reason: "approvedCitations must be an array of strings." };
  }

  const draftCitations = extractCitations(draft);
  const approved = new Set([
    ...approvedCitations.map((citation) => citation.trim()),
    ...evidence.flatMap(extractCitations),
  ]);
  const offendingCitations = draftCitations.filter((citation) => !approved.has(citation));

  return offendingCitations.length === 0
    ? { ok: true, status: "APPROVED", citations: draftCitations }
    : {
        ok: false,
        status: "BLOCKED",
        reason: `Draft contains ${offendingCitations.length} citation(s) outside the approved evidence set.`,
        offendingCitations,
      };
}
