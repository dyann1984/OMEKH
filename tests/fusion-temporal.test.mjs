import test from "node:test";
import assert from "node:assert/strict";
import { fusePerception } from "../src/lib/fusion-engine.js";

const vision = {
  scene_description: "Escena visible.",
  relevant_observations: [{ text: "luz natural", origin: "model" }],
};

const acoustic = {
  category: "ambiente",
  observations: ["sonido continuo"],
  uncertainty: "No se puede identificar la fuente.",
  origin: "model",
};

test("temporal fusion marks simple co-occurrence as possible, never confirmed", () => {
  const fused = fusePerception({
    vision,
    acoustic,
    visionCapturedAt: 1000,
    acousticCapturedAt: 1800,
    correlationWindowMs: 5000,
  });

  assert.equal(fused.correlations.length, 1);
  assert.equal(fused.correlations[0].temporalMatch, true);
  assert.equal(fused.correlations[0].semanticMatch, false);
  assert.equal(fused.correlations[0].causalRelation, "no-inferible");
  assert.equal(fused.correlations[0].confirmed, false);
  assert.equal(fused.correlations[0].confidence, "possible");
  assert.equal(fused.correlations[0].gapMs, 800);
});

test("temporal fusion marks delayed coincidence as low certainty", () => {
  const fused = fusePerception({
    vision,
    acoustic,
    visionCapturedAt: 1000,
    acousticCapturedAt: 20000,
    correlationWindowMs: 5000,
  });

  assert.equal(fused.correlations[0].temporalMatch, false);
  assert.equal(fused.correlations[0].confidence, "low");
  assert.equal(fused.correlations[0].confirmed, false);
});

test("temporal fusion does not fabricate timing when timestamps are absent", () => {
  const fused = fusePerception({ vision, acoustic });

  assert.equal(fused.correlations[0].gapMs, null);
  assert.equal(fused.correlations[0].temporalMatch, null);
  assert.equal(fused.correlations[0].confidence, "unknown");
  assert.equal(fused.correlations[0].confirmed, false);
  assert.deepEqual(fused.missingSourceTimestamps, ["marca de tiempo visual", "marca de tiempo acústica"]);
});

test("temporal fusion does not invent a relation with only one modality", () => {
  const fused = fusePerception({ vision });

  assert.equal(fused.correlations.length, 0);
  assert.ok(fused.missing.includes("clasificación acústica"));
});