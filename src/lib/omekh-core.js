/** Small, framework-agnostic rules shared by OMEKH modules. */
export function canRequestVision({ cameraActive, explicitConsent }) {
  return Boolean(cameraActive && explicitConsent);
}

export function normalizeVisionResponse(payload) {
  if (!payload || typeof payload.description !== "string" || !payload.description.trim()) {
    return { ok: false, error: "El modelo no devolvió una descripción utilizable." };
  }
  return { ok: true, description: payload.description.trim() };
}

export function labelDataOrigin(origin) {
  return origin === "model" ? "DESCRIPCIÓN GENERADA POR MODELO" : "SIN DETECCIÓN";
}

export function analyzeAudioFrame(samples, previousLevel = 0) {
  if (!samples || samples.length === 0) return { level: 0, changed: false, band: "silencio" };
  let sum = 0;
  for (const sample of samples) {
    const normalized = (sample - 128) / 128;
    sum += normalized * normalized;
  }
  const level = Math.min(100, Math.round(Math.sqrt(sum / samples.length) * 180));
  return {
    level,
    changed: Math.abs(level - previousLevel) >= 14,
    band: level < 4 ? "silencio" : level < 28 ? "bajo" : level < 62 ? "medio" : "alto",
  };
}

export function isVoiceCommand(value, command) {
  return value.toLocaleLowerCase("es-MX").includes(command.toLocaleLowerCase("es-MX"));
}
