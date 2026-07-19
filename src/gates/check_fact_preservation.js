const DATE_PATTERNS = [
  /\b\d{4}-\d{2}-\d{2}\b/gu,
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gu,
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{1,2}(?:,|\s+de)?\s+\d{4}\b/giu,
  /\b\d{1,2}\s+(?:de\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de|,)?\s+\d{4}\b/giu,
];
const NUMBER_PATTERN = /(?<![\p{L}\p{N}])(?:[$€£]\s*)?\d+(?:[.,]\d+)*(?:\s*%)?(?![\p{L}\p{N}])/gu;
const ENTITY_PATTERN = /\b(?:[\p{Lu}ÁÉÍÓÚÜÑ][\p{L}'’-]+)(?:\s+(?:de|del|la|las|los|y|of|the|and|&)?\s*[\p{Lu}ÁÉÍÓÚÜÑ][\p{L}'’-]+)+\b/gu;

function uniqueMatches(text, patterns) {
  return [...new Set(patterns.flatMap((pattern) => text.match(pattern) ?? []).map((value) => value.trim()))];
}

const MONTHS = new Map([
  ["january", 1], ["enero", 1], ["february", 2], ["febrero", 2],
  ["march", 3], ["marzo", 3], ["april", 4], ["abril", 4],
  ["may", 5], ["mayo", 5], ["june", 6], ["junio", 6],
  ["july", 7], ["julio", 7], ["august", 8], ["agosto", 8],
  ["september", 9], ["septiembre", 9], ["october", 10], ["octubre", 10],
  ["november", 11], ["noviembre", 11], ["december", 12], ["diciembre", 12],
]);

function normalizeDate(value) {
  const numeric = value.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (numeric) return `${numeric[1]}-${numeric[2]}-${numeric[3]}`;
  const parts = value.toLocaleLowerCase("en-US").replace(/,/gu, "").split(/\s+/u).filter((part) => part !== "de");
  const monthIndex = parts.findIndex((part) => MONTHS.has(part));
  if (monthIndex >= 0) {
    const month = String(MONTHS.get(parts[monthIndex])).padStart(2, "0");
    const day = String(Number(parts[monthIndex === 0 ? 1 : 0])).padStart(2, "0");
    const year = parts.find((part) => /^\d{4}$/u.test(part));
    if (year) return `${year}-${month}-${day}`;
  }
  return value;
}

function facts(text) {
  const rawDates = uniqueMatches(text, DATE_PATTERNS);
  const dates = rawDates.map(normalizeDate);
  const dateText = rawDates.reduce((value, date) => value.replace(date, " "), text);
  const numbers = uniqueMatches(dateText, [NUMBER_PATTERN]);
  const entities = uniqueMatches(dateText, [ENTITY_PATTERN]);
  return { dates, numbers, entities };
}

function difference(left, right) {
  const rightCounts = new Map();
  for (const value of right) rightCounts.set(value, (rightCounts.get(value) ?? 0) + 1);
  return left.filter((value) => {
    const count = rightCounts.get(value) ?? 0;
    if (count === 0) return true;
    rightCounts.set(value, count - 1);
    return false;
  });
}

/** Compare mechanically extractable dates, numbers, and multi-token named entities. */
export function checkFactPreservation({ source, candidate }) {
  if (typeof source !== "string" || typeof candidate !== "string") {
    return { ok: false, status: "BLOCKED", reason: "source and candidate must be strings." };
  }
  const sourceFacts = facts(source);
  const candidateFacts = facts(candidate);
  const drift = {};
  for (const kind of ["dates", "numbers", "entities"]) {
    const missing = difference(sourceFacts[kind], candidateFacts[kind]);
    const added = difference(candidateFacts[kind], sourceFacts[kind]);
    if (missing.length || added.length) drift[kind] = { missing, added };
  }
  return Object.keys(drift).length === 0
    ? { ok: true, status: "APPROVED", facts: sourceFacts }
    : { ok: false, status: "BLOCKED", reason: "Dates, numbers, or named entities drifted between texts.", drift };
}
