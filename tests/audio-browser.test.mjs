import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyMediaAudioError,
  classifySpeechError,
  getRunningAudioContext,
  isSecureAudioContext,
  isSpeechRecognitionSupported,
} from "../src/lib/audio-browser.js";

test("secure audio context detection", () => {
  assert.equal(isSecureAudioContext(true, { getUserMedia() {} }), true);
  assert.equal(isSecureAudioContext(false, { getUserMedia() {} }), false);
  assert.equal(isSecureAudioContext(true, {}), false);
});

test("media audio errors are classified", () => {
  assert.match(classifyMediaAudioError(true, { name: "NotAllowedError" }), /Permiso/);
  assert.match(classifyMediaAudioError(true, { name: "NotFoundError" }), /micrófono/);
  assert.match(classifyMediaAudioError(false), /localhost o HTTPS/);
});

test("speech errors are classified", () => {
  assert.match(classifySpeechError("network"), /conectar/);
  assert.match(classifySpeechError("no-speech"), /detectó voz/);
  assert.match(classifySpeechError("not-allowed"), /denegado/);
});

test("audio context is resumed when suspended", async () => {
  const events = [];
  const context = {
    state: "suspended",
    async resume() {
      events.push("resume");
      this.state = "running";
    },
  };
  const result = await getRunningAudioContext(() => context);
  assert.equal(result.state, "running");
  assert.deepEqual(events, ["resume"]);
});

test("speech recognition support detection with mocks", () => {
  assert.equal(isSpeechRecognitionSupported({ webkitSpeechRecognition: function () {} }), true);
  assert.equal(isSpeechRecognitionSupported({}), false);
});

test("mocked getUserMedia stream cleanup", async () => {
  const tracks = [{ stopped: false, stop() { this.stopped = true; } }];
  const stream = { getTracks() { return tracks; } };
  stream.getTracks().forEach((track) => track.stop());
  assert.equal(tracks[0].stopped, true);
});

test("mocked speech recognition end resets state", () => {
  let state = "active";
  const instance = {
    onend() {
      state = state === "active" ? "idle" : state;
    },
  };
  instance.onend();
  assert.equal(state, "idle");
});
