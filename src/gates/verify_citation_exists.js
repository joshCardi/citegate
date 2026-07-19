function normalize(value) {
  return value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US");
}

/**
 * Check citation existence only. A positive result does not establish that the
 * authority supports any proposition.
 */
export async function verifyCitationExists({
  citation,
  localAllowlist = [],
  fetchImpl = globalThis.fetch,
  token = process.env.COURTLISTENER_TOKEN,
  endpoint = "https://www.courtlistener.com/api/rest/v3/search/",
}) {
  if (typeof citation !== "string" || citation.trim().length === 0) {
    return { ok: false, status: "BLOCKED", reason: "citation must be a non-empty string.", scope: "existence_only" };
  }
  if (!Array.isArray(localAllowlist) || !localAllowlist.every((item) => typeof item === "string")) {
    return { ok: false, status: "BLOCKED", reason: "localAllowlist must be an array of strings.", scope: "existence_only" };
  }

  const wanted = normalize(citation);
  const localMatch = localAllowlist.find((item) => normalize(item) === wanted);
  if (localMatch) {
    return { ok: true, status: "APPROVED", exists: true, source: "local_allowlist", citation: localMatch, scope: "existence_only" };
  }
  if (typeof fetchImpl !== "function") {
    return { ok: false, status: "UNAVAILABLE", exists: null, reason: "CourtListener lookup is unavailable: fetch is not provided.", scope: "existence_only" };
  }

  const url = new URL(endpoint);
  url.searchParams.set("q", citation);
  url.searchParams.set("type", "o");
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Token ${token}`;

  try {
    const response = await fetchImpl(url, { headers });
    if (!response.ok) {
      const rateLimited = response.status === 429;
      return {
        ok: false,
        status: "UNAVAILABLE",
        exists: null,
        reason: rateLimited
          ? "CourtListener rate limit reached. Set COURTLISTENER_TOKEN or retry later."
          : `CourtListener lookup failed with HTTP ${response.status}.`,
        scope: "existence_only",
      };
    }
    const body = await response.json();
    const count = Number(body.count ?? body.results?.length ?? 0);
    return count > 0
      ? { ok: true, status: "APPROVED", exists: true, source: "courtlistener", matches: count, scope: "existence_only" }
      : { ok: false, status: "BLOCKED", exists: false, reason: `Citation not found: ${citation}`, scope: "existence_only" };
  } catch (error) {
    return {
      ok: false,
      status: "UNAVAILABLE",
      exists: null,
      reason: `CourtListener lookup is temporarily unavailable: ${error.message}`,
      scope: "existence_only",
    };
  }
}
