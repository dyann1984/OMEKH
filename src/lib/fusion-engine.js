/**
 * @param {any} options
 * @returns {any}
 */
export function fusePerception({ vision, acoustic, visionCapturedAt, acousticCapturedAt, correlationWindowMs = 8000, timestamp = performance.now() } = {}) {
  const now = Number.isFinite(Number(timestamp)) ? Number(timestamp) : (typeof performance !== "undefined" ? performance.now() : 0);
  const visionTime = Number.isFinite(Number(visionCapturedAt)) ? Number(visionCapturedAt) : null;
  const audioTime = Number.isFinite(Number(acousticCapturedAt)) ? Number(acousticCapturedAt) : null;
  const windowMs = Number.isFinite(Number(correlationWindowMs)) && Number(correlationWindowMs) >= 0 ? Number(correlationWindowMs) : 8000;

  const observations = [];
  if (vision?.scene_description) observations.push({ text: vision.scene_description, origin: "model", modality: "vision", sourceTimestamp: visionTime });
  for (const item of vision?.relevant_observations ?? []) observations.push({ text: item.text, origin: item.origin, modality: "vision", sourceTimestamp: visionTime });
  if (acoustic?.category) observations.push({ text: "Categoría acústica: " + acoustic.category, origin: acoustic.origin, modality: "audio", sourceTimestamp: audioTime });
  for (const item of acoustic?.observations ?? []) observations.push({ text: item, origin: acoustic.origin, modality: "audio", sourceTimestamp: audioTime });

  const missing = [];
  if (!vision) missing.push("interpretación visual");
  if (!acoustic) missing.push("clasificación acústica");
  const missingSourceTimestamps = [];
  if (vision && !Number.isFinite(visionTime)) missingSourceTimestamps.push("marca de tiempo visual");
  if (acoustic && !Number.isFinite(audioTime)) missingSourceTimestamps.push("marca de tiempo acústica");

  const correlations = [];
  if (vision && acoustic) {
    const gap = visionTime !== null && audioTime !== null ? Math.abs(visionTime - audioTime) : null;
    const temporalMatch = gap === null ? null : gap <= windowMs;
    correlations.push({
      type: "temporal-co-occurrence",
      temporalMatch,
      semanticMatch: false,
      semanticMatchNote: "Sin calibración semántica manual o inferencia robusta para confirmar coincidencia semántica.",
      causalRelation: "no-inferible",
      gapMs: gap,
      confidence: gap === null ? "unknown" : temporalMatch ? "possible" : "low",
      confirmed: false,
      requiredToRaiseConfidence: ["alineación semántica verificable", "sensores calibrados", "contexto espacial adicional"],
      missingEvidence: missingSourceTimestamps.length ? missingSourceTimestamps : missing,
      reason: gap === null
        ? "Hay dos modalidades, pero faltan tiempos para calcular la correlación temporal."
        : temporalMatch
          ? "Las dos observaciones llegaron dentro de la ventana temporal establecida. Es una asociación probable, no una causalidad confirmada."
          : "Las observaciones no llegaron dentro de la ventana temporal permitida.",
    });
  }

  return {
    observations,
    missing,
    missingSourceTimestamps,
    correlations,
    contradictions: [],
    status: observations.length ? "partial" : "empty",
    correlationWindowMs: windowMs,
    fusedAt: now,
    uncertainFields: correlations.length ? correlations[0].requiredToRaiseConfidence : [],
  };
}

export function answerEnvironmentQuestion(question, fusion) {
  if (!question?.trim()) return "Escribe o di una pregunta para consultar el entorno.";
  if (!fusion?.observations?.length) return "Aún faltan datos del entorno. Activa una captura visual o una clasificación acústica autorizada.";
  const summary = fusion.observations.slice(0, 4).map((item) => item.text).join(" ");
  const suffix = fusion.missing.length ? " Faltan datos de " + fusion.missing.join(" y ") + "." : "";
  return "Con los datos disponibles, OMEKH observa: " + summary + suffix + " No se han medido distancias ni posiciones.";
}
