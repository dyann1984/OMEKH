import { normalizeVisionResponse } from "./omekh-core.js";
import { VISION_SCHEMA, normalizeStructuredVision } from "./perception-schema.js";

export const MAX_IMAGE_CHARS = 2_100_000;
export const VISION_TIMEOUT_MS = 15_000;

function error(status, message) {
  return { status, body: { error: message } };
}

export async function analyzeVisionImage({ apiKey, model = "gpt-4o-mini", imageDataUrl, fetchImpl = fetch, timeoutMs = VISION_TIMEOUT_MS }) {
  if (!apiKey) return error(503, "IA no configurada: falta OPENAI_API_KEY en el servidor.");
  if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/") || imageDataUrl.length > MAX_IMAGE_CHARS) {
    return error(400, "La captura no es válida o supera el límite permitido.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        input: [{ role: "user", content: [
          { type: "input_text", text: "Responde sólo con el esquema JSON solicitado. Describe en español únicamente lo visible. Incluye objetos, posibles obstáculos visibles, observaciones y advertencias de incertidumbre. No inventes coordenadas, distancias, porcentajes, identidades, emociones ni atributos sensibles." },
          { type: "input_image", image_url: imageDataUrl, detail: "low" },
        ] }],
        text: { format: { type: "json_schema", name: "omekh_scene_interpretation", strict: true, schema: VISION_SCHEMA } },
      }),
    });
    if (!response.ok) return error(502, "El proveedor de IA no pudo procesar la captura.");
    const payload = await response.json();
    let parsed;
    try { parsed = typeof payload.output_text === "string" ? JSON.parse(payload.output_text) : payload.output_text; } catch { return error(502, "El proveedor devolvió una interpretación visual no válida."); }
    const structured = normalizeStructuredVision(parsed);
    if (!structured.ok) return error(502, structured.error);
    const result = normalizeVisionResponse({ description: structured.value.scene_description });
    if (!result.ok) return error(502, result.error);
    return { status: 200, body: { description: result.description, interpretation: structured.value, provider: "OpenAI Responses API", generatedAt: new Date().toISOString(), source: "model" } };
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") return error(504, "El análisis visual agotó el tiempo de espera.");
    return error(502, "No se pudo contactar el adaptador de IA.");
  } finally {
    clearTimeout(timeout);
  }
}
