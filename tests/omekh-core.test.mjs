import test from "node:test";
import assert from "node:assert/strict";
import { analyzeAudioFrame, canRequestVision, labelDataOrigin, normalizeVisionResponse } from "../src/lib/omekh-core.js";
import { analyzeVisionImage, MAX_IMAGE_CHARS } from "../src/lib/vision-adapter.js";
import { classifyAudio, MAX_AUDIO_CHARS } from "../src/lib/audio-adapter.js";
import { normalizeStructuredVision, normalizeAudioClassification } from "../src/lib/perception-schema.js";
import { fusePerception, answerEnvironmentQuestion } from "../src/lib/fusion-engine.js";

test("vision requires camera and explicit consent", () => {
  assert.equal(canRequestVision({ cameraActive: true, explicitConsent: true }), true);
  assert.equal(canRequestVision({ cameraActive: true, explicitConsent: false }), false);
  assert.equal(canRequestVision({ cameraActive: false, explicitConsent: true }), false);
});
test("empty model output is never presented as a detection", () => {
  assert.deepEqual(normalizeVisionResponse({ description: "  " }), { ok: false, error: "El modelo no devolvió una descripción utilizable." });
  assert.equal(labelDataOrigin("unknown"), "SIN DETECCIÓN");
});
test("valid model output is trimmed and labelled", () => {
  assert.deepEqual(normalizeVisionResponse({ description: "  Un escritorio iluminado. " }), { ok: true, description: "Un escritorio iluminado." });
  assert.equal(labelDataOrigin("model"), "DESCRIPCIÓN GENERADA POR MODELO");
});

test("audio intensity is a local measurement and flags abrupt changes", () => {
  const quiet = analyzeAudioFrame(new Uint8Array(32).fill(128));
  const loud = analyzeAudioFrame(new Uint8Array(32).fill(255), quiet.level);
  assert.equal(quiet.band, "silencio");
  assert.equal(loud.changed, true);
  assert.equal(loud.band, "alto");
});

test("vision API adapter reports missing credentials without contacting a provider", async () => {
  let called = false;
  const result = await analyzeVisionImage({ imageDataUrl: "data:image/jpeg;base64,abc", fetchImpl: async () => { called = true; } });
  assert.equal(result.status, 503);
  assert.equal(called, false);
});

test("vision API adapter rejects oversized captures before a request", async () => {
  const result = await analyzeVisionImage({ apiKey: "server-only", imageDataUrl: `data:image/jpeg;base64,${"x".repeat(MAX_IMAGE_CHARS)}` });
  assert.equal(result.status, 400);
});

test("vision API adapter exposes a provider failure, never a simulated result", async () => {
  const result = await analyzeVisionImage({ apiKey: "server-only", imageDataUrl: "data:image/jpeg;base64,abc", fetchImpl: async () => new Response("", { status: 500 }) });
  assert.equal(result.status, 502);
  assert.match(result.body.error, /proveedor/);
});

test("structured vision rejects untrusted or incomplete model data", () => {
  const valid = { scene_description: "Una mesa visible.", objects: [], potential_obstacles: [], relevant_observations: [], uncertainty_warnings: ["La captura es parcial."], origin: "model" };
  assert.equal(normalizeStructuredVision(valid).ok, true);
  assert.equal(normalizeStructuredVision({ ...valid, origin: "sensor" }).ok, false);
  assert.equal(normalizeStructuredVision({ ...valid, objects: [{ name: "mesa", observation: "visible", origin: "sensor" }] }).ok, false);
});

test("audio classifier requires consent, validates limits, and never simulates", async () => {
  let called = false;
  const noConsent = await classifyAudio({ apiKey: "server-only", audioBase64: "YWJj", consent: false, fetchImpl: async () => { called = true; } });
  assert.equal(noConsent.status, 403); assert.equal(called, false);
  const oversized = await classifyAudio({ apiKey: "server-only", audioBase64: "A".repeat(MAX_AUDIO_CHARS + 1), consent: true });
  assert.equal(oversized.status, 400);
  const missingKey = await classifyAudio({ audioBase64: "YWJj", consent: true });
  assert.equal(missingKey.status, 503);
});

test("audio classifier normalizes a structured provider response", async () => {
  const payload = { choices: [{ message: { content: JSON.stringify({ category: "ambiente", observations: ["sonido continuo"], uncertainty: "No permite identificar fuente.", origin: "model" }) } }] };
  const result = await classifyAudio({ apiKey: "server-only", audioBase64: "YWJj", consent: true, fetchImpl: async () => new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } }) });
  assert.equal(result.status, 200); assert.equal(result.body.classification.category, "ambiente");
  assert.equal(normalizeAudioClassification({ category: "", observations: [], uncertainty: "x", origin: "model" }).ok, false);
});

test("fusion preserves modality, provenance, and missing data", () => {
  const fused = fusePerception({ vision: { scene_description: "Escena visible.", relevant_observations: [{ text: "luz natural", origin: "model" }] }, acoustic: null });
  assert.equal(fused.observations[0].modality, "vision"); assert.deepEqual(fused.missing, ["clasificación acústica"]);
  assert.match(answerEnvironmentQuestion("¿Qué observas?", fused), /Escena visible/);
  assert.match(answerEnvironmentQuestion("¿Qué observas?", fusePerception()), /faltan datos/);
});

test("vision and audio adapters send bounded multimodal payloads to the server providers", async () => {
  let visionRequest;
  const visionPayload = { output_text: JSON.stringify({ scene_description: "Escena.", objects: [], potential_obstacles: [], relevant_observations: [], uncertainty_warnings: [], origin: "model" }) };
  const visionResult = await analyzeVisionImage({ apiKey: "server-only", imageDataUrl: "data:image/jpeg;base64,abc", fetchImpl: async (_url, request) => { visionRequest = JSON.parse(request.body); return new Response(JSON.stringify(visionPayload), { status: 200 }); } });
  assert.equal(visionResult.status, 200); assert.equal(visionRequest.store, false); assert.equal(visionRequest.text.format.type, "json_schema");
  let audioRequest;
  const audioPayload = { choices: [{ message: { content: JSON.stringify({ category: "ambiente", observations: [], uncertainty: "incierto", origin: "model" }) } }] };
  const audioResult = await classifyAudio({ apiKey: "server-only", audioBase64: "YWJj", consent: true, fetchImpl: async (_url, request) => { audioRequest = JSON.parse(request.body); return new Response(JSON.stringify(audioPayload), { status: 200 }); } });
  assert.equal(audioResult.status, 200); assert.equal(audioRequest.messages[0].content[1].type, "input_audio"); assert.equal(audioRequest.messages[0].content[1].input_audio.format, "wav");
});
