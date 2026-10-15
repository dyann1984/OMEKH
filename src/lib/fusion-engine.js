export function fusePerception({ vision, acoustic, visionCapturedAt = Date.now(), acousticCapturedAt = Date.now(), correlationWindowMs = 8000, timestamp = Date.now() } = {}) {
  const observations = [];
  if (vision?.scene_description) observations.push({ text: vision.scene_description, origin: "model", modality: "vision", sourceTimestamp: visionCapturedAt });
  for (const item of vision?.relevant_observations ?? []) observations.push({ text: item.text, origin: item.origin, modality: "vision", sourceTimestamp: visionCapturedAt });
  if (acoustic?.category) observations.push({ text: "Categoría acústica: " + acoustic.category, origin: acoustic.origin, modality: "audio", sourceTimestamp: acousticCapturedAt });
  for (const item of acoustic?.observations ?? []) observations.push({ text: item, origin: acoustic.origin, modality: "audio", sourceTimestamp: acousticCapturedAt });
  const missing = [];
  if (!vision) missing.push("interpretación visual");
  if (!acoustic) missing.push("clasificación acústica");

  const correlations = [];
  if (vision && acoustic) {
    const gap = Math.abs((visionCapturedAt || timestamp) - (acousticCapturedAt || timestamp));
    correlations.push({
      type: "temporal-co-occurrence",
      modalities: ["vision", "audio"],
      gapMs: gap,
      confirmed: gap <= correlationWindowMs,
      confidence: gap <= correlationWindowMs ? "probable" : "low",
      reason: gap <= correlationWindowMs
        ? "Las observaciones visuales y acústicas llegaron dentro de la ventana temporal establecida."
        : "Las observaciones no coinciden temporalmente dentro de la ventana permitida.",
    });
  }

  return {
    observations,
    missing,
    correlations,
    contradictions: [],
    status: observations.length ? "partial" : "empty",
    correlationWindowMs,
    fusedAt: timestamp,
  };
}

export function answerEnvironmentQuestion(question, fusion) {
  if (!question?.trim()) return "Escribe o di una pregunta para consultar el entorno.";
  if (!fusion?.observations?.length) return "Aún faltan datos del entorno. Activa una captura visual o una clasificación acústica autorizada.";
  const summary = fusion.observations.slice(0, 4).map((item) => item.text).join(" ");
  const suffix = fusion.missing.length ? " Faltan datos de " + fusion.missing.join(" y ") + "." : "";
  return "Con los datos disponibles, OMEKH observa: " + summary + suffix + " No se han medido distancias ni posiciones.";
}
