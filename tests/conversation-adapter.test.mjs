import test from "node:test";
import assert from "node:assert/strict";
import { answerConversation, normalizeConversationAnswer } from "../src/lib/conversation-adapter.js";
import { checkRateLimit, resetRateLimits } from "../src/lib/abuse-protection.js";

test("conversation requires consent and API key", async () => {
  assert.equal((await answerConversation({ question: "hola" })).status, 403);
  assert.equal((await answerConversation({ question: "hola", consent: true })).status, 503);
});

test("conversation normalizes a structured response", async () => {
  const payload = { choices: [{ message: { content: JSON.stringify({ observed: ["mesa"], inferences: ["interior"], unknowns: ["distancia"], response: "OMEKH observa una mesa." }) } }] };
  const result = await answerConversation({ apiKey: "server-only", question: "describe", consent: true, fetchImpl: async () => new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } }) });
  assert.equal(result.status, 200);
  assert.equal(result.body.answer.response, "OMEKH observa una mesa.");
});

test("conversation rejects oversized questions", async () => {
  const result = await answerConversation({ apiKey: "server-only", question: "a".repeat(1001), consent: true });
  assert.equal(result.status, 400);
});

test("normalizeConversationAnswer validates structure", () => {
  assert.equal(normalizeConversationAnswer({ observed: ["x"], inferences: [], unknowns: [], response: "ok" }).ok, true);
  assert.equal(normalizeConversationAnswer({ observed: [], inferences: [], unknowns: [], response: "" }).ok, false);
});

test("rate limiter blocks excess requests", () => {
  resetRateLimits();
  let last;
  for (let index = 0; index < 3; index += 1) last = checkRateLimit("test", "ip", { limit: 2, windowMs: 60000 });
  assert.equal(last.allowed, false);
});