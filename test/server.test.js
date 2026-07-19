import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

async function connectedPair(options) {
  const server = createServer(options);
  const client = new Client({ name: "citegate-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

test("stdio server surface lists exactly five honestly described tools", async (t) => {
  const { client, server } = await connectedPair({ evidence: {} });
  t.after(async () => { await client.close(); await server.close(); });
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(({ name }) => name), [
    "bind_claim_to_span", "check_no_new_citations", "verify_citation_exists",
    "check_fact_preservation", "grounded_rewrite",
  ]);
  assert.match(tools.find(({ name }) => name === "verify_citation_exists").description, /Existence does not mean/);
});

test("server tools use only the loaded evidence registry", async (t) => {
  const source = "The petition was denied. See 410 U.S. 113 (1973).";
  const { client, server } = await connectedPair({ evidence: { opinion: source } });
  t.after(async () => { await client.close(); await server.close(); });
  const response = await client.callTool({
    name: "bind_claim_to_span",
    arguments: { claim: "The petition was denied.", sourceId: "opinion", start: 0, end: 24 },
  });
  assert.equal(response.isError, false);
  const result = JSON.parse(response.content[0].text);
  assert.equal(result.binding.sourceId, "opinion");
});
