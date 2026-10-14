import test from "node:test";
import assert from "node:assert/strict";
import { classifyAudio } from "../src/lib/audio-adapter.js";

test("audio classifier does not send incompatible json_schema", async () => {
  let request;
  const payload = { choices: [{ message: { content: JSON.stringify({ category: "ambiente", observations: ["sonido continuo"], uncertainty: "No identifica la fuente.", origin: "model" }) } }] };
  const result = await classifyAudio({
    apiKey: "server-only",
    audioBase64: "YWJj",
    consent: true,
    fetchImpl: async (_url, requestInit) => {
      request = JSON.parse(requestInit.body);
      return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  assert.equal(result.status, 200);
  assert.equal(Object.prototype.hasOwnProperty.call(request, "response_format"), false);
});