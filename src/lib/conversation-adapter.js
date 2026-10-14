function error(status, message) { return { status, body: { error: message } }; }

export const MAX_QUESTION_CHARS = 1000;
export const MAX_HISTORY_ITEMS = 8;
export const MAX_ITEM_CHARS = 600;
export const CONVERSATION_TIMEOUT_MS = 25_000;

const CONVERSATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    observed: { type: "array", items: { type: "string" } },
    inferences: { type: "array", items: { type: "string" } },
    unknowns: { type: "array", items: { type: "string" } },
    response: { type: "string" },
  },
  required: ["observed", "inferences", "unknowns", "response"],
};

function isStringArray(value) { return Array.isArray(value) && value.every((item) => typeof item === "string"); }

export function normalizeConversationAnswer(value) {
  if (!value || typeof value !== "object") return { ok: false, error: "La respuesta conversacional no es un objeto." };
  if (!isStringArray(value.observed) || !isStringArray(value.inferences) || !isStringArray(value.unknowns) || typeof value.response !== "string" || !value.response.trim()) return { ok: false, error: "La respuesta conversacional no cumple el esquema OMEKH." };
  return { ok: true, value: { observed: value.observed, inferences: value.inferences, unknowns: value.unknowns, response: value.response.trim() } };
}

function describeVisual(visual) {
  if (!visual || typeof visual !== "object") return null;
  const parts = [];
  if (visual.scene_description) parts.push("Escena: " + visual.scene_description);
  if (Array.isArray(visual.relevant_observations)) visual.relevant_observations.forEach((item) => { if (item?.text) parts.push("Observacion visual: " + item.text); });
  if (Array.isArray(visual.potential_obstacles)) visual.potential_obstacles.forEach((item) => { if (item?.name && item?.evidence) parts.push("Posible obstaculo: " + item.name + " (" + item.evidence + ")"); });
  if (Array.isArray(visual.uncertainty_warnings)) visual.uncertainty_warnings.forEach((item) => { if (item) parts.push("Incertidumbre visual: " + item); });
  return parts.join("\n");
}

function describeAcoustic(acoustic) {
  if (!acoustic || typeof acoustic !== "object") return null;
  const parts = ["Categoria acustica: " + (acoustic.category || "desconocida")];
  if (Array.isArray(acoustic.observations)) acoustic.observations.forEach((item) => parts.push("Observacion acustica: " + item));
  if (acoustic.uncertainty) parts.push("Incertidumbre acustica: " + acoustic.uncertainty);
  return parts.join("\n");
}

export async function answerConversation({ apiKey, model = "gpt-4o-mini", question, context, history, consent = false, fetchImpl = fetch, timeoutMs = CONVERSATION_TIMEOUT_MS, maxQuestionChars = MAX_QUESTION_CHARS, maxContextChars = 4000 }) {
  if (!consent) return error(403, "La conversacion requiere autorizacion explicita.");
  if (!apiKey) return error(503, "IA no configurada: falta OPENAI_API_KEY en el servidor.");
  if (typeof question !== "string" || !question.trim() || question.length > maxQuestionChars) return error(400, "La pregunta no es valida o supera el limite permitido.");

  const contextParts = [];
  if (context?.visual) { const visual = describeVisual(context.visual); if (visual) contextParts.push(visual); }
  if (context?.acoustic) { const acoustic = describeAcoustic(context.acoustic); if (acoustic) contextParts.push(acoustic); }
  const contextText = contextParts.join("\n").slice(0, maxContextChars) || "Sin observaciones multimodales autorizadas.";
  const safeHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY_ITEMS).map((item) => ({
    role: item?.role === "assistant" ? "assistant" : "user",
    content: String(item?.content || "").slice(0, MAX_ITEM_CHARS),
  })).filter((item) => item.content) : [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        messages: [
          { role: "system", content: "Eres OMEKH, asistente de percepcion multimodal. Responde solo con el JSON solicitado. Distingue claramente observado, inferencia y dato desconocido. No inventes distancias, coordenadas, identidades, emociones, mediciones ni fuentes no verificables. Si no hay evidencia, dilo." },
          ...safeHistory,
          { role: "user", content: "Pregunta del usuario: " + question.trim() + "\nContexto disponible:\n" + contextText + "\nResponde con: observed (lista), inferences (lista), unknowns (lista), response (respuesta clara)." },
        ],
        response_format: { type: "json_schema", json_schema: { name: "omekh_conversation", strict: true, schema: CONVERSATION_SCHEMA } },
      }),
    });
    if (!response.ok) return error(502, "El proveedor de IA no pudo responder la consulta.");
    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    const result = normalizeConversationAnswer(parsed); if (!result.ok) return error(502, result.error);
    return { status: 200, body: { answer: result.value, provider: "OpenAI Chat Completions", generatedAt: new Date().toISOString(), source: "model" } };
  } catch (cause) {
    if (cause instanceof SyntaxError) return error(502, "El proveedor devolvio una respuesta no valida.");
    if (cause instanceof Error && cause.name === "AbortError") return error(504, "La conversacion agoto el tiempo de espera.");
    return error(502, "No se pudo contactar el asistente conversacional.");
  } finally { clearTimeout(timeout); }
}