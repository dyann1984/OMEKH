export function fusePerception({ vision, acoustic } = {}) {
  const observations = [];
  if (vision?.scene_description) observations.push({ text: vision.scene_description, origin: "model", modality: "vision" });
  for (const item of vision?.relevant_observations ?? []) observations.push({ text: item.text, origin: item.origin, modality: "vision" });
  if (acoustic?.category) observations.push({ text: "Categoría acústica: " + acoustic.category, origin: acoustic.origin, modality: "audio" });
  for (const item of acoustic?.observations ?? []) observations.push({ text: item, origin: acoustic.origin, modality: "audio" });
  const missing = [];
  if (!vision) missing.push("interpretación visual");
  if (!acoustic) missing.push("clasificación acústica");
  return { observations, missing, contradictions: [], status: observations.length ? "partial" : "empty" };
}

export function answerEnvironmentQuestion(question, fusion) {
  if (!question?.trim()) return "Escribe o di una pregunta para consultar el entorno.";
  if (!fusion?.observations?.length) return "Aún faltan datos del entorno. Activa una captura visual o una clasificación acústica autorizada.";
  const summary = fusion.observations.slice(0, 4).map((item) => item.text).join(" ");
  const suffix = fusion.missing.length ? " Faltan datos de " + fusion.missing.join(" y ") + "." : "";
  return "Con los datos disponibles, OMEKH observa: " + summary + suffix + " No se han medido distancias ni posiciones.";
}
