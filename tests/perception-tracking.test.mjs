import test from "node:test";
import assert from "node:assert/strict";
import { assignPerceptionTracks } from "../src/lib/perception-tracking.js";

test("new detection receives new track and appeared state", () => {
  const result = assignPerceptionTracks([{ label: "chair", score: 0.9, box: [10, 10, 20, 20] }], [], 1000);
  assert.equal(result.detections[0].state, "apareció");
  assert.equal(result.tracks.length, 1);
});

test("similar frame keeps same id as unchanged", () => {
  const first = assignPerceptionTracks([{ label: "chair", score: 0.9, box: [10, 10, 20, 20] }], [], 1000);
  const second = assignPerceptionTracks([{ label: "chair", score: 0.91, box: [11, 10, 20, 20] }], first.tracks, 1500);
  assert.equal(second.detections[0].trackId, first.detections[0].trackId);
  assert.ok(second.detections[0].state === "permanece" || second.detections[0].state === "en movimiento");
});

test("movement changes state", () => {
  const first = assignPerceptionTracks([{ label: "person", score: 0.9, box: [10, 10, 40, 80] }], [], 1000);
  const second = assignPerceptionTracks([{ label: "person", score: 0.9, box: [24, 10, 40, 80] }], first.tracks, 1500);
  assert.equal(second.detections[0].state, "en movimiento");
});

test("two same-class objects stay one-to-one during crossed trajectory", () => {
  const initial = assignPerceptionTracks([
    { label: "chair", score: 0.8, box: [10, 10, 40, 40] },
    { label: "chair", score: 0.9, box: [180, 10, 40, 40] },
  ], [], 1000);
  const result = assignPerceptionTracks([
    { label: "chair", score: 0.85, box: [178, 10, 40, 40] },
    { label: "chair", score: 0.9, box: [8, 10, 40, 40] },
  ], initial.tracks, 1500);

  assert.equal(result.detections.length, 2);
  const trackIds = result.detections.map((item) => item.trackId).sort();
  assert.equal(new Set(trackIds).size, 2, "La misma pista no puede asignarse a ambos objetos del mismo fotograma");
});

test("missing track disappears after threshold", () => {
  const first = assignPerceptionTracks([{ label: "chair", score: 0.9, box: [10, 10, 20, 20] }], [], 1000);
  const frames = 10;
  let tracks = first.tracks;
  for (let i = 1; i <= frames; i += 1) tracks = assignPerceptionTracks([], tracks, 1000 + i * 500).tracks;
  assert.equal(tracks.length, 0);
});
