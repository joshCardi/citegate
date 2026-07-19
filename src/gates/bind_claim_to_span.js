function fail(reason, details = {}) {
  return { ok: false, status: "BLOCKED", reason, ...details };
}

/** Bind a claim to an exact character span in a registered source. */
export function bindClaimToSpan({ claim, sourceId, start, end, sources }) {
  if (typeof claim !== "string" || claim.length === 0) {
    return fail("claim must be a non-empty string.");
  }
  if (!sources || typeof sources !== "object" || Array.isArray(sources)) {
    return fail("sources must be an object keyed by source ID.");
  }

  const source = sources[sourceId];
  if (typeof source !== "string") {
    return fail(`Source "${sourceId}" is not registered.`, { sourceId });
  }
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    return fail("start and end must be integer character offsets.");
  }
  if (start < 0 || end <= start || end > source.length) {
    return fail(
      `Invalid span [${start}, ${end}) for source "${sourceId}" with length ${source.length}.`,
      { sourceId, start, end, sourceLength: source.length },
    );
  }

  const span = source.slice(start, end);
  if (span !== claim) {
    return fail("Claim does not exactly match the requested source span.", {
      sourceId,
      start,
      end,
      span,
    });
  }

  return {
    ok: true,
    status: "APPROVED",
    binding: { claim, sourceId, start, end, span },
  };
}
