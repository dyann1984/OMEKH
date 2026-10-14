export const VISION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    scene_description: { type: "string" },
    objects: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, observation: { type: "string" }, origin: { type: "string", enum: ["model"] } }, required: ["name", "observation", "origin"] } },
    potential_obstacles: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, evidence: { type: "string" }, origin: { type: "string", enum: ["model"] } }, required: ["name", "evidence", "origin"] } },
    relevant_observations: { type: "array", items: { type: "object", additionalProperties: false, properties: { text: { type: "string" }, origin: { type: "string", enum: ["model"] } }, required: ["text", "origin"] } },
    uncertainty_warnings: { type: "array", items: { type: "string" } },
    origin: { type: "string", enum: ["model"] },
  },
  required: ["scene_description", "objects", "potential_obstacles", "relevant_observations", "uncertainty_warnings", "origin"],
};

const isString = (value) => typeof value === "string" && value.trim().length > 0;

export function normalizeStructuredVision(value) {
  if (!value || typeof value !== "object") return { ok: false, error: "La respuesta visual no es un objeto." };
  const result = value;
  if (!isString(result.scene_description) || result.origin !== "model" || !Array.isArray(result.objects) || !Array.isArray(result.potential_obstacles) || !Array.isArray(result.relevant_observations) || !Array.isArray(result.uncertainty_warnings)) {
    return { ok: false, error: "La respuesta visual no cumple el esquema OMEKH." };
  }
  const validObjects = result.objects.every((item) => item && isString(item.name) && isString(item.observation) && item.origin === "model");
  const validObstacles = result.potential_obstacles.every((item) => item && isString(item.name) && isString(item.evidence) && item.origin === "model");
  const validObservations = result.relevant_observations.every((item) => item && isString(item.text) && item.origin === "model");
  if (!validObjects || !validObstacles || !validObservations || !result.uncertainty_warnings.every(isString)) return { ok: false, error: "La respuesta visual contiene campos inválidos." };
  return { ok: true, value: result };
}

export const AUDIO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: { type: "string" },
    observations: { type: "array", items: { type: "string" } },
    uncertainty: { type: "string" },
    origin: { type: "string", enum: ["model"] },
  },
  required: ["category", "observations", "uncertainty", "origin"],
};

export function normalizeAudioClassification(value) {
  if (!value || typeof value !== "object" || !isString(value.category) || !Array.isArray(value.observations) || !value.observations.every(isString) || !isString(value.uncertainty) || value.origin !== "model") return { ok: false, error: "La clasificación acústica no cumple el esquema OMEKH." };
  return { ok: true, value };
}
