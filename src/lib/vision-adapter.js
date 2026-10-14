import { normalizeVisionResponse } from "./omekh-core.js";
import { VISION_SCHEMA, normalizeStructuredVision } from "./perception-schema.js";

export const MAX_IMAGE_CHARS = 2_100_000;
export const VISION_TIMEOUT_MS = 15_000;

function error(status, message) {
  return { status, body: { error: message } };
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  if (Array.isArray(payload?.output)) {
    const parts = [];
    for (const item of payload.output) {
      if (Array.isArray(item?.content)) {
        for (const content of item.content) {
          if (content?.type === "output_text" && typeof content.text === "string") parts.push(content.text);
          if (typeof content?.text === "string" && !content.type) parts.push(content.text);
        }
      }
      if (typeof item?.text === "string") parts.push(item.text);
    }
    if (parts.length) return parts.join("");
  }
  if (typeof payload?.text?.value === "string") return payload.text.value;
  if (typeof payload?.text === "string") return payload.text;
  return "";
}

function parseJsonContent(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1] || trimmed;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
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
    if (!response.ok) {
      let detail = "";
      try {
        const failure = await response.json();
        detail = failure?.error?.message || failure?.error || failure?.message || "";
      } catch {
        try { detail = (await response.text()).slice(0, 240); } catch { }
      }
      return error(502, detail ? "El proveedor de IA no pudo procesar la captura (" + response.status + "): " + detail : "El proveedor de IA no pudo procesar la captura (" + response.status + ").");
    }
    const payload = await response.json();
    const outputText = extractResponseText(payload);
    if (!outputText) {
      return error(502, "El proveedor devolvió una respuesta vacía (" + (payload?.status || "sin estado") + ").");
    }
    let parsed;
    try { parsed = parseJsonContent(outputText); } catch { return error(502, "El proveedor devolvió una interpretación visual no válida: " + (outputText || "").slice(0, 240)); }
    if (!parsed) return error(502, "El proveedor devolvió una interpretación visual no válida: " + (outputText || "").slice(0, 240));
    const structured = normalizeStructuredVision(parsed);
    if (!structured.ok) return error(502, structured.error + (outputText ? " Respuesta: " + outputText.slice(0, 240) : ""));
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
